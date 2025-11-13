import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import candidateRoutes from './routes/candidate.js';
import applicationRoutes from './routes/applications.js';
import sessionRoutes from './routes/sessions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZXhhbXBsZSJ9.lGrIa8yMwsB_ZSrgoniyr5FF34e9tE7TJboLqTfvifE';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cleanup expired sessions periodically (every hour)
setInterval(async () => {
  try {
    const { cleanupExpiredSessions } = await import('./db/sessions.js');
    await cleanupExpiredSessions();
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}, 60 * 60 * 1000); // 1 hour

// Routes
app.use('/api', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Job Portal API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
}

startServer();

export { JWT_SECRET };

