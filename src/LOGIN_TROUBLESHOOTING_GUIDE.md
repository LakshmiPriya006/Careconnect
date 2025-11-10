# Login Troubleshooting Guide

This guide helps resolve the "Invalid login credentials" error and other authentication issues in CareConnect.

## Common Login Issues

### 1. "Invalid login credentials" Error

**Cause:** This error occurs when:
- The user hasn't created an account yet
- The email/password combination doesn't exist in Supabase Auth
- The password is incorrect

**Solution:**
✅ **For New Users:**
1. Click the **"Sign Up"** tab on the login screen
2. Complete the registration process for your role (Client or Provider)
3. After registration completes, you'll be automatically logged in

✅ **For Existing Users:**
1. Double-check your email address (it's case-insensitive)
2. Double-check your password (it's case-sensitive)
3. Make sure you're using the correct login screen for your role:
   - **Client Login** - for elderly clients and family members
   - **Provider Login** - for service providers (caregivers, nurses, etc.)
   - **Admin Login** - for administrators

### 2. First Time Using the App

**For Admins:**
1. The first admin account must be created using **Admin Setup** from the landing page
2. Once created, you can log in using the **Admin Login** option
3. Default credentials are set during Admin Setup

**For Clients:**
1. Click **"I'm a Client"** on the landing page
2. Click the **"Sign Up"** tab
3. Click **"Start Registration"** button
4. Complete the registration form with:
   - Name
   - Email (must be verified with OTP)
   - Phone (must be verified with OTP)
   - Address
   - Age and Gender
   - Password (minimum 6 characters)

**For Providers:**
1. Click **"I'm a Service Provider"** on the landing page
2. Click the **"Sign Up"** tab
3. Click **"Start Registration Process"** button
4. Complete the multi-step registration:
   - Contact Information (Email + Phone with OTP verification)
   - Identity Documents (ID card, photo)
   - Service Details (specialty, experience, rates)
5. Wait for admin approval before you can accept jobs

## Understanding the Authentication Flow

### Client/Provider Authentication Flow:
```
1. User clicks role button on Landing Page
   ↓
2. AuthFlow component loads with Login tab active
   ↓
3a. EXISTING USER: Enter email + password → Sign In
   ↓
   Success: Logged into dashboard
   
3b. NEW USER: Click "Sign Up" tab → Start Registration
   ↓
   Complete registration form with OTP verification
   ↓
   Account created in Supabase Auth + KV Store
   ↓
   Auto-login with new credentials
   ↓
   Logged into dashboard
```

### Admin Authentication Flow:
```
1. First Time: Click "Admin Setup" on Landing Page
   ↓
   Create admin account with email + password
   ↓
   Admin account created
   
2. Subsequent Times: Click "I'm an Admin" on Landing Page
   ↓
   Enter admin email + password
   ↓
   Logged into admin dashboard
```

## Technical Details

### Where User Data is Stored:
1. **Supabase Auth**: Stores email, password hash, and basic metadata
   - `email`: User's email address
   - `user_metadata.role`: 'client', 'provider', or 'admin'
   - `user_metadata.name`: User's full name
   - `email_confirm`: Set to `true` (auto-confirmed since no email server configured)

2. **KV Store**: Stores detailed user information
   - Key format: `user:{userId}`
   - Contains: name, email, phone, address, role, and role-specific data

### How Login Works:
1. Frontend calls `supabase.auth.signInWithPassword({ email, password })`
2. Supabase Auth validates credentials
3. If valid, returns `session` with `access_token`
4. Token stored in `localStorage` as `access_token`
5. User redirected to appropriate dashboard based on role

### How Signup Works:
1. Frontend collects user information
2. Backend API called: `/auth/signup/client` or `/auth/signup/provider`
3. Backend uses `supabaseAdmin.auth.admin.createUser()` to create account
4. Backend stores additional data in KV store
5. Frontend automatically logs in new user

## Error Messages & Their Meanings

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Invalid login credentials" | Email/password not found or incorrect | Create account first or check credentials |
| "This account is not an admin account" | Logged in with non-admin credentials on admin login | Use correct login screen for your role |
| "No admin account has been created yet" | Admin trying to login before admin setup | Use Admin Setup to create first admin |
| "Email not confirmed" | Email verification required | Should not occur (auto-confirmed) |
| "Password must be at least 6 characters" | Password too short during signup | Use longer password |
| "This email is already registered" | Duplicate email during signup | Login instead or use different email |

## Improved User Experience

### What We've Added:
1. **Helpful Info Alert**: Blue info box on login tab reminds users to sign up first
2. **Context-Specific Error Messages**: Different messages for client vs provider vs admin
3. **Clear Navigation**: Error messages guide users to the Sign Up tab
4. **Role Verification**: Prevents using wrong login type (e.g., admin credentials on client login)

### Error Message Examples:

**Client Login Error:**
> "Invalid email or password. If you don't have an account yet, please click the 'Sign Up' tab above to create one."

**Provider Login Error:**
> "Invalid email or password. If you don't have an account yet, please click the 'Sign Up' tab above to register as a provider."

**Admin Login Error:**
> "Invalid admin credentials. If you haven't created an admin account yet, please use Admin Setup."

## Testing Login Functionality

### To Test Client Login:
```
1. Go to Landing Page
2. Click "I'm a Client"
3. Click "Sign Up" tab
4. Click "Start Registration"
5. Fill form:
   - Name: John Doe
   - Email: test@example.com
   - Phone: 555-123-4567
   - Click "Send OTP" for both email and phone
   - Enter any 6-digit code (123456)
   - Click verify for both
   - Address: 123 Main St
   - Age: 70
   - Gender: Male
   - Password: test123
6. Click "Create Account"
7. Should auto-login and see Client Dashboard
8. Logout and try logging in with same credentials
```

### To Test Provider Login:
```
1. Go to Landing Page
2. Click "I'm a Service Provider"
3. Click "Sign Up" tab
4. Complete multi-step registration
5. After registration, you'll be logged in
6. Your status will be "Pending Verification"
7. Admin must approve before you can accept jobs
```

### To Test Admin Login:
```
1. Go to Landing Page
2. Click "Admin Setup" (first time only)
3. Create admin account
4. Return to Landing Page
5. Click "I'm an Admin"
6. Login with admin credentials
7. Should see Admin Dashboard
```

## Debugging Tips

### Check Browser Console:
Look for these log messages:
- `Login error:` - Shows the actual error from Supabase
- `Error creating client account:` - Shows signup errors
- `Error checking admin:` - Shows admin check errors

### Check Server Logs:
The Supabase Edge Function logs show:
- `Error creating client account:` - Signup issues
- `Error verifying user token:` - Token validation issues
- All API requests and responses

### Verify User Exists:
You can check if a user exists by:
1. Login to Admin Dashboard
2. Go to User Management
3. Search for the email address
4. Check if user is listed with correct role

## Prevention Best Practices

### For Users:
1. ✅ Always sign up before trying to log in
2. ✅ Use the correct login screen for your role
3. ✅ Remember that passwords are case-sensitive
4. ✅ Use at least 6 characters for passwords
5. ✅ Complete OTP verification during signup

### For Developers:
1. ✅ Always show helpful error messages
2. ✅ Guide users to sign up if account doesn't exist
3. ✅ Log errors to console for debugging
4. ✅ Verify user role matches login type
5. ✅ Handle all error cases gracefully

## Summary

The "Invalid login credentials" error is most commonly caused by users trying to log in before creating an account. We've improved the UX by:

1. Adding a helpful blue info alert on the login screen
2. Providing specific error messages that guide users to sign up
3. Making the Sign Up tab more prominent
4. Adding clear instructions for each user role

If issues persist, check:
- ✅ Server logs for API errors
- ✅ Browser console for client-side errors
- ✅ User database to verify account exists
- ✅ Credentials are correct (especially password case)
