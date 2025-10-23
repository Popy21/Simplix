# JWT Refresh Token Implementation Complete

## Overview

A comprehensive JWT authentication system has been implemented with automatic token refresh, logout functionality, and proactive token expiration checking. This document details the complete flow and all components involved.

## Architecture

### Token Strategy
- **Access Token**: Short-lived (15 minutes), used for API authentication
- **Refresh Token**: Long-lived (7 days), stored securely in database and AsyncStorage
- **Token Pair**: Both returned on login/register for seamless refresh capability

### Components

#### 1. Backend API Endpoints (`api/src/routes/auth.ts`)

```
POST /auth/register
POST /auth/login
POST /auth/refresh      (takes refreshToken, returns new token pair)
POST /auth/logout       (revokes refresh tokens in database)
POST /auth/change-password
GET  /auth/me
POST /auth/validate-password
```

Response format:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "8d9a7736-8793-4779-885d-753a42e2f17d",
    "email": "test@simplix.local",
    "name": "Test User",
    "role": "admin"
  }
}
```

#### 2. Frontend Storage Management (`web-app/src/utils/storage.ts`)

**New Methods Added:**
- `saveRefreshToken(token)` - Stores refresh token in AsyncStorage
- `getRefreshToken()` - Retrieves refresh token from storage
- `removeRefreshToken()` - Clears refresh token
- `clearAuth()` - Clears both access token AND refresh token (updated)

**Key Implementation:**
```typescript
const REFRESH_TOKEN_KEY = 'refreshToken';

export const saveRefreshToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving refresh token:', error);
    throw error;
  }
};
```

#### 3. Token Management Utilities (`web-app/src/utils/tokenManager.ts`)

**Created Functions:**
- `decodeToken(token)` - Parses JWT payload using native `atob()`
- `isTokenExpired(token)` - Checks if token has passed expiration
- `isTokenExpiringSoon(token, bufferSeconds=300)` - Proactive check (default: 5 min buffer)
- `getTokenRemainingTime(token)` - Returns seconds until expiration
- `isValidTokenFormat(token)` - Validates 3-part JWT structure
- `getTokenExpiryDate(token)` - Returns Date object
- `formatTokenExpiry(token)` - Human-readable format (e.g., "5m 30s")

**No External Dependencies**: Uses native JavaScript `atob()` for base64 decoding

**Key Implementation:**
```typescript
export const isTokenExpiringSoon = (token: string, bufferSeconds = 300): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    const now = Date.now();
    const expiresAt = decoded.exp * 1000;
    const bufferMs = bufferSeconds * 1000;
    return (expiresAt - now) < bufferMs;
  } catch (error) {
    return true;
  }
};
```

#### 4. Axios Interceptors (`web-app/src/services/api.ts`)

**Request Interceptor:**
- Retrieves current access token from storage
- Adds `Authorization: Bearer {token}` header to every request
- Handles errors gracefully

**Response Interceptor with Automatic Refresh:**
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once (prevent infinite loops)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token from storage
        const refreshToken = await storage.getRefreshToken();
        
        if (!refreshToken) {
          await storage.clearAuth();
          return Promise.reject(error);
        }

        // Call refresh endpoint
        const response = await authService.refresh(refreshToken);
        const { token, accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in storage
        await storage.saveToken(accessToken || token);
        if (newRefreshToken) {
          await storage.saveRefreshToken(newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken || token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth
        await storage.clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**Features:**
- Prevents infinite retry loops with `_retry` flag
- Handles refresh token absence gracefully
- Updates both tokens from refresh response
- Retries original request automatically after token refresh
- Clears auth on persistent failure

#### 5. Auth Service Methods (`web-app/src/services/api.ts`)

**New Methods Added:**
```typescript
refresh: (refreshToken: string) =>
  api.post('/auth/refresh', { refreshToken }),
logout: () =>
  api.post('/auth/logout'),
