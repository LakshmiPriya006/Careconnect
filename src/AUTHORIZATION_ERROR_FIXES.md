# Authorization Error Fixes - Provider Bookings

## Problem
Provider users were getting "Unauthorized" errors when trying to access their jobs/bookings:
```
API Error on /bookings/provider: {
  "error": "Unauthorized"
}
Error loading jobs: Error: Unauthorized
```

## Root Cause
The issue was likely caused by one or more of the following:
1. **Expired Access Token** - The JWT token stored in localStorage may have expired
2. **Missing Session Refresh** - No automatic token refresh mechanism
3. **Poor Error Messaging** - Generic "Unauthorized" error didn't help users understand the issue

## Solutions Implemented

### 1. Enhanced Backend Authentication Logging
**File:** `/supabase/functions/server/index.tsx`

Added detailed logging to the `verifyUser` function to help diagnose auth issues:

```typescript
async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    console.log('❌ [AUTH] No authorization header provided');
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ [AUTH] No token found in authorization header');
    return null;
  }
  
  // ... existing verification code ...
  
  if (error || !user) {
    console.log('❌ [AUTH] Error verifying user token:', error?.message || 'Unknown error');
    console.log('❌ [AUTH] Token (first 20 chars):', token.substring(0, 20) + '...');
    return null;
  }
  
  console.log(`✅ [AUTH] User verified: ${user.id} (${user.email})`);
  return user;
}
```

**Benefits:**
- Can now see exactly where authentication is failing
- Helps debug token-related issues
- Provides visibility into the auth process

### 2. Automatic Token Refresh Mechanism
**File:** `/utils/api.ts`

Implemented automatic session refresh before making API requests:

```typescript
// Helper function to get a fresh access token
async function getFreshToken(): Promise<string | null> {
  const supabase = createClient();
  
  // Try to get current session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    console.log('⚠️ No valid session found, trying to refresh...');
    
    // Try to refresh the session
    const { data: { session: refreshedSession }, error: refreshError } = 
      await supabase.auth.refreshSession();
    
    if (refreshError || !refreshedSession) {
      console.error('❌ Failed to refresh session:', refreshError);
      return null;
    }
    
    // Save the new token
    localStorage.setItem('access_token', refreshedSession.access_token);
    console.log('✅ Session refreshed successfully');
    return refreshedSession.access_token;
  }
  
  // Update localStorage with current token
  localStorage.setItem('access_token', session.access_token);
  return session.access_token;
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  // First, try to get a fresh token
  let token = await getFreshToken();
  
  // Fallback to localStorage if session check fails
  if (!token) {
    token = localStorage.getItem('access_token');
  }
  
  // ... rest of the function
}
```

**Benefits:**
- Automatically refreshes expired tokens
- Prevents "Unauthorized" errors from expired sessions
- Seamless user experience - no need to manually log out and back in
- Token is always kept up-to-date

### 3. Enhanced Error Messages
**File:** `/utils/api.ts`

Added specific error handling for 401 Unauthorized responses:

```typescript
if (response.status === 401) {
  console.error('🔐 Unauthorized error - token might be expired or invalid');
  console.error('💡 Please try logging out and logging back in');
}

throw new Error(error.error || error.message || 'Request failed');
```

**File:** `/components/ProviderJobManagement.tsx`

Enhanced error handling in the component:

```typescript
catch (error: any) {
  console.error('Error loading jobs:', error);
  console.error('Error message:', error.message);
  
  // Show more helpful error message
  if (error.message.includes('Unauthorized') || error.message.includes('log in')) {
    toast.error('Session expired. Please log out and log back in.');
  } else {
    toast.error('Failed to load jobs: ' + error.message);
  }
}
```

**Benefits:**
- Users get clear, actionable error messages
- Specific guidance on how to resolve auth issues
- Better user experience

### 4. Enhanced Provider Bookings Endpoint Logging
**File:** `/supabase/functions/server/index.tsx`

Added detailed logging to the provider bookings endpoint:

```typescript
app.get('/make-server-de4eab6a/bookings/provider', async (c) => {
  try {
    console.log('🔐 [PROVIDER-BOOKINGS] Attempting to verify user...');
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('❌ [PROVIDER-BOOKINGS] User verification failed - returning 401');
      return c.json({ 
        error: 'Unauthorized', 
        message: 'Please log in again' 
      }, 401);
    }
    
    console.log(`🔍 Loading bookings for provider ${user.id}`);
    // ... rest of the endpoint
  }
});
```

