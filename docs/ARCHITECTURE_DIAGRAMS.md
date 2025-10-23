# JWT Authentication Architecture Diagrams

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SIMPLIX CRM SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐                   ┌──────────────────┐    │
│  │   MOBILE APP     │                   │   WEB CLIENT     │    │
│  │  (React Native)  │                   │   (React)        │    │
│  └────────┬─────────┘                   └────────┬─────────┘    │
│           │                                       │                │
│           └───────────────────┬───────────────────┘                │
│                               │                                    │
│                    ┌──────────▼──────────┐                        │
│                    │  Axios Interceptors  │                        │
│                    ├──────────────────────┤                        │
│                    │ ✅ Request: Add Token │                      │
│                    │ ✅ Response: 401+Retry│                      │
│                    └──────────┬───────────┘                        │
│                               │                                    │
│                    ┌──────────▼──────────┐                        │
│                    │   Auth Context      │                        │
│                    ├──────────────────────┤                        │
│                    │ • Login/Register     │                        │
│                    │ • Logout             │                        │
│                    │ • Proactive Refresh  │                        │
│                    │ • State Management   │                        │
│                    └──────────┬───────────┘                        │
│                               │                                    │
│                    ┌──────────▼──────────┐                        │
│                    │ AsyncStorage         │                        │
│                    ├──────────────────────┤                        │
│                    │ • accessToken        │                        │
│                    │ • refreshToken       │                        │
│                    │ • user data          │                        │
│                    └──────────┬───────────┘                        │
│                               │                                    │
└───────────────────────────────┼────────────────────────────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │  BACKEND API (Express.js)  │
                 ├──────────────────────────────┤
                 │                              │
                 │  Routes:                     │
                 │  • /auth/login               │
                 │  • /auth/register            │
                 │  • /auth/refresh (NEW)       │
                 │  • /auth/logout (NEW)        │
                 │  • /customers, /deals, etc.  │
                 │                              │
                 │  Middleware:                 │
                 │  • JWT Verification          │
                 │  • Role Authorization        │
                 │  • Org Validation            │
                 │                              │
                 └──────────────┬───────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │   PostgreSQL Database        │
                 ├──────────────────────────────┤
                 │ • users                      │
                 │ • refresh_tokens (revoke)    │
                 │ • organizations              │
                 │ • other CRM tables           │
                 └──────────────────────────────┘
```

---

## 2. Authentication Flow Sequence

```
USER                    FRONTEND                API              DB
 │                         │                     │               │
 │ Enter credentials        │                     │               │
 ├────────────────────────>│                     │               │
 │                         │                     │               │
 │                    POST /auth/login           │               │
 │                         ├────────────────────>│               │
 │                         │                     │               │
 │                         │              Check credentials      │
 │                         │              Generate token pair    │
 │                         │                     ├──────────────>│
 │                         │                     │<──────────────┤
 │                         │<────────────────────┤               │
 │                         │ {accessToken,       │               │
 │                         │  refreshToken,      │               │
 │                         │  user}              │               │
 │                         │                     │               │
 │                    Save to AsyncStorage       │               │
 │                         │                     │               │
 │ Dashboard loaded  <──────┤                     │               │
 │                         │                     │               │
 │ Click "Get Customers"   │                     │               │
 ├────────────────────────>│                     │               │
 │                         │                     │               │
 │                    Request Interceptor        │               │
 │                    Get token from storage     │               │
 │                    Add Authorization header   │               │
 │                         │                     │               │
 │                    GET /api/customers         │               │
 │                    Authorization: Bearer ...  │               │
 │                         ├────────────────────>│               │
 │                         │                     │               │
 │                         │              Validate token        │
 │                         │              Get org context        │
 │                         │                     ├──────────────>│
 │                         │ Query customers     │<──────────────┤
 │                         │                     │               │
 │                         │<────────────────────┤               │
 │<────────────────────────┤ [customers...]      │               │
 │                         │                     │               │
 │ (Later: token expires)  │                     │               │
 │                         │                     │               │
 │ Click "Get Products"    │                     │               │
 ├────────────────────────>│                     │               │
 │                         │                     │               │
 │                    GET /api/products          │               │
 │                    (with expired token)       │               │
 │                         ├────────────────────>│               │
 │                         │                     │               │
 │                         │           401 Unauthorized          │
 │                         │<────────────────────┤               │
 │                         │                     │               │
 │                    Response Interceptor       │               │
 │                    Catch 401                  │               │
 │                    POST /auth/refresh         │               │
 │                         ├────────────────────>│               │
 │                         │ (refreshToken)      │               │
 │                         │                     │               │
 │                         │           Verify refreshToken      │
 │                         │           Generate new pair        │
 │                         │                     ├──────────────>│
 │                         │                     │<──────────────┤
 │                         │<────────────────────┤               │
 │                         │ {newAccessToken}    │               │
 │                         │                     │               │
 │                    Save new tokens            │               │
 │                    Retry original request     │               │
 │                    GET /api/products          │               │
 │                         ├────────────────────>│               │
 │                         │ (with new token)    │               │
 │                         │                     │               │
 │                         │                  200 OK             │
 │                         │<────────────────────┤               │
 │<────────────────────────┤ [products...]       │               │
 │                         │                     │               │
 │ Click Logout            │                     │               │
 ├────────────────────────>│                     │               │
 │                         │                     │               │
 │                    POST /auth/logout          │               │
 │                         ├────────────────────>│               │
 │                         │                     │               │
 │                         │           Revoke refreshToken      │
 │                         │                     ├──────────────>│
 │                         │                     │<──────────────┤
 │                         │           Clear from DB             │
 │                         │<────────────────────┤               │
 │                         │                     │               │
 │                    Clear all local storage    │               │
 │ Redirect to Login <─────┤                     │               │
 │                         │                     │               │
