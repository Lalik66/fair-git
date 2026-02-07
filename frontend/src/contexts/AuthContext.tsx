import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'vendor' | 'user';
  preferredLanguage: string;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  // Helper to apply user's language preference
  const applyUserLanguage = (preferredLanguage: string) => {
    if (preferredLanguage && ['az', 'en'].includes(preferredLanguage)) {
      i18n.changeLanguage(preferredLanguage);
      localStorage.setItem('language', preferredLanguage);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const { user: currentUser } = await authApi.getMe();
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
          // Apply user's language preference from database
          applyUserLanguage(currentUser.preferredLanguage);
        } catch (err) {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { token, user: loggedInUser } = await authApi.login(email, password);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      // Apply user's language preference from database after login
      applyUserLanguage(loggedInUser.preferredLanguage);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with a JWT token (used for OAuth callback)
   * The token is received from the OAuth redirect URL
   */
  const loginWithToken = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      // Store token first so the API can use it
      localStorage.setItem('token', token);

      // Fetch user data using the token
      const { user: currentUser } = await authApi.getMe();

      // Store user data
      localStorage.setItem('user', JSON.stringify(currentUser));
      setUser(currentUser);

      // Apply user's language preference
      applyUserLanguage(currentUser.preferredLanguage);
    } catch (err: any) {
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const errorMessage = err.response?.data?.error || 'OAuth login failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginWithToken, logout, clearError, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
