import { dbRun, dbGet, dbAll } from './database.js';

/**
 * Create a new HR login session
 */
export async function createHRSession(hrLoginId, token) {
  try {
    await dbRun(
      `INSERT INTO hr_login_sessions (hr_login_id, token) VALUES (?, ?)`,
      [hrLoginId, token]
    );
    return { success: true };
  } catch (error) {
    console.error('Error creating HR session:', error);
    return { success: false, error };
  }
}

/**
 * Create a new Candidate login session
 */
export async function createCandidateSession(candidateLoginId, token) {
  try {
    await dbRun(
      `INSERT INTO candidate_login_sessions (candidate_login_id, token) VALUES (?, ?)`,
      [candidateLoginId, token]
    );
    return { success: true };
  } catch (error) {
    console.error('Error creating candidate session:', error);
    return { success: false, error };
  }
}

/**
 * Create a new login session (wrapper for backward compatibility)
 */
export async function createSession(userId, userType, token, expiresAt, ipAddress = null, userAgent = null) {
  // For backward compatibility, we'll need to get the login_id from the user_id
  // This is a simplified version - you may need to adjust based on your needs
  if (userType === 'HR') {
    const hrLogin = await dbGet('SELECT id FROM hr_login WHERE id = ?', [userId]);
    if (hrLogin) {
      return await createHRSession(hrLogin.id, token);
    }
  } else if (userType === 'candidate') {
    const candidateLogin = await dbGet('SELECT id FROM candidate_login WHERE id = ?', [userId]);
    if (candidateLogin) {
      return await createCandidateSession(candidateLogin.id, token);
    }
  }
  return { success: false, error: 'User not found' };
}

/**
 * Get HR session by token
 */
export async function getHRSessionByToken(token) {
  try {
    const session = await dbGet(
      `SELECT * FROM hr_login_sessions WHERE token = ?`,
      [token]
    );
    return session;
  } catch (error) {
    console.error('Error getting HR session:', error);
    return null;
  }
}

/**
 * Get Candidate session by token
 */
export async function getCandidateSessionByToken(token) {
  try {
    const session = await dbGet(
      `SELECT * FROM candidate_login_sessions WHERE token = ?`,
      [token]
    );
    return session;
  } catch (error) {
    console.error('Error getting candidate session:', error);
    return null;
  }
}

/**
 * Get active session by token (wrapper for backward compatibility)
 */
export async function getSessionByToken(token) {
  // Try HR first, then candidate
  let session = await getHRSessionByToken(token);
  if (session) return { ...session, user_type: 'HR' };
  
  session = await getCandidateSessionByToken(token);
  if (session) return { ...session, user_type: 'candidate' };
  
  return null;
}

/**
 * Deactivate a session (logout) - deletes the session record
 */
export async function deactivateSession(token) {
  try {
    // Try HR sessions first
    let result = await dbRun(`DELETE FROM hr_login_sessions WHERE token = ?`, [token]);
    if (result.changes > 0) return { success: true };
    
    // Try candidate sessions
    result = await dbRun(`DELETE FROM candidate_login_sessions WHERE token = ?`, [token]);
    return { success: result.changes > 0 };
  } catch (error) {
    console.error('Error deactivating session:', error);
    return { success: false, error };
  }
}

/**
 * Deactivate all HR sessions for a login
 */
export async function deactivateAllHRSessions(hrLoginId) {
  try {
    await dbRun(`DELETE FROM hr_login_sessions WHERE hr_login_id = ?`, [hrLoginId]);
    return { success: true };
  } catch (error) {
    console.error('Error deactivating HR sessions:', error);
    return { success: false, error };
  }
}

/**
 * Deactivate all Candidate sessions for a login
 */
export async function deactivateAllCandidateSessions(candidateLoginId) {
  try {
    await dbRun(`DELETE FROM candidate_login_sessions WHERE candidate_login_id = ?`, [candidateLoginId]);
    return { success: true };
  } catch (error) {
    console.error('Error deactivating candidate sessions:', error);
    return { success: false, error };
  }
}

