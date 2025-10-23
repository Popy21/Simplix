# JWT Authentication Testing Guide

## Quick Start

### 1. Create Test Account

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-auth@simplix.local",
    "password": "Test123!Abc",
    "name": "Auth Test User"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "email": "test-auth@simplix.local",
    "name": "Auth Test User",
    "role": "user"
  }
}
```

---

## Test Scenarios

### Scenario 1: Login Flow

**Test**: Verify tokens are stored and added to requests

**Steps:**
1. Open mobile app or web client
2. Navigate to Login screen
3. Enter credentials:
   - Email: `test-auth@simplix.local`
   - Password: `Test123!Abc`
4. Click Login button

**Expected Results:**
- ✅ Login succeeds
- ✅ User dashboard appears
- ✅ AuthContext shows user data
- ✅ Tokens stored in AsyncStorage

**Console Output:**
```
✅ Login API called
✅ Tokens saved to storage
✅ Proactive refresh interval started
```

---

### Scenario 2: Token Added to API Requests

**Test**: Verify Authorization header is automatically added

**Steps:**
1. After successful login, navigate to any screen that makes API calls (e.g., Customers)
2. Open browser DevTools → Network tab
3. Trigger an API call (load customers list)
4. Inspect the request headers

**Expected Results:**
- ✅ Request has `Authorization: Bearer {token}` header
- ✅ API call succeeds (200/201 response)
- ✅ Data loads and displays

**Network Tab Shows:**
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json
```

---

### Scenario 3: Proactive Token Refresh

**Test**: Verify token is refreshed before expiration

**Steps:**
1. Login with test account
2. Open browser DevTools → Console
3. Wait 60+ seconds (proactive checker runs every 60s)
4. Observe console output

**Expected Results:**
- ✅ After 60 seconds: "Token proactively refreshed" message appears
- ✅ New token stored in AsyncStorage
- ✅ Original request continues without user interaction

**Console Output:**
```
[AuthContext] Token proactively refreshed
```

---

### Scenario 4: Reactive Token Refresh (on 401)

**Test**: Verify token refresh happens when token expires during use

**Prerequisites:**
- Have test account logged in
- Have Expo DevTools or browser DevTools open

**Steps:**
1. Login and make an API call successfully (verify 200 response)
2. Manually expire the token:
   ```javascript
   // Run in browser console
   localStorage.setItem('accessToken', 'expired.token.here')
   ```
3. Trigger another API call
4. Observe response interceptor behavior

**Expected Results:**
- ✅ First API call returns 401 (expired token)
- ✅ Response interceptor catches 401
- ✅ Response interceptor calls `/auth/refresh` endpoint
- ✅ Gets new token from backend
- ✅ Retries original request
- ✅ Original request succeeds (200 response)
- ✅ User doesn't see the 401 error

**Network Tab Shows:**
```
1. Original request → 401
2. POST /auth/refresh → 200 (new tokens returned)
3. Retry original request → 200 (with new token)
```

**Console Output:**
```
[Interceptor] Token refresh initiated
[Interceptor] Original request retried
```

---

### Scenario 5: Logout Flow

**Test**: Verify tokens are revoked and cleared

**Steps:**
1. Login with test account
2. Click Logout button
3. Observe console and storage

**Expected Results:**
- ✅ POST /auth/logout API call is made
- ✅ Backend revokes refresh token in database
- ✅ AsyncStorage tokens are cleared
- ✅ AuthContext is cleared (user = null, token = null)
- ✅ User redirected to login screen
- ✅ Proactive refresh interval is cleared

**Console Output:**
```
[API] POST /auth/logout (200)
[AuthContext] Tokens cleared
[AuthContext] Proactive refresh interval cleared
```

**Verify in DevTools:**
```javascript
// Check AsyncStorage is empty
AsyncStorage.getItem('accessToken')  // → null
AsyncStorage.getItem('refreshToken') // → null
```

---

### Scenario 6: Session Timeout (7 Days)

**Test**: Verify automatic logout when refresh token expires

**Prerequisites:**
- Requires waiting 7 days OR manipulating token expiry

**Manual Test Steps:**
1. In backend, temporarily reduce refresh token expiry to 10 seconds:
   ```typescript
   // api/src/utils/tokenManager.ts
   const refreshTokenExpiry = Math.floor(Date.now() / 1000) + 10; // 10 seconds
   ```
2. Login with test account
3. Wait 10+ seconds without activity
4. Try to make an API call

**Expected Results:**
- ✅ Proactive check attempts refresh
- ✅ Backend rejects refresh (token expired)
- ✅ Frontend clears auth
- ✅ User is logged out
- ✅ User redirected to login

**Console Output:**
```
[Interceptor] Token refresh failed
[AuthContext] Session expired, user logged out
```

---

### Scenario 7: Invalid Refresh Token Handling

**Test**: Verify behavior when refresh token is invalid

**Steps:**
1. Manually edit AsyncStorage:
   ```javascript
   AsyncStorage.setItem('refreshToken', 'invalid.token.here')
   ```
2. Expire the access token (see Scenario 4)
3. Trigger an API call

**Expected Results:**
- ✅ Access token is expired (401)
- ✅ Response interceptor attempts refresh
- ✅ Backend rejects invalid refresh token
- ✅ Frontend clears all auth
- ✅ User is logged out

**Console Output:**
```
[Interceptor] Token refresh failed: Invalid token
[AuthContext] Auth cleared, redirect to login
```

---

### Scenario 8: No Refresh Token Available

**Test**: Verify graceful handling when refresh token is missing

