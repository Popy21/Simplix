# 🔐 JWT Authentication Guide

## Overview

The Simplix CRM uses JWT (JSON Web Tokens) for secure API authentication with refresh token rotation strategy.

## Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

**Security Tips:**
- Use strong, random secrets (min 32 characters)
- Keep secrets in `.env` file (never commit)
- Rotate secrets regularly in production
- Use different secrets for access and refresh tokens

## API Endpoints

### 1. Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!@#",
  "name": "John Doe"
}

Response (201):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt-token"
}
```

### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!@#"
}

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "organization_id": "org-uuid"
  },
  "accessToken": "short-lived-jwt",
  "refreshToken": "long-lived-jwt",
  "expiresIn": 900
}
```

### 3. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "long-lived-jwt"
}

Response (200):
{
  "accessToken": "new-short-lived-jwt",
  "refreshToken": "new-long-lived-jwt",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### 4. Get Current User
```http
GET /api/auth/me
Authorization: Bearer <accessToken>

Response (200):
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "organization_id": "org-uuid",
  "created_at": "2025-10-22T10:00:00Z",
  "updated_at": "2025-10-22T10:00:00Z"
}
```

### 5. Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "OldPass123!@#",
  "newPassword": "NewPass456!@#"
}

Response (200):
{
  "message": "Password updated successfully",
  "timestamp": "2025-10-22T10:00:00Z"
}
```

### 6. Logout
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>

Response (200):
{
  "message": "Logged out successfully"
}
```

### 7. Validate Password
```http
POST /api/auth/validate-password
Content-Type: application/json

{
  "password": "TestPass123!@#"
}

Response (200):
{
  "isValid": true,
  "strength": "strong",
  "criteria": {
    "minLength": true,
    "hasUpperCase": true,
    "hasLowerCase": true,
    "hasNumbers": true,
    "hasSpecialChars": true
  },
  "errors": [],
  "isCommonPassword": false,
  "warning": null
}
```

## Frontend Implementation

### Using the Token Manager

```typescript
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  isTokenExpired,
} from '@/utils/tokenManager';

// Check if access token is expired
if (isTokenExpired(accessToken)) {
  // Refresh the token
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  const { accessToken: newToken } = await response.json();
}

// Verify token before using it
const decoded = verifyAccessToken(accessToken);
if (!decoded) {
  // Token is invalid, redirect to login
}
```

### Axios Interceptor Setup

```typescript
// api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        
        await AsyncStorage.setItem('accessToken', response.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        // Redirect to login screen
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Security Best Practices

### 1. **Token Storage**
- ✅ Use secure storage (AsyncStorage, Keychain for React Native)
- ❌ Never store tokens in localStorage (XSS vulnerability)
- ❌ Never store tokens in plain cookies (CSRF vulnerability)

### 2. **Token Transmission**
- ✅ Always use HTTPS
- ✅ Use Authorization: Bearer header
- ✅ Validate token signature on backend

### 3. **Token Expiration**
- ✅ Short expiry for access tokens (15 minutes)
- ✅ Longer expiry for refresh tokens (7 days)
- ✅ Implement automatic refresh before expiry

### 4. **Token Revocation**
- ✅ Store refresh tokens in database
- ✅ Revoke tokens on logout
- ✅ Revoke tokens on password change
- ✅ Check token revocation status on refresh

### 5. **Multi-tenancy**
- ✅ Include organization_id in token payload
- ✅ Verify organization_id in all API calls
- ✅ Isolate data by organization

## Password Requirements

Passwords must meet these criteria:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)
- Not a common password

## Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 200 | Success | Request successful |
| 201 | Created | User created successfully |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Invalid credentials or expired token |
| 403 | Forbidden | User not authorized for resource |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

## Token Payload Structure

```typescript
{
  id: string;           // User ID (UUID)
  email: string;        // User email
  role: string;         // User role (admin, manager, user, etc.)
  organization_id?: string;  // Organization ID for multi-tenancy
  iat: number;          // Issued at timestamp
  exp: number;          // Expiration timestamp
}
```

## Troubleshooting

### "Invalid token"
- Check token expiration with `isTokenExpired()`
- Verify token format (Bearer prefix)
- Check JWT_SECRET matches on frontend and backend

### "User not found"
- User was deleted
- User account was deactivated
- Wrong organization context

### "Token refresh failed"
- Refresh token expired (regenerate new pair with login)
- Refresh token was revoked
- User no longer exists

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#"
  }'

# Use token
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'
```

## Migration Guide

### From Old Token System to JWT

1. Run migration: `006_jwt_tokens.sql`
2. Update `.env` with JWT secrets
3. Deploy auth routes update
4. Update frontend to use new token format
5. Implement refresh token logic on frontend

## References

- [JWT.io](https://jwt.io)
- [Express JWT](https://github.com/auth0/express-jwt)
- [Password Strength Checker](./passwordValidator.ts)
