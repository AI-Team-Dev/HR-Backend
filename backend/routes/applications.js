import express from 'express';
import { dbGet, dbRun, dbAll } from '../db/database.js';
import { authenticateToken, requireCandidate } from '../middleware/auth.js';

const router = express.Router();

// Apply to a job
router.post('/', authenticateToken, requireCandidate, async (req, res) => {
  try {
    const { jobId } = req.body;
    const candidateId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Check if job exists
    const job = await dbGet('SELECT * FROM jobs WHERE id = ? AND enabled = 1', [jobId]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or not available' });
    }

    // Check if already applied
    const existing = await dbGet(
      'SELECT id FROM applications WHERE candidate_id = ? AND job_id = ?',
      [candidateId, jobId]
    );

    if (existing) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    // Check if profile is completed
    const profile = await dbGet(
      'SELECT * FROM candidate_profiles WHERE candidate_id = ? AND completed = 1',
      [candidateId]
    );

    if (!profile) {
      return res.status(400).json({ error: 'Please complete your profile before applying' });
    }

    // Create application
    await dbRun(
      'INSERT INTO applications (candidate_id, job_id, status) VALUES (?, ?, ?)',
      [candidateId, jobId, 'pending']
    );

    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get candidate's applications
router.get('/', authenticateToken, requireCandidate, async (req, res) => {
  try {
    const applications = await dbAll(`
      SELECT 
        a.*,
        j.title, j.company, j.location, j.salary,
        j.experience_from, j.experience_to, j.description
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = ?
      ORDER BY a.applied_at DESC
    `, [req.user.id]);

    const formatted = applications.map(app => ({
      id: app.id,
      jobId: app.job_id,
      status: app.status,
      appliedAt: app.applied_at,
      job: {
        id: app.job_id,
        title: app.title,
        company: app.company,
        location: app.location,
        salary: app.salary,
        experienceFrom: app.experience_from,
        experienceTo: app.experience_to,
        description: app.description
      }
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save/Unsave a job
router.post('/save/:jobId', authenticateToken, requireCandidate, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const candidateId = req.user.id;

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    // Check if job exists
    const job = await dbGet('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already saved
    const existing = await dbGet(
      'SELECT id FROM saved_jobs WHERE candidate_id = ? AND job_id = ?',
      [candidateId, jobId]
    );

    if (existing) {
      // Unsave
      await dbRun(
        'DELETE FROM saved_jobs WHERE candidate_id = ? AND job_id = ?',
        [candidateId, jobId]
      );
      res.json({ message: 'Job removed from saved', saved: false });
    } else {
      // Save
      await dbRun(
        'INSERT INTO saved_jobs (candidate_id, job_id) VALUES (?, ?)',
        [candidateId, jobId]
      );
      res.json({ message: 'Job saved', saved: true });
    }
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get saved jobs
router.get('/saved', authenticateToken, requireCandidate, async (req, res) => {
  try {
    const savedJobs = await dbAll(`
      SELECT 
        j.*,
        sj.saved_at
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      WHERE sj.candidate_id = ?
      ORDER BY sj.saved_at DESC
    `, [req.user.id]);

    const formatted = savedJobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      experienceFrom: job.experience_from,
      experienceTo: job.experience_to,
      description: job.description,
      enabled: Boolean(job.enabled),
      enabled: Boolean(job.enabled),
      postedOn: job.posted_on,
      savedAt: job.saved_at
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