**Steps:**
1. Manually clear refresh token:
   ```javascript
   AsyncStorage.removeItem('refreshToken')
   ```
2. Expire the access token
3. Trigger an API call

**Expected Results:**
- ✅ Access token is expired (401)
- ✅ Response interceptor looks for refresh token
- ✅ Refresh token not found
- ✅ Original error (401) is rejected
- ✅ Caller must handle 401 error

**Console Output:**
```
[Interceptor] No refresh token available, user logged out
```

---

### Scenario 9: Concurrent API Calls During Refresh

**Test**: Verify multiple concurrent requests are queued during token refresh

**Prerequisites:**
- Requires expiring token during concurrent requests

**Steps:**
1. Login successfully
2. Trigger 3-4 API calls simultaneously (e.g., load customers, products, teams)
3. Simultaneously expire the token:
   ```javascript
   localStorage.setItem('accessToken', 'expired.token.here')
   ```
4. Observe network tab

**Expected Results:**
- ✅ All requests fail with 401
- ✅ Response interceptor refresh is triggered once
- ✅ Single refresh endpoint call is made
- ✅ All requests retry with new token
- ✅ All requests eventually succeed

**Network Tab Shows:**
```
Req 1: GET /customers → 401
Req 2: GET /products → 401
Req 3: GET /teams → 401
[Interceptor] POST /auth/refresh → 200
Req 1: GET /customers → 200 (retry)
Req 2: GET /products → 200 (retry)
Req 3: GET /teams → 200 (retry)
```

---

### Scenario 10: Login From Different Device

**Test**: Verify new login invalidates old tokens (optional, requires logout on old device)

**Steps:**
1. Device A: Login with test account
2. Device B: Login with same account
3. Device A: Try to make API call

**Expected Results:**
- ✅ Device B gets new tokens
- ✅ Device A's old tokens still work (no automatic invalidation)
- ✅ Both devices can use API independently

**Note**: To force Device A logout, manually logout or clear refresh token:
```javascript
// Device A console
AsyncStorage.removeItem('refreshToken')
```

---

## Debugging Tips

### Check Token in Storage

```javascript
// In browser console (Expo/web)
AsyncStorage.getItem('accessToken').then(t => {
  console.log('Access Token:', t);
  console.log('Token Expiry:', new Date(JSON.parse(atob(t.split('.')[1])).exp * 1000));
});

AsyncStorage.getItem('refreshToken').then(t => {
  console.log('Refresh Token:', t);
  console.log('Token Expiry:', new Date(JSON.parse(atob(t.split('.')[1])).exp * 1000));
});
```

### Decode JWT Manually

```javascript
// Extract payload (middle part between dots)
function decodeJWT(token) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

decodeJWT(accessToken);
// Output:
// {
//   iss: "simplix-api",
//   sub: "user-id",
//   email: "test@simplix.local",
//   role: "user",
//   org_id: "org-uuid",
//   iat: 1234567890,
//   exp: 1234568890
// }
```

### Monitor AuthContext State

```javascript
// In React component
const { user, token, isAuthenticated, isLoading } = useAuth();

useEffect(() => {
  console.log('[AuthContext] State:', {
    user,
    token: token ? token.substring(0, 20) + '...' : null,
    isAuthenticated,
    isLoading,
  });
}, [user, token, isAuthenticated, isLoading]);
```

### Enable Request/Response Logging

```typescript
// In api.ts, add detailed logging to interceptors

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Request]', config.method.toUpperCase(), config.url, '→ Token added');
    }
    return config;
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('[Response]', response.config.method.toUpperCase(), response.config.url, '→', response.status);
    return response;
  }
);
```

---

## Common Issues & Solutions

### Issue: "401 Unauthorized" on first API call after login

**Cause**: Token not added to request header

**Solution**:
1. Verify request interceptor is loaded
2. Check token is saved in AsyncStorage
3. Verify Authorization header is present in DevTools

**Test Command:**
```bash
curl -H "Authorization: Bearer $(cat token.txt)" http://localhost:3000/api/auth/me
```

---

### Issue: "No refresh token available" message

**Cause**: Refresh token was cleared or never saved

**Solution**:
1. Re-login to get new refresh token
2. Verify AsyncStorage `saveRefreshToken()` is called in login
3. Check backend is returning `refreshToken` in response

---

### Issue: Token refresh happens too frequently

**Cause**: Buffer time (300s) is too aggressive

**Solution**:
1. Increase buffer in `isTokenExpiringSoon()` call
2. Increase interval between checks (currently 60s)
3. Monitor: Should only see refresh every 10 minutes for 15-min access tokens

---

### Issue: Infinite 401 loop

**Cause**: Refresh token is also expired or invalid

**Solution**:
1. Check `_retry` flag is present in response interceptor
2. Verify refresh endpoint returns valid token
3. Check backend token generation is correct

---

## Test Success Criteria

- ✅ User can login and tokens are stored
- ✅ Authorization header is added to all API requests
- ✅ Proactive refresh occurs every 10 minutes
- ✅ Reactive refresh occurs on 401 (auto-retry)
- ✅ Logout revokes tokens on backend
- ✅ Session expires after 7 days of inactivity
- ✅ Expired refresh token forces re-login
- ✅ User can logout and cannot access API afterward
- ✅ Multiple concurrent requests don't break refresh flow
- ✅ Console shows expected debug messages

---

**Status**: Ready for Testing
**Test Account**: test-auth@simplix.local / Test123!Abc
**Test Environment**: localhost:3000/api
