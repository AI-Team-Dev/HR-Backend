import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserSessions, getLoginHistory, deactivateSession, deactivateAllUserSessions } from '../db/sessions.js';

const router = express.Router();

// Get current user's active sessions (requires authentication)
router.get('/my-sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await getUserSessions(req.user.id, req.user.role);
    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get login history for current user (requires authentication)
router.get('/my-history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await getLoginHistory(req.user.email, req.user.role, limit);
    res.json(history);
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout from specific session
router.post('/logout-session', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    await deactivateSession(token);
    res.json({ message: 'Session deactivated successfully' });
  } catch (error) {
    console.error('Logout session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout from all sessions
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    await deactivateAllUserSessions(req.user.id, req.user.role);
    res.json({ message: 'All sessions deactivated successfully' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

