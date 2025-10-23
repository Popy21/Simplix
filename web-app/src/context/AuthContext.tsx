import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { authService } from '../services/api';
import { isTokenExpiringSoon, getTokenRemainingTime } from '../utils/tokenManager';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  team_id?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Proactively refresh token before expiration (every 60 seconds check)
  useEffect(() => {
    if (!token) return;

    const tokenRefreshInterval = setInterval(async () => {
      try {
        // Check if token is expiring soon (within 5 minutes)
        if (isTokenExpiringSoon(token, 300)) {
          const refreshToken = await storage.getRefreshToken();
          
          if (!refreshToken) {
            console.warn('Token expiring soon but no refresh token available');
            return;
          }

          // Refresh the token
          const response = await authService.refresh(refreshToken);
          const { token: newToken, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          const tokenToUse = newAccessToken || newToken;

          // Update stored tokens
          await storage.saveToken(tokenToUse);
          if (newRefreshToken) {
            await storage.saveRefreshToken(newRefreshToken);
          }

          // Update state
          setToken(tokenToUse);
          console.log('Token proactively refreshed');
        }
      } catch (error) {
        console.error('Error proactively refreshing token:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(tokenRefreshInterval);
  }, [token]);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        storage.getToken(),
        storage.getUser(),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);

        // Verify token is still valid
        try {
          const response = await authService.me();
          setUser(response.data);
        } catch (error) {
          // Token expired or invalid, clear auth
          await storage.clearAuth();
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      const { token: newToken, refreshToken: newRefreshToken, user: newUser } = response.data;

      await Promise.all([
        storage.saveToken(newToken),
        storage.saveRefreshToken(newRefreshToken),
        storage.saveUser(newUser),
      ]);

      setToken(newToken);
      setUser(newUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authService.register({ email, password, name });
      const { token: newToken, refreshToken: newRefreshToken, user: newUser } = response.data;

      await Promise.all([
        storage.saveToken(newToken),
        storage.saveRefreshToken(newRefreshToken),
        storage.saveUser(newUser),
      ]);

      setToken(newToken);
      setUser(newUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      // Call API to revoke refresh tokens on server
      try {
        await authService.logout();
      } catch (error) {
        // If logout fails, still clear local auth
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      await authService.changePassword({ currentPassword, newPassword });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to change password');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