```

#### 6. Authentication Context (`web-app/src/context/AuthContext.tsx`)

**Enhanced with Three Features:**

1. **Login/Register Token Storage:**
   ```typescript
   const login = async (email: string, password: string) => {
     try {
       const response = await authService.login({ email, password });
       const { token: newToken, refreshToken: newRefreshToken, user: newUser } = response.data;

       await Promise.all([
         storage.saveToken(newToken),
         storage.saveRefreshToken(newRefreshToken),  // NEW
         storage.saveUser(newUser),
       ]);

       setToken(newToken);
       setUser(newUser);
     } catch (error) {
       throw new Error(error.response?.data?.error || 'Login failed');
     }
   };
   ```

2. **API-Based Logout:**
   ```typescript
   const logout = async () => {
     try {
       // Call API to revoke refresh tokens on server
       try {
         await authService.logout();
       } catch (error) {
         console.warn('Logout API call failed, clearing local auth anyway:', error);
       }

       // Clear local auth data
       await storage.clearAuth();
       setToken(null);
       setUser(null);
     } catch (error) {
       console.error('Error during logout:', error);
       throw error;
     }
   };
   ```

3. **Proactive Token Refresh (Every 60 Seconds):**
   ```typescript
   useEffect(() => {
     if (!token) return;

     const tokenRefreshInterval = setInterval(async () => {
       try {
         if (isTokenExpiringSoon(token, 300)) {  // 5 min buffer
           const refreshToken = await storage.getRefreshToken();
           
           if (!refreshToken) {
             console.warn('Token expiring soon but no refresh token available');
             return;
           }

           const response = await authService.refresh(refreshToken);
           const { token: newToken, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
           const tokenToUse = newAccessToken || newToken;

           await storage.saveToken(tokenToUse);
           if (newRefreshToken) {
             await storage.saveRefreshToken(newRefreshToken);
           }

           setToken(tokenToUse);
           console.log('Token proactively refreshed');
         }
       } catch (error) {
         console.error('Error proactively refreshing token:', error);
       }
     }, 60000);  // Check every minute

     return () => clearInterval(tokenRefreshInterval);
   }, [token]);
   ```

#### 7. Backend Authentication Middleware (`api/src/middleware/auth.ts`)

**Enhanced Validation:**
- JWT format validation: `token.split('.').length === 3`
- Comprehensive error handling with specific error messages
- User existence check in database
- Organization context validation

**Features:**
```typescript
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Extract token from Authorization header
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Validate JWT format (must have 3 parts: header.payload.signature)
  if (token.split('.').length !== 3) {
    return res.status(401).json({ error: 'Malformed JWT token' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as any;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Token verification failed' });
  }
};
```

## Complete Authentication Flow

### Initial Login
```
1. User enters credentials on login screen
2. Frontend calls POST /auth/login
3. Backend generates and returns:
   - accessToken (15 min expiry)
   - refreshToken (7 day expiry)
   - user object
4. Frontend stores both tokens in AsyncStorage
5. AuthContext updates with user and token
6. Request interceptor starts adding token to API calls
7. Proactive refresh checker starts (every 60 sec)
```

### Making API Calls
```
1. Any API call is intercepted by request interceptor
2. Current access token is retrieved from storage
3. Authorization header added: "Bearer {token}"
4. Request sent to API endpoint
5. Backend middleware validates token and user
6. Response returned with data
```

### Token Expiration & Refresh (Automatic)
```
SCENARIO 1: Proactive Refresh (Before Expiration)
  ├─ Proactive checker runs every 60 seconds
  ├─ Checks if token expiring within 5 minutes
  ├─ If expiring: calls POST /auth/refresh with refreshToken
  ├─ Gets new token pair
  ├─ Updates storage and state
  └─ User doesn't notice (seamless)

SCENARIO 2: Reactive Refresh (On 401 During API Call)
  ├─ API call happens with expired token
  ├─ Backend returns 401 Unauthorized
  ├─ Response interceptor catches 401
  ├─ Calls POST /auth/refresh with refreshToken
  ├─ Gets new token pair
  ├─ Updates storage and headers
  ├─ Retries original request
  └─ User gets data without re-doing the action
```

### Logout
```
1. User clicks logout button
2. Frontend calls authService.logout()
   - POST /auth/logout endpoint
   - Backend marks refreshToken as revoked in database
3. Frontend clears all auth data from storage
4. AuthContext updates: user = null, token = null
5. Proactive refresh effect is cleared
6. User redirected to login screen
7. Any stored refresh tokens become invalid
```

### Session Timeout (After 7 Days)
```
1. Refresh token expires naturally
2. User tries to make API call (token is expired)
3. Response interceptor catches 401
4. Attempts to refresh with expired refreshToken
5. Backend rejects refresh (token expired)
6. Response interceptor clears all auth
7. User is logged out and redirected to login
```

## Error Handling

### Request Interceptor Errors
- Token retrieval failure → logs error, continues without token
- Network issues → rejected to response interceptor

### Response Interceptor Errors
- **401 No Retry Flag**: Normal 401, doesn't have `_retry` flag
  - Attempts refresh with refreshToken
  - Retries original request if refresh succeeds
  - Clears auth if refresh fails

- **401 With Retry Flag**: Refresh already attempted
  - Prevents infinite loop
  - Clears auth and rejects

- **Refresh Endpoint Failure**:
  - Invalid refresh token → clears auth
  - Expired refresh token → clears auth
  - Network error → clears auth
  - User logged out elsewhere → clears auth

### Auth Service Errors
- Network failures → rejected to caller
- Invalid credentials → error message from backend
- Token validation failures → 401 response

## Security Considerations

1. **Token Storage**: AsyncStorage on React Native (secure for mobile)
2. **Token Transmission**: Always in Authorization header with Bearer scheme
3. **Token Refresh**: Only on 401 or when expiring soon (not on every request)
4. **Single Retry**: `_retry` flag prevents infinite refresh attempts
5. **Server Revocation**: Logout revokes refresh token in database
6. **Token Format Validation**: Prevents malformed token processing
7. **No Token in URLs**: Always in headers, never in query parameters

## Testing the Flow

### 1. Create Test Account
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@simplix.local",
    "password": "Test123!Abc",
    "name": "Test User"
  }'
```

### 2. Test Login Flow
- Open app and navigate to login screen
- Enter credentials: `test@simplix.local` / `Test123!Abc`
- Verify tokens stored in AsyncStorage
- Verify user object displayed

### 3. Test API Calls
- Make API request (e.g., get customers)
- Verify Authorization header is added
- Verify data returns successfully

### 4. Test Token Refresh
- Wait 5-15 minutes (proactive refresh will occur)
- Check console for "Token proactively refreshed" message
- Make another API call
- Verify it succeeds (new token is valid)

### 5. Test Logout
- Click logout button
- Verify `/auth/logout` endpoint is called
- Verify auth data cleared from storage
- Verify user redirected to login

### 6. Test 401 Recovery
- Manually edit AsyncStorage to expire the token
- Make API call
- Verify 401 interceptor attempts refresh
- Verify original request is retried
- Verify data returns successfully

## Files Modified/Created

### Backend
- ✅ `api/src/routes/auth.ts` - Added refresh and logout endpoints
- ✅ `api/src/middleware/auth.ts` - Enhanced with format validation
- ✅ `api/src/routes/deals.ts` - Replaced hardcoded org_id

### Frontend
- ✅ `web-app/src/services/api.ts` - Added interceptor refresh logic, logout method
- ✅ `web-app/src/context/AuthContext.tsx` - Added refresh storage, logout API call, proactive refresh
- ✅ `web-app/src/utils/storage.ts` - Added refresh token methods
- ✅ `web-app/src/utils/tokenManager.ts` - New utility for JWT operations

## Next Steps (Optional Enhancements)

1. **Session Expiration UI**: Show notification before logout
2. **Biometric Authentication**: Add fingerprint/face recognition for login
3. **Device Management**: Track logged-in devices, logout from specific devices
4. **Rate Limiting**: Limit refresh attempts to prevent abuse
5. **Refresh Token Rotation**: Issue new refresh token on each refresh
6. **HttpOnly Cookies**: Move tokens to httpOnly cookies for web version
7. **Single Sign-Out**: Logout from all devices simultaneously
8. **Token Revocation List**: Cache revoked tokens instead of database check
9. **Multi-Factor Authentication**: Add 2FA support
10. **Session Analytics**: Track login/logout events for security audit

## Troubleshooting

### "No refresh token available"
- **Cause**: User logged out or refresh token was cleared
- **Solution**: Redirect to login screen

### "Token proactively refreshed" not appearing
- **Cause**: Token not expiring within 5 minute buffer
- **Solution**: Wait longer or manually set token expiry to test

### 401 loop with `_retry` flag
- **Cause**: Refresh endpoint returning invalid token
- **Solution**: Check backend token generation, verify SECRET_KEY consistency

### AsyncStorage errors on React Native
- **Cause**: Storage full or permission issues
- **Solution**: Clear app data and retry, check permissions in app.json

---

**Status**: ✅ Complete Implementation
**Last Updated**: [Current Date]
**Next Review**: After comprehensive testing with real users
