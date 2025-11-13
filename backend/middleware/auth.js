import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server.js';
import { dbGet } from '../db/database.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Verify HR user exists in database
export async function verifyHRUser(req, res, next) {
  try {
    if (req.user.role !== 'HR') {
      return next(); // Let requireHR handle role check
    }
    
    const hrUser = await dbGet('SELECT id FROM hr_signup WHERE id = ?', [req.user.id]);
    if (!hrUser) {
      return res.status(401).json({ error: 'Invalid HR user. Please log in again.' });
    }
    next();
  } catch (error) {
    console.error('Verify HR user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireHR(req, res, next) {
  if (req.user.role !== 'HR') {
    return res.status(403).json({ error: 'HR access required' });
  }
  next();
}

export function requireCandidate(req, res, next) {
  if (req.user.role !== 'candidate') {
    return res.status(403).json({ error: 'Candidate access required' });
  }
  next();
}

