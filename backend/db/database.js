import sql from 'mssql';

const config = {
  server: process.env.MSSQL_SERVER || 'DESKTOP-0MELLFK',
  database: process.env.MSSQL_DATABASE || 'JobPortal',
  user: process.env.MSSQL_USER || 'Test',
  password: process.env.MSSQL_PASSWORD || 'Root@123',
  port: Number(process.env.MSSQL_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: Number(process.env.MSSQL_POOL_MAX) || 10,
    min: Number(process.env.MSSQL_POOL_MIN) || 0,
    idleTimeoutMillis: Number(process.env.MSSQL_POOL_IDLE || 30000)
  }
};

let poolPromise = null;

export async function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log('Connected to MSSQL database');
        pool.on('error', (err) => {
          console.error('MSSQL pool error:', err);
        });
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        console.error('Failed to connect to MSSQL:', err);
        throw err;
      });
  }
  return poolPromise;
}

function prepareQuery(query, params = []) {
  if (!params.length) {
    return { text: query, inputs: [] };
  }

  let index = 0;
  const inputs = [];
  const text = query.replace(/\?/g, () => {
    const name = `p${index}`;
    inputs.push({ name, value: params[index] });
    index += 1;
    return `@${name}`;
  });

  return { text, inputs };
}

export async function dbRun(query, params = []) {
  const pool = await getPool();
  const { text, inputs } = prepareQuery(query, params);
  const request = pool.request();

  inputs.forEach(({ name, value }) => {
    request.input(name, value);
  });

  const isInsert = /^\s*insert/i.test(query);
  const finalQuery = isInsert ? `${text}; SELECT SCOPE_IDENTITY() AS lastID;` : text;

  const result = await request.query(finalQuery);

  const rowsAffected = result.rowsAffected?.reduce((acc, val) => acc + val, 0) || 0;
  let lastID = null;

  if (isInsert) {
    const recordsets = result.recordsets || [];
    const lastRecordset = recordsets[recordsets.length - 1];
    if (lastRecordset && lastRecordset[0] && lastRecordset[0].lastID !== undefined) {
      lastID = Number(lastRecordset[0].lastID);
    }
  }

  return { lastID, changes: rowsAffected };
}

export async function dbGet(query, params = []) {
  const pool = await getPool();
  const { text, inputs } = prepareQuery(query, params);
  const request = pool.request();

  inputs.forEach(({ name, value }) => {
    request.input(name, value);
  });

  const result = await request.query(text);
  return result.recordset?.[0] || null;
}

export async function dbAll(query, params = []) {
  const pool = await getPool();
  const { text, inputs } = prepareQuery(query, params);
  const request = pool.request();

  inputs.forEach(({ name, value }) => {
    request.input(name, value);
  });

  const result = await request.query(text);
  return result.recordset || [];
}

export async function initDatabase() {
  await getPool();

  const statements = [
    `
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
    `,
    `
    IF OBJECT_ID('dbo.hr_login', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.hr_login (
        id INT PRIMARY KEY,
        email NVARCHAR(255) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_hr_login_signup FOREIGN KEY (id) REFERENCES dbo.hr_signup(id) ON DELETE CASCADE
      );
    END
    `,
    `
    IF OBJECT_ID('dbo.candidate_signup', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.candidate_signup (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) UNIQUE NOT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME()
      );
    END
    `,
    `
    IF OBJECT_ID('dbo.candidate_login', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.candidate_login (
        id INT PRIMARY KEY,
        email NVARCHAR(255) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_candidate_login_signup FOREIGN KEY (id) REFERENCES dbo.candidate_signup(id) ON DELETE CASCADE
      );
    END
    `,
    `
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
        CONSTRAINT FK_jobs_hr_signup FOREIGN KEY (posted_by) REFERENCES dbo.hr_signup(id)
      );
    END
    `,
    `
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
        CONSTRAINT FK_candidate_profiles_signup FOREIGN KEY (candidate_id) REFERENCES dbo.candidate_signup(id)
      );
    END
    `,
    `
    IF OBJECT_ID('dbo.applications', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.applications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        candidate_id INT NOT NULL,
        job_id INT NOT NULL,
        status NVARCHAR(50) DEFAULT 'pending',
        applied_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_application UNIQUE (candidate_id, job_id),
        CONSTRAINT FK_applications_candidate FOREIGN KEY (candidate_id) REFERENCES dbo.candidate_signup(id),
        CONSTRAINT FK_applications_job FOREIGN KEY (job_id) REFERENCES dbo.jobs(id)
      );
    END
    `,
    `
    IF OBJECT_ID('dbo.saved_jobs', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.saved_jobs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        candidate_id INT NOT NULL,
        job_id INT NOT NULL,
        saved_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_saved_job UNIQUE (candidate_id, job_id),
        CONSTRAINT FK_saved_jobs_candidate FOREIGN KEY (candidate_id) REFERENCES dbo.candidate_signup(id),
        CONSTRAINT FK_saved_jobs_job FOREIGN KEY (job_id) REFERENCES dbo.jobs(id)
      );
    END
    `,
    `
    IF OBJECT_ID('dbo.hr_login_sessions', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.hr_login_sessions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        hr_login_id INT NOT NULL,
        token NVARCHAR(450) NOT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_hr_login_sessions FOREIGN KEY (hr_login_id) REFERENCES dbo.hr_login(id) ON DELETE CASCADE
      );
    END
    `,
    `
    IF OBJECT_ID('dbo.candidate_login_sessions', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.candidate_login_sessions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        candidate_login_id INT NOT NULL,
        token NVARCHAR(450) NOT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_candidate_login_sessions FOREIGN KEY (candidate_login_id) REFERENCES dbo.candidate_login(id) ON DELETE CASCADE
      );
    END
    `,
    `
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
    `,
    `
    IF NOT EXISTS (
      SELECT name FROM sys.indexes WHERE name = 'idx_hr_login_sessions_token' AND object_id = OBJECT_ID('dbo.hr_login_sessions')
    )
    BEGIN
      CREATE INDEX idx_hr_login_sessions_token ON dbo.hr_login_sessions(token);
    END
    `,
    `
    IF NOT EXISTS (
      SELECT name FROM sys.indexes WHERE name = 'idx_candidate_login_sessions_token' AND object_id = OBJECT_ID('dbo.candidate_login_sessions')
    )
    BEGIN
      CREATE INDEX idx_candidate_login_sessions_token ON dbo.candidate_login_sessions(token);
    END
    `,
    `
    IF NOT EXISTS (
      SELECT name FROM sys.indexes WHERE name = 'idx_login_history_email' AND object_id = OBJECT_ID('dbo.login_history')
    )
    BEGIN
      CREATE INDEX idx_login_history_email ON dbo.login_history(email, user_type);
    END
    `
  ];

  for (const statement of statements) {
    await dbRun(statement);
  }

  console.log('MSSQL database schema ensured');
}

