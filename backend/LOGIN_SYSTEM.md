# Login System Documentation

## Overview

The login system now includes comprehensive session tracking and login history for both HR/Admin and Candidate users.

## Database Tables

### 1. `login_sessions`
Tracks active login sessions for all users.

**Columns:**
- `id` - Primary key
- `user_id` - ID of the user (HR or Candidate)
- `user_type` - Either 'HR' or 'candidate'
- `token` - JWT token for the session
- `ip_address` - IP address of the login
- `user_agent` - Browser/user agent information
- `created_at` - When the session was created
- `expires_at` - When the session expires
- `is_active` - Whether the session is still active (1 = active, 0 = inactive)

### 2. `login_history`
Tracks all login attempts (successful and failed).

**Columns:**
- `id` - Primary key
- `email` - Email used for login attempt
- `user_type` - Either 'HR' or 'candidate'
- `ip_address` - IP address of the attempt
- `user_agent` - Browser/user agent information
- `status` - Either 'success' or 'failed'
- `failure_reason` - Reason for failure (if failed)
- `attempted_at` - When the attempt was made

## Features

### 1. Session Management
- **Automatic Session Creation**: Sessions are created on successful login
- **Session Tracking**: All active sessions are tracked in the database
- **Session Expiration**: Sessions expire after 7 days (configurable)
- **Automatic Cleanup**: Expired sessions are automatically cleaned up every hour

### 2. Login History
- **All Attempts Recorded**: Every login attempt (success or failure) is recorded
- **IP and User Agent Tracking**: Tracks where and how users are logging in
- **Failure Reasons**: Records why logins failed (user not found, invalid password, etc.)

### 3. Rate Limiting
- **Failed Attempt Protection**: After 5 failed attempts in 15 minutes, login is blocked
- **Automatic Unblock**: Rate limit resets after 15 minutes
- **Prevents Brute Force**: Protects against brute force attacks

### 4. Security Features
- **IP Address Tracking**: Records IP addresses for security auditing
- **User Agent Tracking**: Records browser/device information
- **Session Invalidation**: Sessions can be manually deactivated
- **Multi-Device Support**: Users can have multiple active sessions

## API Endpoints

### Authentication Endpoints

#### HR/Admin Login
```
POST /api/login
Body: { email, password }
Response: { token, user }
```
- Creates a session
- Records login attempt
- Checks rate limiting

#### HR/Admin Logout
```
POST /api/logout
Headers: Authorization: Bearer <token>
Response: { message }
```
- Deactivates the session

#### Candidate Login
```
POST /api/candidate/login
Body: { email, password }
Response: { token, user }
```
- Creates a session
- Records login attempt
- Checks rate limiting

#### Candidate Logout
```
POST /api/candidate/logout
Headers: Authorization: Bearer <token>
Response: { message }
```
- Deactivates the session

### Session Management Endpoints

#### Get My Active Sessions
```
GET /api/sessions/my-sessions
Headers: Authorization: Bearer <token>
Response: [sessions]
```
- Returns all active sessions for the current user

#### Get My Login History
```
GET /api/sessions/my-history?limit=50
Headers: Authorization: Bearer <token>
Response: [history]
```
- Returns login history for the current user

#### Logout from Specific Session
```
POST /api/sessions/logout-session
Headers: Authorization: Bearer <token>
Body: { token: "session_token_to_logout" }
Response: { message }
```
- Deactivates a specific session

#### Logout from All Sessions
```
POST /api/sessions/logout-all
Headers: Authorization: Bearer <token>
Response: { message }
```
- Deactivates all sessions for the current user

## Usage Examples

### Login with Session Tracking
```javascript
// Login automatically creates a session
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await response.json();
// Session is now tracked in the database
```

### View Active Sessions
```javascript
const response = await fetch('/api/sessions/my-sessions', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const sessions = await response.json();
// Returns array of active sessions with IP, user agent, etc.
```

### View Login History
```javascript
const response = await fetch('/api/sessions/my-history?limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const history = await response.json();
// Returns array of login attempts with status, IP, timestamp, etc.
```

### Logout from All Devices
```javascript
const response = await fetch('/api/sessions/logout-all', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
// All sessions are now deactivated
```

## Database Functions

The `backend/db/sessions.js` file provides helper functions:

- `createSession()` - Create a new login session
- `getSessionByToken()` - Get session by token
- `deactivateSession()` - Deactivate a session
- `deactivateAllUserSessions()` - Logout from all devices
- `cleanupExpiredSessions()` - Remove expired sessions
- `getUserSessions()` - Get all active sessions for a user
- `recordLoginAttempt()` - Record a login attempt
- `getLoginHistory()` - Get login history for a user
- `getRecentFailedAttempts()` - Check rate limiting

## Security Considerations

1. **Rate Limiting**: Prevents brute force attacks
2. **Session Tracking**: Allows users to see and manage their active sessions
3. **IP Tracking**: Helps identify suspicious login patterns
4. **Automatic Cleanup**: Prevents database bloat from expired sessions
5. **Multi-Device Support**: Users can safely use multiple devices

## Migration

If you have an existing database, the new tables will be created automatically when you restart the server. No data migration is needed - existing users will work as before, and new sessions will be tracked going forward.

