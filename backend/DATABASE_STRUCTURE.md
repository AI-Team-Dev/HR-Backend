# Database Structure

## Overview

The database has been restructured to separate signup information from login credentials. This provides better data organization and security.

## Table Structure

### HR/Admin Tables

#### `hr_signup`
Stores HR/Admin signup information (user profile data).

**Columns:**
- `id` - Primary key (used as user ID throughout the system)
- `full_name` - Full name of the HR/Admin
- `email` - Email address (unique)
- `company` - Company name
- `created_at` - Account creation timestamp

#### `hr_login`
Stores HR/Admin login credentials, sharing the same primary key as the signup record.

**Columns:**
- `id` - Primary key (also foreign key to `hr_signup(id)`)
- `email` - Email address (unique, matches signup email)
- `password` - Hashed password
- `created_at` - Login credentials creation timestamp

**Relationship:**
- `hr_login.id` → `hr_signup.id` (ON DELETE CASCADE)

### Candidate/Applicant Tables

#### `candidate_signup`
Stores candidate signup information (user profile data).

**Columns:**
- `id` - Primary key (used as user ID throughout the system)
- `name` - Name of the candidate
- `email` - Email address (unique)
- `created_at` - Account creation timestamp

#### `candidate_login`
Stores candidate login credentials, sharing the same primary key as the signup record.

**Columns:**
- `id` - Primary key (also foreign key to `candidate_signup(id)`)
- `email` - Email address (unique, matches signup email)
- `password` - Hashed password
- `created_at` - Login credentials creation timestamp

**Relationship:**
- `candidate_login.id` → `candidate_signup.id` (ON DELETE CASCADE)

### Other Tables

All other tables reference the signup tables (not the login tables):

- `jobs.posted_by` → `hr_signup.id`
- `candidate_profiles.candidate_id` → `candidate_signup.id`
- `applications.candidate_id` → `candidate_signup.id`
- `saved_jobs.candidate_id` → `candidate_signup.id`
- `login_sessions.user_id` → `hr_signup.id` or `candidate_signup.id` (based on user_type)

## Benefits of This Structure

1. **Separation of Concerns**: Signup data (profile) is separate from login data (credentials)
2. **Security**: Login credentials are isolated from profile information
3. **Data Integrity**: Foreign keys ensure referential integrity
4. **Cascade Deletion**: Deleting a signup record automatically deletes the login record
5. **Flexibility**: Easy to add additional login methods or update credentials without affecting profile

## Signup Flow

### HR/Admin Signup
1. Insert into `hr_signup` table (name, email, company)
2. Get the `lastID` from signup insert
3. Insert into `hr_login` table using the same `id` from the signup insert
4. Use `hr_signup.id` as the user ID in JWT tokens

### Candidate Signup
1. Insert into `candidate_signup` table (name, email)
2. Get the `lastID` from signup insert
3. Insert into `candidate_login` table using the same `id` from the signup insert
4. Use `candidate_signup.id` as the user ID in JWT tokens

## Login Flow

### HR/Admin Login
1. Query `hr_login` table by email
2. Join with `hr_signup` to get user profile information
3. Verify password from `hr_login.password`
4. Use `hr_signup.id` as user ID

### Candidate Login
1. Query `candidate_login` table by email
2. Join with `candidate_signup` to get user profile information
3. Verify password from `candidate_login.password`
4. Use `candidate_signup.id` as user ID

## Migration Notes

If you have an existing database with the old structure (`hr_users` and `candidates` tables), you'll need to:

1. **Backup your database** before migration
2. **Export existing data** from old tables
3. **Drop old tables** and let the new structure be created
4. **Import data** into new tables (split signup and login data)

The new structure will be created automatically when you restart the server, but existing data will need manual migration.

