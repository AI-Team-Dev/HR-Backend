import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun, dbAll } from '../db/database.js';
import { authenticateToken, requireCandidate } from '../middleware/auth.js';
import { JWT_SECRET } from '../server.js';
import { createSession, recordLoginAttempt, getRecentFailedAttempts } from '../db/sessions.js';

const router = express.Router();

// Candidate Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists in signup table
    const existingSignup = await dbGet('SELECT id FROM candidate_signup WHERE email = ?', [email]);
    if (existingSignup) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // First, insert into signup table
    const signupResult = await dbRun(
      'INSERT INTO candidate_signup (name, email) VALUES (?, ?)',
      [name, email]
    );

    // Then, insert into login table with foreign key
    await dbRun(
      'INSERT INTO candidate_login (id, email, password) VALUES (?, ?, ?)',
      [signupResult.lastID, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: signupResult.lastID,
        email,
        name
      }
    });
  } catch (error) {
    console.error('Candidate signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Candidate Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check for too many failed attempts (rate limiting)
    const failedAttempts = await getRecentFailedAttempts(email, 'candidate', 15);
    if (failedAttempts >= 5) {
      await recordLoginAttempt(email, 'candidate', 'failed', ipAddress, userAgent, 'Too many failed attempts');
      return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
    }

    // Find login credentials (join with signup to get user info)
    const loginData = await dbGet(
      `SELECT cl.id, cl.email, cl.password, cs.name 
       FROM candidate_login cl 
       INNER JOIN candidate_signup cs ON cl.id = cs.id 
       WHERE cl.email = ?`,
      [email]
    );
    
    if (!loginData) {
      await recordLoginAttempt(email, 'candidate', 'failed', ipAddress, userAgent, 'User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, loginData.password);
    if (!isValid) {
      await recordLoginAttempt(email, 'candidate', 'failed', ipAddress, userAgent, 'Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Use signup ID as user ID
    const userId = loginData.id;

    // Generate token
    const expiresIn = '7d';
    const token = jwt.sign(
      { id: userId, email: loginData.email, role: 'candidate' },
      JWT_SECRET,
      { expiresIn }
    );

    // Get login ID for session creation
    const candidateLogin = await dbGet('SELECT id FROM candidate_login WHERE id = ?', [userId]);
    
    // Create session using login ID
    if (candidateLogin) {
      const { createCandidateSession } = await import('../db/sessions.js');
      await createCandidateSession(candidateLogin.id, token);
    }

    // Record successful login
    await recordLoginAttempt(email, 'candidate', 'success', ipAddress, userAgent);

    // Get profile if exists
    const profile = await dbGet(
      'SELECT * FROM candidate_profiles WHERE candidate_id = ?',
      [userId]
    );

    const userData = {
      id: userId,
      email: loginData.email,
      name: loginData.name,
      role: 'candidate'
    };

    if (profile) {
      userData.profile = parseProfile(profile);
    }

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Candidate login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Candidate Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { deactivateSession } = await import('../db/sessions.js');
      await deactivateSession(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or Save Candidate Profile
router.get('/profile', authenticateToken, requireCandidate, async (req, res) => {
  try {
    const profile = await dbGet(
      'SELECT * FROM candidate_profiles WHERE candidate_id = ?',
      [req.user.id]
    );

    if (!profile) {
      return res.json({
        experienceLevel: '',
        servingNotice: '',
        fullName: '',
        email: req.user.email,
        phone: '',
        noticePeriod: '',
        lastWorkingDay: '',
        linkedinUrl: '',
        portfolioUrl: '',
        currentLocation: '',
        preferredLocation: '',
        resumeFileName: '',
        education: [],
        certifications: [],
        experiences: [],
        completed: false
      });
    }

    res.json(parseProfile(profile));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/profile', authenticateToken, requireCandidate, async (req, res) => {
  try {
    const profileData = req.body;
    const candidateId = req.user.id;

    // Check if profile exists
    const existing = await dbGet(
      'SELECT id FROM candidate_profiles WHERE candidate_id = ?',
      [candidateId]
    );

    const educationJson = JSON.stringify(profileData.education || []);
    const certificationsJson = JSON.stringify(profileData.certifications || []);
    const experiencesJson = JSON.stringify(profileData.experiences || []);

    if (existing) {
      // Update existing profile
      await dbRun(
        `UPDATE candidate_profiles SET
          full_name = ?, email = ?, phone = ?,
          experience_level = ?, serving_notice = ?, notice_period = ?, last_working_day = ?,
          linkedin_url = ?, portfolio_url = ?,
          current_location = ?, preferred_location = ?,
          resume_file_name = ?,
          education = ?, certifications = ?, experiences = ?,
          completed = ?,
          updated_at = SYSUTCDATETIME()
        WHERE candidate_id = ?`,
        [
          profileData.fullName || null,
          profileData.email || req.user.email,
          profileData.phone || null,
          profileData.experienceLevel || null,
          profileData.servingNotice || null,
          profileData.noticePeriod || null,
          profileData.lastWorkingDay || null,
          profileData.linkedinUrl || null,
          profileData.portfolioUrl || null,
          profileData.currentLocation || null,
          profileData.preferredLocation || null,
          profileData.resumeFileName || null,
          educationJson,
          certificationsJson,
          experiencesJson,
          profileData.completed ? 1 : 0,
          candidateId
        ]
      );
    } else {
      // Create new profile
      await dbRun(
        `INSERT INTO candidate_profiles (
          candidate_id, full_name, email, phone,
          experience_level, serving_notice, notice_period, last_working_day,
          linkedin_url, portfolio_url,
          current_location, preferred_location,
          resume_file_name,
          education, certifications, experiences,
          completed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidateId,
          profileData.fullName || null,
          profileData.email || req.user.email,
          profileData.phone || null,
          profileData.experienceLevel || null,
          profileData.servingNotice || null,
          profileData.noticePeriod || null,
          profileData.lastWorkingDay || null,
          profileData.linkedinUrl || null,
          profileData.portfolioUrl || null,
          profileData.currentLocation || null,
          profileData.preferredLocation || null,
          profileData.resumeFileName || null,
          educationJson,
          certificationsJson,
          experiencesJson,
          profileData.completed ? 1 : 0
        ]
      );
    }

    res.json({ message: 'Profile saved successfully' });
  } catch (error) {
    console.error('Save profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to parse profile from database
function parseProfile(profile) {
  return {
    experienceLevel: profile.experience_level || '',
    servingNotice: profile.serving_notice || '',
    fullName: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    noticePeriod: profile.notice_period || '',
    lastWorkingDay: profile.last_working_day || '',
    linkedinUrl: profile.linkedin_url || '',
    portfolioUrl: profile.portfolio_url || '',
    currentLocation: profile.current_location || '',
    preferredLocation: profile.preferred_location || '',
    resumeFileName: profile.resume_file_name || '',
    education: profile.education ? JSON.parse(profile.education) : [],
    certifications: profile.certifications ? JSON.parse(profile.certifications) : [],
    experiences: profile.experiences ? JSON.parse(profile.experiences) : [],
    completed: Boolean(profile.completed)
  };
}

export default router;

