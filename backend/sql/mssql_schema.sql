-- Job Portal database schema for Microsoft SQL Server
-- Run this script in SQL Server Management Studio or via sqlcmd:
--   sqlcmd -S localhost -U sa -P YourPassword -i mssql_schema.sql

IF DB_ID('JobPortal') IS NULL
BEGIN
  PRINT 'Creating database JobPortal';
  CREATE DATABASE JobPortal;
END
GO

USE JobPortal;
GO

------------------------------------------------------------
-- HR / Admin tables
------------------------------------------------------------
IF OBJECT_ID('dbo.hr_signup', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hr_signup (
    id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    company NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.hr_login', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hr_login (
    id INT PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_hr_login_signup FOREIGN KEY (id)
      REFERENCES dbo.hr_signup(id) ON DELETE CASCADE
  );
END
GO

------------------------------------------------------------
-- Candidate tables
------------------------------------------------------------
IF OBJECT_ID('dbo.candidate_signup', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.candidate_signup (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.candidate_login', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.candidate_login (
    id INT PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_candidate_login_signup FOREIGN KEY (id)
      REFERENCES dbo.candidate_signup(id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.candidate_profiles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.candidate_profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    candidate_id INT UNIQUE NOT NULL,
    full_name NVARCHAR(255),
    email NVARCHAR(255),
    phone NVARCHAR(50),
    experience_level NVARCHAR(50),
    serving_notice NVARCHAR(10),
    notice_period NVARCHAR(50),
    last_working_day NVARCHAR(50),
    linkedin_url NVARCHAR(500),
    portfolio_url NVARCHAR(500),
    current_location NVARCHAR(255),
    preferred_location NVARCHAR(255),
    resume_file_name NVARCHAR(500),
    education NVARCHAR(MAX),
    certifications NVARCHAR(MAX),
    experiences NVARCHAR(MAX),
    completed BIT DEFAULT 0,
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_candidate_profiles_signup FOREIGN KEY (candidate_id)
      REFERENCES dbo.candidate_signup(id)
  );
END
GO

------------------------------------------------------------
-- Job & application tables
------------------------------------------------------------
IF OBJECT_ID('dbo.jobs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.jobs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    company NVARCHAR(255) NOT NULL,
    location NVARCHAR(255) NOT NULL,
    salary NVARCHAR(255),
    experience_from INT,
    experience_to INT,
    description NVARCHAR(MAX) NOT NULL,
    enabled BIT DEFAULT 1,
    posted_by INT NULL,
    posted_on DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_jobs_hr_signup FOREIGN KEY (posted_by)
      REFERENCES dbo.hr_signup(id)
  );
END
GO

IF OBJECT_ID('dbo.applications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.applications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    candidate_id INT NOT NULL,
    job_id INT NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    applied_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_application UNIQUE (candidate_id, job_id),
    CONSTRAINT FK_applications_candidate FOREIGN KEY (candidate_id)
      REFERENCES dbo.candidate_signup(id),
    CONSTRAINT FK_applications_job FOREIGN KEY (job_id)
      REFERENCES dbo.jobs(id)
  );
END
GO

IF OBJECT_ID('dbo.saved_jobs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.saved_jobs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    candidate_id INT NOT NULL,
    job_id INT NOT NULL,
    saved_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_saved_job UNIQUE (candidate_id, job_id),
    CONSTRAINT FK_saved_jobs_candidate FOREIGN KEY (candidate_id)
      REFERENCES dbo.candidate_signup(id),
    CONSTRAINT FK_saved_jobs_job FOREIGN KEY (job_id)
      REFERENCES dbo.jobs(id)
  );
END
GO

------------------------------------------------------------
-- Session & login history tables
------------------------------------------------------------
IF OBJECT_ID('dbo.hr_login_sessions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.hr_login_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    hr_login_id INT NOT NULL,
    token NVARCHAR(450) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_hr_login_sessions FOREIGN KEY (hr_login_id)
      REFERENCES dbo.hr_login(id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.candidate_login_sessions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.candidate_login_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    candidate_login_id INT NOT NULL,
    token NVARCHAR(450) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_candidate_login_sessions FOREIGN KEY (candidate_login_id)
      REFERENCES dbo.candidate_login(id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.login_history', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.login_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    user_type NVARCHAR(20) NOT NULL CHECK (user_type IN ('HR', 'candidate')),
    ip_address NVARCHAR(100),
    user_agent NVARCHAR(500),
    status NVARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
    failure_reason NVARCHAR(255),
    attempted_at DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
GO

------------------------------------------------------------
-- Supporting indexes
------------------------------------------------------------
IF NOT EXISTS (
  SELECT name FROM sys.indexes
  WHERE name = 'idx_hr_login_sessions_token'
    AND object_id = OBJECT_ID('dbo.hr_login_sessions')
)
BEGIN
  CREATE INDEX idx_hr_login_sessions_token ON dbo.hr_login_sessions(token);
END
GO

IF NOT EXISTS (
  SELECT name FROM sys.indexes
  WHERE name = 'idx_candidate_login_sessions_token'
    AND object_id = OBJECT_ID('dbo.candidate_login_sessions')
)
BEGIN
  CREATE INDEX idx_candidate_login_sessions_token ON dbo.candidate_login_sessions(token);
END
GO

IF NOT EXISTS (
  SELECT name FROM sys.indexes
  WHERE name = 'idx_login_history_email'
    AND object_id = OBJECT_ID('dbo.login_history')
)
BEGIN
  CREATE INDEX idx_login_history_email ON dbo.login_history(email, user_type);
END
GO

PRINT 'Job Portal schema ensured successfully.';