```

---

## 3. Token Refresh Mechanisms

### Proactive Refresh (Every 60 Seconds)

```
ProactiveRefresh Effect
│
└─> setInterval(60000ms)  // Every 60 seconds
    │
    └─> Check: isTokenExpiringSoon(token, 300s)?
        │
        ├─> YES: Token expires in next 5 minutes
        │   │
        │   └─> GET refreshToken from storage
        │       │
        │       └─> authService.refresh(refreshToken)
        │           │
        │           └─> POST /auth/refresh
        │               │
        │               ├─> Backend verifies refreshToken
        │               ├─> Generates new token pair
        │               └─> Returns {accessToken, refreshToken}
        │
        │               storage.saveToken(newToken)
        │               storage.saveRefreshToken(newRefreshToken)
        │               setToken(newToken)
        │
        │               Console: "Token proactively refreshed"
        │
        │
        └─> NO: Token still valid
            │
            └─> No action, check again in 60 seconds
```

### Reactive Refresh (On 401 Error)

```
API Request Returns 401
│
└─> Response Interceptor catches 401
    │
    ├─> Check: _retry flag set?
    │   │
    │   └─> NO: First 401 attempt
    │       │
    │       ├─> Set originalRequest._retry = true
    │       │
    │       ├─> GET refreshToken from storage
    │       │
    │       ├─> IF refreshToken exists:
    │       │   │
    │       │   └─> authService.refresh(refreshToken)
    │       │       │
    │       │       └─> POST /auth/refresh
    │       │           │
    │       │           ├─> Backend validates & generates new token
    │       │           └─> Returns {accessToken, refreshToken}
    │       │
    │       │       storage.saveToken(newAccessToken)
    │       │       originalRequest.headers.Authorization = 
    │       │         "Bearer " + newAccessToken
    │       │
    │       │       RETURN api(originalRequest)  // Retry
    │       │
    │       │       ✅ Original request now succeeds
    │       │
    │       └─> ELSE: No refresh token
    │           │
    │           └─> storage.clearAuth()
    │               RETURN Promise.reject(error)
    │
    │
    └─> YES: Already retried once
        │
        └─> Prevent infinite loop
            │
            ├─> storage.clearAuth()
            └─> RETURN Promise.reject(error)
                │
                └─> User logged out, redirect to login