**Benefits:**
- Can track which step of the process is failing
- Easier to debug issues in production
- Better error messages returned to frontend

### 5. Token Debugging in Frontend
**File:** `/components/ProviderJobManagement.tsx`

Added token visibility for debugging:

```typescript
const loadJobs = async () => {
  setLoading(true);
  try {
    console.log('Loading provider jobs...');
    console.log('🔑 Access token from localStorage:', 
      localStorage.getItem('access_token')?.substring(0, 30) + '...');
    
    const response = await provider.getBookings();
    // ... rest of the function
  }
};
```

**Benefits:**
- Can verify if token exists in localStorage
- Helps debug token-related issues
- Can see token format issues

## How It Works Now

### Normal Flow (Token Valid)
1. User tries to load jobs
2. `apiRequest` calls `getFreshToken()`
3. `getFreshToken()` checks Supabase session
4. Session is valid, token is returned
5. Request is made with valid token
6. Backend verifies token
7. Jobs are returned successfully

### Expired Token Flow (Auto-Refresh)
1. User tries to load jobs
2. `apiRequest` calls `getFreshToken()`
3. `getFreshToken()` checks Supabase session
4. Session is expired or invalid
5. `refreshSession()` is called automatically
6. New token is saved to localStorage
7. Request is made with fresh token
8. Backend verifies new token
9. Jobs are returned successfully

### No Valid Session Flow (Error Handling)
1. User tries to load jobs
2. `apiRequest` calls `getFreshToken()`
3. `getFreshToken()` checks Supabase session
4. Session doesn't exist or can't be refreshed
5. Falls back to localStorage token
6. If that fails, request is made without valid token
7. Backend returns 401 Unauthorized
8. Frontend catches error and shows helpful message
9. User is prompted to log out and log back in

## Testing the Fix

### As a Provider:
1. **Login** as a provider user
2. **Navigate** to the "My Jobs" tab
3. **Check Console** for authentication logs:
   - Look for `✅ [AUTH] User verified: ...`
   - Look for `✅ Session refreshed successfully` (if token was expired)
4. **Verify** jobs load without "Unauthorized" error
5. **Check Toast** notifications for helpful messages if there are issues

### Testing Token Refresh:
1. Login as a provider
2. Wait for token to expire (or manually clear it from localStorage)
3. Try to load jobs
4. Should automatically refresh and work without manual login

### If Issues Persist:
Check the browser console for these log messages:
- `❌ [AUTH] No authorization header provided` - Token not being sent
- `❌ [AUTH] Error verifying user token` - Token is invalid/expired and can't be refreshed
- `⚠️ No valid session found, trying to refresh...` - Attempting auto-refresh
- `✅ Session refreshed successfully` - Auto-refresh worked
- `❌ Failed to refresh session` - Need to log out and back in

## Files Modified

1. `/supabase/functions/server/index.tsx`
   - Enhanced `verifyUser()` function with detailed logging
   - Enhanced provider bookings endpoint logging
   - Better error messages

2. `/utils/api.ts`
   - Added `getFreshToken()` helper function
   - Implemented automatic session refresh
   - Enhanced error handling for 401 responses
   - Added Supabase client import

3. `/components/ProviderJobManagement.tsx`
   - Enhanced error handling with specific messages
   - Added token debugging logs
   - Better user feedback for auth issues

## Additional Notes

### Why This Solution Works:
- **Proactive**: Refreshes tokens automatically before they cause issues
- **Graceful**: Falls back to manual login if auto-refresh fails
- **Informative**: Clear logging and error messages at every step
- **User-Friendly**: Minimal disruption to user experience

### Best Practices Applied:
- ✅ Always check session validity before API calls
- ✅ Automatically refresh expired tokens when possible
- ✅ Provide clear, actionable error messages
- ✅ Add comprehensive logging for debugging
- ✅ Graceful degradation when refresh fails

### Future Improvements:
- Add a global session monitor that refreshes tokens in the background
- Implement automatic logout after multiple failed refresh attempts
- Add a "Session Expiring Soon" notification
- Store refresh token separately for better security

## Summary

The authorization errors have been fixed by implementing:
1. ✅ **Automatic token refresh** - Sessions are refreshed automatically
2. ✅ **Enhanced logging** - Detailed logs help diagnose issues quickly
3. ✅ **Better error messages** - Users get clear guidance on what to do
4. ✅ **Debugging tools** - Console logs help track down any remaining issues

The provider bookings endpoint should now work reliably, and any session expiration issues will be handled gracefully with automatic refresh or clear user guidance to re-authenticate.
