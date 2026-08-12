import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { apiRequest, setAuthToken, getAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupFirstAdmin: (data: any) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      setLoading(true);
      // First check if first admin setup is needed
      const setupRes = await apiRequest<{ needsFirstAdmin: boolean }>('/auth/setup-status');
      setNeedsSetup(setupRes.needsFirstAdmin);

      if (!setupRes.needsFirstAdmin && getAuthToken()) {
        const meRes = await apiRequest<{ user: User }>('/auth/me');
        setUser(meRes.user);
      } else if (setupRes.needsFirstAdmin) {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuthToken(res.token);
    setUser(res.user);
    setNeedsSetup(false);
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
  };

  const setupFirstAdmin = async (data: any) => {
    const res = await apiRequest<{ user: User; token: string }>('/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setAuthToken(res.token);
    setUser(res.user);
    setNeedsSetup(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsSetup,
        login,
        logout,
        setupFirstAdmin,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