```

---

## 4. Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     App.tsx (Top Level)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ AuthProvider (Context)                                 │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │                                                          │     │
│  │ State:                      Effects:                   │     │
│  │ • user                      • loadStoredAuth (mount)   │     │
│  │ • token                     • tokenRefresh (every 60s) │     │
│  │ • isLoading                                            │     │
│  │ • isAuthenticated           Methods:                   │     │
│  │                             • login()                  │     │
│  │ Functions:                  • register()               │     │
│  │ • login(email, pwd)         • logout()                 │     │
│  │ • register(...)             • changePassword()         │     │
│  │ • logout()                                             │     │
│  │ • changePassword(...)                                  │     │
│  │                                                          │     │
│  └─────────────────────────────┬──────────────────────────┘     │
│                                │                                  │
│                    ┌───────────▼───────────┐                    │
│                    │ All Child Components  │                    │
│                    │                       │                    │
│                    │ useAuth() to access:  │                    │
│                    │ • user                │                    │
│                    │ • token               │                    │
│                    │ • isAuthenticated     │                    │
│                    │ • login()             │                    │
│                    │ • logout()            │                    │
│                    │ • changePassword()    │                    │
│                    │                       │                    │
│                    └───────────┬───────────┘                    │
│                                │                                  │
│              ┌─────────────────┼─────────────────┐               │
│              │                 │                 │               │
│          ┌───▼───┐         ┌───▼───┐        ┌───▼────┐          │
│          │Login  │         │ Home  │        │Settings│          │
│          │Screen │         │Screen │        │ Screen │          │
│          └───────┘         └───────┘        └────────┘          │
│                                                                   │
│  Shared across all components:                                  │
│  ┌─────────────────────────────────────┐                        │
│  │ Axios Interceptors (api.ts)         │                        │
│  │ • Request: Add Authorization header │                        │
│  │ • Response: Handle 401 + refresh    │                        │
│  └─────────────────────────────────────┘                        │
│                                                                   │
│  ┌─────────────────────────────────────┐                        │
│  │ AsyncStorage (storage.ts)            │                        │
│  │ • Persist tokens                     │                        │
│  │ • Persist user data                  │                        │
│  └─────────────────────────────────────┘                        │
│                                                                   │
│  ┌─────────────────────────────────────┐                        │
│  │ Token Utilities (tokenManager.ts)    │                        │
│  │ • Decode JWT                         │                        │
│  │ • Check expiration                   │                        │
│  │ • Format display                     │                        │
│  └─────────────────────────────────────┘                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow: Token Through System

```
GENERATION
────────────────────────────────────────────────────────────────

Backend (tokenManager.ts):
┌──────────────┐
│ generateToken│
│              │
│ Generate:    │
│ • Header     │
│ • Payload    │
│   - iss      │
│   - sub      │
│   - email    │
│   - role     │
│   - org_id   │
│   - exp      │
│   - iat      │
│ • Signature  │
│              │
│ Result:      │
│ header.      │
│ payload.     │
│ signature    │
└──────────────┘


STORAGE
────────────────────────────────────────────────────────────────

Frontend (storage.ts):
                    AsyncStorage
┌─────────────┐    ┌─────────────────────────────────────┐
│ accessToken │───>│ KEY: "accessToken"                  │
│             │    │ VALUE: "eyJ0eXAi..."                │
└─────────────┘    └─────────────────────────────────────┘

┌─────────────┐    ┌─────────────────────────────────────┐
│refreshToken │───>│ KEY: "refreshToken"                 │
│             │    │ VALUE: "eyJ0eXAi..."                │
└─────────────┘    └─────────────────────────────────────┘

┌─────────────┐    ┌─────────────────────────────────────┐
│ user data   │───>│ KEY: "user"                         │
│             │    │ VALUE: {id, email, name, role, ...} │
└─────────────┘    └─────────────────────────────────────┘


TRANSMISSION
────────────────────────────────────────────────────────────────

Request Interceptor:
┌──────────────────────────────────────┐
│ GET /api/customers                   │
│ Headers:                             │
│   Content-Type: application/json     │
│   Authorization: Bearer eyJ0eXAi...  │ ← Added by interceptor
└──────────────────────────────────────┘
        │
        ▼
   ┌─────────────────────┐
   │  Network Transfer   │
   │  (HTTPS encrypted)  │
   └─────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ Backend Receives Request             │
│ Headers:                             │
│   Authorization: Bearer eyJ0eXAi...  │
└──────────────────────────────────────┘


VALIDATION
────────────────────────────────────────────────────────────────

