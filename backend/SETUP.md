# Quick Setup Guide

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and set your configuration:
```
PORT=3000
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured port).

## Database

The SQLite database (`jobportal.db`) will be created automatically on first run. All tables are initialized automatically.

## Frontend Configuration

Make sure your frontend is configured to point to the backend API. In your frontend `.env` file, set:

```
VITE_API_URL=http://localhost:3000
```

## Testing the API

You can test the API using curl or any HTTP client:

```bash
# Health check
curl http://localhost:3000/health

# Get all jobs
curl http://localhost:3000/api/jobs
```

## Troubleshooting

- **Port already in use**: Change the PORT in `.env`
- **CORS errors**: Make sure `FRONTEND_URL` in `.env` matches your frontend URL
- **Database errors**: Delete `jobportal.db` and restart the server to recreate tables

