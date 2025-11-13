# Job Portal Backend API

Backend API server for the Job Portal application built with Node.js, Express, and Microsoft SQL Server.

## Features

- **Authentication**: JWT-based authentication for HR/Admin and Candidates
- **Job Management**: CRUD operations for job postings
- **Candidate Profiles**: Profile management for job applicants
- **Applications**: Job application tracking
- **Saved Jobs**: Save/unsave jobs functionality

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Microsoft SQL Server (Express or Developer edition) running locally

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```
PORT=3000
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# SQL Server connection
MSSQL_SERVER=localhost
MSSQL_PORT=1433
MSSQL_DATABASE=JobPortal
MSSQL_USER=sa
MSSQL_PASSWORD=yourStrong(!)Password
```

> **Note:** `trustServerCertificate=true` is enabled by default for local development. For production, configure TLS properly and adjust the connection options in `db/database.js`.

### Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### Authentication

#### HR/Admin Signup
- **POST** `/api/signup`
- Body: `{ fullName, email, password, company }`
- Returns: `{ token, user }`

#### HR/Admin Login
- **POST** `/api/login`
- Body: `{ email, password }`
- Returns: `{ token, user }`

#### Candidate Signup
- **POST** `/api/candidate/signup`
- Body: `{ name, email, password }`
- Returns: `{ message, user }`

#### Candidate Login
- **POST** `/api/candidate/login`
- Body: `{ email, password }`
- Returns: `{ token, user }`

### Jobs

#### Get All Jobs (Public)
- **GET** `/api/jobs`
- Returns: Array of enabled jobs

#### Get All Jobs (HR - includes disabled)
- **GET** `/api/jobs/all`
- Requires: HR authentication
- Returns: Array of all jobs posted by the HR user

#### Get Single Job
- **GET** `/api/jobs/:id`
- Returns: Job object

#### Create Job
- **POST** `/api/jobs`
- Requires: HR authentication
- Body: `{ title, company, location, salary, experienceFrom, experienceTo, description }`
- Returns: Created job object

#### Update Job
- **PUT** `/api/jobs/:id`
- Requires: HR authentication
- Body: `{ title, location, salary, experienceFrom, experienceTo, description }`
- Returns: Updated job object

#### Toggle Job Enabled Status
- **PATCH** `/api/jobs/:id/enabled`
- Requires: HR authentication
- Body: `{ enabled: true/false }`
- Returns: `{ message, enabled }`

#### Delete Job
- **DELETE** `/api/jobs/:id`
- Requires: HR authentication
- Returns: `{ message }`

### Candidate Profile

#### Get Profile
- **GET** `/api/candidate/profile`
- Requires: Candidate authentication
- Returns: Profile object

#### Save Profile
- **POST** `/api/candidate/profile`
- Requires: Candidate authentication
- Body: Profile object with all fields
- Returns: `{ message }`

### Applications

#### Apply to Job
- **POST** `/api/applications`
- Requires: Candidate authentication
- Body: `{ jobId }`
- Returns: `{ message }`

#### Get My Applications
- **GET** `/api/applications`
- Requires: Candidate authentication
- Returns: Array of applications

#### Save/Unsave Job
- **POST** `/api/applications/save/:jobId`
- Requires: Candidate authentication
- Returns: `{ message, saved }`

#### Get Saved Jobs
- **GET** `/api/applications/saved`
- Requires: Candidate authentication
- Returns: Array of saved jobs

## Database Schema

The backend uses SQLite with the following tables:

- `hr_users`: HR/Admin user accounts
- `candidates`: Candidate/Applicant user accounts
- `jobs`: Job postings
- `candidate_profiles`: Candidate profile information
- `applications`: Job applications
- `saved_jobs`: Saved jobs by candidates

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens expire after 7 days.

## CORS

CORS is configured to allow requests from the frontend URL specified in `FRONTEND_URL` environment variable (default: `http://localhost:5173`).

## Error Handling

All errors return JSON in the following format:

```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Development Notes

- The database file (`jobportal.db`) is created automatically on first run
- All passwords are hashed using bcrypt
- JWT secret should be changed in production
- Database tables are created automatically on server start