Backend (middleware/auth.ts):
┌─────────────────────────────────┐
│ 1. Extract token from header    │
│    Authorization: Bearer XXX    │ → Extract "XXX"
│                                 │
│ 2. Validate format (3 parts)    │
│    XXX.XXX.XXX ✓               │
│                                 │
│ 3. Verify signature             │
│    Using SECRET_KEY             │
│    ✓ Valid signature            │
│                                 │
│ 4. Check expiration             │
│    exp > Date.now() ✓          │
│                                 │
│ 5. Verify user exists           │
│    User ID in DB? ✓            │
│                                 │
│ 6. Extract context              │
│    org_id = payload.org_id      │
│                                 │
│ 7. Proceed to route handler     │
└─────────────────────────────────┘
        │
        ▼ VALID
   ┌─────────────────────┐
   │ Execute route       │
   │ handler/controller  │
   └─────────────────────┘
        │
        ▼
   ┌─────────────────────┐
   │ Return 200 OK       │
   │ with data           │
   └─────────────────────┘


EXPIRATION
────────────────────────────────────────────────────────────────

Access Token: 15 minutes
┌──────────────────────────────────┐
│ Token Generated: 14:00:00         │
│ Token Expires: 14:15:00          │
│                                  │
│ 14:14:30 → Proactive refresh ✓   │
│           (5 min before expiry)   │
│                                  │
│ New Token:  14:14:30 → 14:29:30  │
└──────────────────────────────────┘

Refresh Token: 7 days
┌──────────────────────────────────┐
│ Token Generated: Mon 14:00        │
│ Token Expires: Mon next week 14:00│
│                                  │
│ If not refreshed:                │
│ After 7 days → Automatic logout  │
│ Force re-login required          │
└──────────────────────────────────┘


REVOCATION (On Logout)
────────────────────────────────────────────────────────────────

┌────────────────────────────┐
│ User clicks Logout         │
└────────┬───────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ POST /auth/logout                 │
    │ • Body: { refreshToken }          │
    └────┬──────────────────────────────┘
         │
         ▼ Backend
    ┌────────────────────────────────────────────┐
    │ Find refresh_tokens entry with token       │
    │ Set: revoked_at = NOW()                    │
    │ Set: revoked = true                        │
    │                                            │
    │ Save to Database                           │
    └────┬───────────────────────────────────────┘
         │
         ▼ Frontend
    ┌────────────────────────────────────────────┐
    │ AsyncStorage.removeItem('accessToken')     │
    │ AsyncStorage.removeItem('refreshToken')    │
    │ AsyncStorage.removeItem('user')            │
    │                                            │
    │ AuthContext: setToken(null)                │
    │ AuthContext: setUser(null)                 │
    └────┬───────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────┐
    │ Redirect to LoginScreen                    │
    │                                            │
    │ ✓ Token revoked in DB                      │
    │ ✓ Token cleared from device                │
    │ ✓ User logged out completely               │
    └────────────────────────────────────────────┘
```

---

## 6. Error Handling Flow

```
REQUEST FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API Request
    │
    ▼
Request Interceptor
    │
    ├─> Get token from storage
    │   ├─> Success: Add to Authorization header
    │   └─> Error: Log error, send without token
    │
    ├─> Network Error
    │   └─> Propagate to caller
    │
    └─> Send request


RESPONSE FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Response Received
    │
    ├─> Status 200-399: SUCCESS
    │   │
    │   └─> Return response to caller ✓
    │
    ├─> Status 400-500: ERROR
    │   │
    │   ├─> Status 401: UNAUTHORIZED
    │   │   │
    │   │   └─> Response Interceptor catches
    │   │       │
    │   │       ├─> Check _retry flag
    │   │       │
    │   │       ├─> NO (First attempt)
    │   │       │   │
    │   │       │   ├─> Set _retry = true
    │   │       │   │
    │   │       │   ├─> Get refreshToken
    │   │       │   │   │
    │   │       │   │   ├─> Found: Call authService.refresh()
    │   │       │   │   │   │
    │   │       │   │   │   ├─> POST /auth/refresh
    │   │       │   │   │   │
    │   │       │   │   │   ├─> SUCCESS: Got new token pair
    │   │       │   │   │   │   │
    │   │       │   │   │   │   ├─> Update storage
    │   │       │   │   │   │   ├─> Update request headers
    │   │       │   │   │   │   └─> Retry api(originalRequest)
    │   │       │   │   │   │
    │   │       │   │   │   └─> FAILURE: Refresh endpoint error
    │   │       │   │   │       │
    │   │       │   │   │       ├─> Clear auth
    │   │       │   │   │       └─> Reject promise
    │   │       │   │   │
    │   │       │   │   └─> Not Found: No refresh token
    │   │       │   │       │
    │   │       │   │       ├─> Clear auth
    │   │       │   │       └─> Reject promise
    │   │       │
    │   │       └─> YES (Already retried)
    │   │           │
    │   │           ├─> Prevent infinite loop
    │   │           ├─> Clear auth
    │   │           └─> Reject promise
    │   │
    │   └─> Other Status (400, 403, 500, etc.)
    │       │
    │       └─> Return error to caller
    │
    └─> Network Error
        │
        └─> Reject promise


