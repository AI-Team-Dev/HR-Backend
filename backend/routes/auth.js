import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../db/database.js';
import { JWT_SECRET } from '../server.js';
import { createSession, recordLoginAttempt, getRecentFailedAttempts } from '../db/sessions.js';

const router = express.Router();

// HR/Admin Signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, company } = req.body;

    if (!fullName || !email || !password || !company) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists in signup table
    const existingSignup = await dbGet('SELECT id FROM hr_signup WHERE email = ?', [email]);
    if (existingSignup) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // First, insert into signup table
    const signupResult = await dbRun(
      'INSERT INTO hr_signup (full_name, email, company) VALUES (?, ?, ?)',
      [fullName, email, company]
    );

    // Then, insert into login table with foreign key
    await dbRun(
      'INSERT INTO hr_login (id, email, password) VALUES (?, ?, ?)',
      [signupResult.lastID, email, hashedPassword]
    );

    // Generate token (use signup ID as user ID)
    const token = jwt.sign(
      { id: signupResult.lastID, email, role: 'HR' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: signupResult.lastID,
        email,
        fullName,
        company,
        role: 'HR'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HR/Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check for too many failed attempts (rate limiting)
    const failedAttempts = await getRecentFailedAttempts(email, 'HR', 15);
    if (failedAttempts >= 5) {
      await recordLoginAttempt(email, 'HR', 'failed', ipAddress, userAgent, 'Too many failed attempts');
      return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
    }

    // Find login credentials (join with signup to get user info)
    const loginData = await dbGet(
      `SELECT hl.id, hl.email, hl.password, hs.full_name, hs.company 
       FROM hr_login hl 
       INNER JOIN hr_signup hs ON hl.id = hs.id 
       WHERE hl.email = ?`,
      [email]
    );
    
    if (!loginData) {
      await recordLoginAttempt(email, 'HR', 'failed', ipAddress, userAgent, 'User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, loginData.password);
    if (!isValid) {
      await recordLoginAttempt(email, 'HR', 'failed', ipAddress, userAgent, 'Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Use signup ID as user ID
    const userId = loginData.id;

    // Generate token
    const expiresIn = '7d';
    const token = jwt.sign(
      { id: userId, email: loginData.email, role: 'HR' },
      JWT_SECRET,
      { expiresIn }
    );

    // Get login ID for session creation
    const hrLogin = await dbGet('SELECT id FROM hr_login WHERE id = ?', [userId]);
    
    // Create session using login ID
    if (hrLogin) {
      const { createHRSession } = await import('../db/sessions.js');
      await createHRSession(hrLogin.id, token);
    }

    // Record successful login
    await recordLoginAttempt(email, 'HR', 'success', ipAddress, userAgent);

    res.json({
      token,
      user: {
        id: userId,
        email: loginData.email,
        fullName: loginData.full_name,
        company: loginData.company,
        role: 'HR'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HR/Admin Logout
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

export default router;

