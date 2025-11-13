# Troubleshooting Guide

## Job Creation Issues

### Problem: Jobs not saving when created by admin

**Possible Causes:**

1. **Foreign Key Constraint Error**
   - The `posted_by` field references `hr_signup.id`
   - If the HR user doesn't exist in `hr_signup`, the job creation will fail
   - **Solution**: Make sure you're logged in as HR and the user exists in the database

2. **Database Schema Mismatch**
   - Old database might still have `hr_users` table instead of `hr_signup`
   - **Solution**: Delete the old database file (`jobportal.db`) and restart the server to recreate tables

3. **Authentication Issues**
   - JWT token might be invalid or expired
   - **Solution**: Log out and log back in as HR

4. **Missing Required Fields**
   - Title, company, location, and description are required
   - **Solution**: Make sure all required fields are filled

### How to Debug

1. **Check Backend Logs**
   - Look for error messages in the console when creating a job
   - Common errors:
     - "FOREIGN KEY constraint failed" - User doesn't exist in hr_signup
     - "HR user not found" - User ID from token doesn't match database
     - "Internal server error" - Check the full error in console

2. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for network errors in the Network tab
   - Check Console tab for JavaScript errors

3. **Verify Database**
   - Make sure `hr_signup` table exists
   - Verify your user ID exists in `hr_signup` table
   - Check that `jobs` table has the correct foreign key to `hr_signup`

### Quick Fixes

**If jobs aren't showing up after creation:**

1. **Refresh the page** - The Dashboard should auto-refresh, but manual refresh helps
2. **Check if job is disabled** - Toggle the enable/disable switch
3. **Log out and log back in** - This refreshes your authentication
4. **Check the Jobs page** - Jobs appear there if enabled

**If you see "HR user not found" error:**

1. Delete `backend/jobportal.db` file
2. Restart the backend server
3. Sign up again as HR/Admin
4. Try creating a job again

**If foreign key constraint fails:**

1. Make sure you signed up using the new signup endpoint
2. The user should exist in both `hr_signup` and `hr_login` tables
3. The JWT token should contain the `hr_signup.id` as the user ID

## Database Reset

If you need to start fresh:

```bash
# Stop the backend server
# Delete the database file
rm backend/jobportal.db  # or delete manually

# Restart the server - it will recreate all tables
cd backend
npm start
```

## Common Error Messages

- **"HR user not found"** - Your user ID doesn't exist in hr_signup table. Sign up again.
- **"FOREIGN KEY constraint failed"** - The posted_by value doesn't match any hr_signup.id
- **"Invalid HR user. Please log in again."** - Foreign key constraint failed, re-authenticate
- **"Failed to create job"** - Database insert failed, check backend logs