FINAL OUTCOME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ✓ SUCCESS
    ├─> Data returned to component
    └─> Component renders with data

    ✗ FAILURE
    ├─> Temporary (network error)
    │   └─> Caller handles with retry UI
    │
    ├─> Auth Required (401 non-recoverable)
    │   ├─> Auth cleared
    │   ├─> User redirected to login
    │   └─> Previous action lost
    │
    └─> Server Error (500, etc.)
        └─> Error message shown to user
```

---

## 7. State Machine: User Authentication States

```
                        ┌─────────────┐
                        │  NOT LOGGED │
                        │    IN       │
                        └──────┬──────┘
                               │
                    ┌──────────▼──────────┐
                    │ Show Login Screen   │
                    │ Input: email, pwd   │
                    └──────────┬──────────┘
                               │
                   ┌───────────▼──────────┐
                   │ Call POST /register  │
                   │ or POST /login       │
                   └───────────┬──────────┘
                               │
                   ┌───────────▼──────────┐
                   │ Check Credentials    │
                   └───────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
         ┌──────▼──────┐            ┌────────▼──────┐
         │ INVALID     │            │ VALID         │
         │ • Wrong pwd │            │ • User found  │
         │ • No user   │            │ • Match ok    │
         └──────┬──────┘            └────────┬──────┘
                │                            │
         Error! │                    Generate │ Tokens
                │                    Store    │
                │                            │
         ┌──────▼──────────────────────────────────┐
         │      LOGGED IN                           │
         │      • token in state                    │
         │      • refreshToken in storage           │
         │      • user data available               │
         │      • proactive refresh running         │
         └──────┬──────────────────────────────────┘
                │
        ┌───────▼─────────┐
        │ Make API calls  │
        │ (token added)   │
        └───────┬─────────┘
                │
        ┌───────▴─────────────────────────┐
        │                                 │
   ┌────▼────┐               ┌───────────▼────┐
   │ 200 OK  │               │ 401 Expired    │
   │ ✓ Data │               │ Attempt refresh│
   └────┬────┘               └────────┬────────┘
        │                            │
        ├─────┬──────────────────┬───┤
        │     │                  │   │
   ┌────▼─────▼──────┐      ┌────▼──▼──┐
   │ Render Data     │      │ Refresh   │
   │ Proactive       │      │ attempt   │
   │ refresh cycles  │      └────┬──────┘
   └────┬────────────┘           │
        │                ┌───────▴────────┐
        │                │                │
        │           ┌────▼────┐      ┌───▴───┐
        │           │ SUCCESS │      │FAILURE│
        │           │ ✓ Retry │      │ LOGOUT│
        │           │ original│      │ Redir │
        │           └────┬────┘      │ login │
        │                │           └───────┘
        │           ┌────▼────┐
        │           │ 200 OK  │
        │           │ ✓ Data  │
        │           └────┬────┘
        │                │
        │        ┌───────▴────────┐
        │        │ Resume normal  │
        │        │ operation      │
        └────────┼────────────────┘
                 │
        ┌────────▴──────────┐
        │ User clicks      │
        │ Logout button    │
        └────────┬──────────┘
                 │
        ┌────────▴──────────────┐
        │ POST /auth/logout     │
        │ Revoke token in DB    │
        │ Clear from device     │
        └────────┬──────────────┘
                 │
        ┌────────▴──────────┐
        │ Redirect to       │
        │ LoginScreen       │
        └────────┬──────────┘
                 │
        ┌────────▴──────────┐
        │ NOT LOGGED IN     │
        │ (Back to start)   │
        └───────────────────┘
```

---

These diagrams visualize:
- System architecture
- Complete authentication sequence
- Token refresh mechanisms (both types)
- Component structure and data flow
- Complete token lifecycle
- Comprehensive error handling
- Authentication state machine

Refer back to these diagrams when understanding the implementation flow or explaining to team members.
