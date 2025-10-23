export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  organization_id?: string;
  iat: number;
  exp: number;
}

/**
 * Decode JWT token without verification (for client-side use only)
 * JWT format: header.payload.signature
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    if (!token || typeof token !== 'string') return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode payload (second part)
    const payload = parts[1];
    
    // Add padding if needed
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    
    // Decode base64url to string
    const decoded = atob(padded);
    
    // Parse JSON
    return JSON.parse(decoded) as DecodedToken;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    // Convert exp (seconds) to milliseconds and compare with current time
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};

/**
 * Check if token will expire soon (within bufferSeconds)
 * Used for proactive refresh before expiration
 */
export const isTokenExpiringSoon = (token: string, bufferSeconds = 300): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Date.now();
    const expiresAt = decoded.exp * 1000;
    const bufferMs = bufferSeconds * 1000;
    
    // Token expires soon if less than buffer time remains
    return (expiresAt - now) < bufferMs;
  } catch (error) {
    return true;
  }
};

/**
 * Get remaining time in seconds before token expires
 */
export const getTokenRemainingTime = (token: string): number => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    
    const remainingMs = decoded.exp * 1000 - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  } catch (error) {
    return 0;
  }
};

/**
 * Validate token structure
 * JWT should have 3 parts separated by dots
 */
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Extract claims from token without verification
 */
export const getTokenClaims = (token: string): DecodedToken | null => {
  return decodeToken(token);
};

/**
 * Get token expiry as Date object
 */
export const getTokenExpiryDate = (token: string): Date | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Get time until token expires in human-readable format
 */
export const formatTokenExpiry = (token: string): string => {
  const seconds = getTokenRemainingTime(token);
  
  if (seconds <= 0) return 'Expired';
  
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  
  return `${seconds}s`;
};
