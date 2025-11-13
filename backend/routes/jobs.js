import express from 'express';
import { dbGet, dbRun, dbAll } from '../db/database.js';
import { authenticateToken, requireHR, verifyHRUser } from '../middleware/auth.js';

const router = express.Router();

// Get all jobs (public, but filters disabled ones)
router.get('/', async (req, res) => {
  try {
    const jobs = await dbAll(`
      SELECT 
        j.*,
        hs.company as company_name
      FROM jobs j
      LEFT JOIN hr_signup hs ON j.posted_by = hs.id
      WHERE j.enabled = 1
      ORDER BY j.posted_on DESC
    `);

    // Format jobs
    const formattedJobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company || job.company_name,
      location: job.location,
      salary: job.salary,
      experienceFrom: job.experience_from,
      experienceTo: job.experience_to,
      description: job.description,
      enabled: Boolean(job.enabled),
      postedOn: job.posted_on
    }));

    res.json(formattedJobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all jobs (including disabled) - HR only
router.get('/all', authenticateToken, requireHR, verifyHRUser, async (req, res) => {
  try {
    const jobs = await dbAll(`
      SELECT 
        j.*,
        hs.company as company_name
      FROM jobs j
      LEFT JOIN hr_signup hs ON j.posted_by = hs.id
      WHERE j.posted_by = ?
      ORDER BY j.posted_on DESC
    `, [req.user.id]);

    const formattedJobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company || job.company_name,
      location: job.location,
      salary: job.salary,
      experienceFrom: job.experience_from,
      experienceTo: job.experience_to,
      description: job.description,
      enabled: Boolean(job.enabled),
      postedOn: job.posted_on
    }));

    res.json(formattedJobs);
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await dbGet(`
      SELECT 
        j.*,
        hs.company as company_name
      FROM jobs j
      LEFT JOIN hr_signup hs ON j.posted_by = hs.id
      WHERE j.id = ?
    `, [req.params.id]);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      title: job.title,
      company: job.company || job.company_name,
      location: job.location,
      salary: job.salary,
      experienceFrom: job.experience_from,
      experienceTo: job.experience_to,
      description: job.description,
      enabled: Boolean(job.enabled),
      postedOn: job.posted_on
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create job (HR only)
router.post('/', authenticateToken, requireHR, verifyHRUser, async (req, res) => {
  try {
    const { title, company, location, salary, experienceFrom, experienceTo, description } = req.body;

    if (!title || !company || !location || !description) {
      return res.status(400).json({ error: 'Title, company, location, and description are required' });
    }

    const result = await dbRun(
      `INSERT INTO jobs (title, company, location, salary, experience_from, experience_to, description, posted_by, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [title, company, location, salary || null, experienceFrom || null, experienceTo || null, description, req.user.id]
    );

    if (!result || !result.lastID) {
      return res.status(500).json({ error: 'Failed to create job' });
    }

    const job = await dbGet('SELECT * FROM jobs WHERE id = ?', [result.lastID]);

    if (!job) {
      return res.status(500).json({ error: 'Job created but could not be retrieved' });
    }

    res.status(201).json({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      experienceFrom: job.experience_from,
      experienceTo: job.experience_to,
      description: job.description,
      enabled: job.enabled === 1,
      postedOn: job.posted_on
    });
  } catch (error) {
    console.error('Create job error:', error);
    // Check for foreign key constraint error
    if (error.message && error.message.toLowerCase().includes('foreign key')) {
      return res.status(400).json({ error: 'Invalid HR user. Please log in again.' });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update job (HR only)
router.put('/:id', authenticateToken, requireHR, verifyHRUser, async (req, res) => {
  try {
    const { title, location, salary, experienceFrom, experienceTo, description } = req.body;
    const jobId = req.params.id;

    // Check if job exists and belongs to user
    const job = await dbGet('SELECT * FROM jobs WHERE id = ? AND posted_by = ?', [jobId, req.user.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    await dbRun(
      `UPDATE jobs SET
        title = COALESCE(?, title),
        location = COALESCE(?, location),
        salary = ?,
        experience_from = ?,
        experience_to = ?,
        description = COALESCE(?, description)
      WHERE id = ?`,
      [title, location, salary || null, experienceFrom || null, experienceTo || null, description, jobId]
    );

    const updatedJob = await dbGet('SELECT * FROM jobs WHERE id = ?', [jobId]);

    res.json({
      id: updatedJob.id,
      title: updatedJob.title,
      company: updatedJob.company,
      location: updatedJob.location,
      salary: updatedJob.salary,
      experienceFrom: updatedJob.experience_from,
      experienceTo: updatedJob.experience_to,
      description: updatedJob.description,
      enabled: Boolean(updatedJob.enabled),
      postedOn: updatedJob.posted_on
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle job enabled status (HR only)
router.patch('/:id/enabled', authenticateToken, requireHR, verifyHRUser, async (req, res) => {
  try {
    const { enabled } = req.body;
    const jobId = req.params.id;

    // Check if job exists and belongs to user
    const job = await dbGet('SELECT * FROM jobs WHERE id = ? AND posted_by = ?', [jobId, req.user.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    await dbRun('UPDATE jobs SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, jobId]);

    res.json({ message: 'Job status updated', enabled: !!enabled });
  } catch (error) {
    console.error('Toggle job enabled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete job (HR only)
router.delete('/:id', authenticateToken, requireHR, verifyHRUser, async (req, res) => {
  try {
    const jobId = req.params.id;

    // Check if job exists and belongs to user
    const job = await dbGet('SELECT * FROM jobs WHERE id = ? AND posted_by = ?', [jobId, req.user.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    await dbRun('DELETE FROM jobs WHERE id = ?', [jobId]);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