/**
 * Deactivate all sessions for a user (wrapper for backward compatibility)
 */
export async function deactivateAllUserSessions(userId, userType) {
  if (userType === 'HR') {
    const hrLogin = await dbGet('SELECT id FROM hr_login WHERE id = ?', [userId]);
    if (hrLogin) {
      return await deactivateAllHRSessions(hrLogin.id);
    }
  } else if (userType === 'candidate') {
    const candidateLogin = await dbGet('SELECT id FROM candidate_login WHERE id = ?', [userId]);
    if (candidateLogin) {
      return await deactivateAllCandidateSessions(candidateLogin.id);
    }
  }
  return { success: false };
}

/**
 * Clean up expired sessions (simplified - no expiration tracking in new structure)
 */
export async function cleanupExpiredSessions() {
  // In the simplified structure, sessions don't have expiration tracking
  // You can add cleanup logic here if needed (e.g., delete sessions older than X days)
  return { success: true, cleaned: 0 };
}

/**
 * Get all HR sessions for a login
 */
export async function getHRSessions(hrLoginId) {
  try {
    const sessions = await dbAll(
      `SELECT * FROM hr_login_sessions WHERE hr_login_id = ? ORDER BY created_at DESC`,
      [hrLoginId]
    );
    return sessions;
  } catch (error) {
    console.error('Error getting HR sessions:', error);
    return [];
  }
}

/**
 * Get all Candidate sessions for a login
 */
export async function getCandidateSessions(candidateLoginId) {
  try {
    const sessions = await dbAll(
      `SELECT * FROM candidate_login_sessions WHERE candidate_login_id = ? ORDER BY created_at DESC`,
      [candidateLoginId]
    );
    return sessions;
  } catch (error) {
    console.error('Error getting candidate sessions:', error);
    return [];
  }
}

/**
 * Get all active sessions for a user (wrapper for backward compatibility)
 */
export async function getUserSessions(userId, userType) {
  if (userType === 'HR') {
    const hrLogin = await dbGet('SELECT id FROM hr_login WHERE id = ?', [userId]);
    if (hrLogin) {
      return await getHRSessions(hrLogin.id);
    }
  } else if (userType === 'candidate') {
    const candidateLogin = await dbGet('SELECT id FROM candidate_login WHERE id = ?', [userId]);
    if (candidateLogin) {
      return await getCandidateSessions(candidateLogin.id);
    }
  }
  return [];
}

/**
 * Record login attempt in history
 */
export async function recordLoginAttempt(email, userType, status, ipAddress = null, userAgent = null, failureReason = null) {
  try {
    await dbRun(
      `INSERT INTO login_history (email, user_type, ip_address, user_agent, status, failure_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, userType, ipAddress, userAgent, status, failureReason]
    );
    return { success: true };
  } catch (error) {
    console.error('Error recording login attempt:', error);
    return { success: false, error };
  }
}

/**
 * Get login history for a user
 */
export async function getLoginHistory(email, userType, limit = 50) {
  try {
    const history = await dbAll(
      `SELECT * FROM login_history 
       WHERE email = ? AND user_type = ?
       ORDER BY attempted_at DESC
       LIMIT ?`,
      [email, userType, limit]
    );
    return history;
  } catch (error) {
    console.error('Error getting login history:', error);
    return [];
  }
}

/**
 * Get recent failed login attempts (for rate limiting)
 */
export async function getRecentFailedAttempts(email, userType, minutes = 15) {
  try {
    const attempts = await dbAll(
      `SELECT COUNT(*) as count FROM login_history
       WHERE email = ? AND user_type = ? AND status = 'failed'
       AND attempted_at > datetime('now', '-' || ? || ' minutes')`,
      [email, userType, minutes]
    );
    return attempts[0]?.count || 0;
  } catch (error) {
    console.error('Error getting failed attempts:', error);
    return 0;
  }
}

