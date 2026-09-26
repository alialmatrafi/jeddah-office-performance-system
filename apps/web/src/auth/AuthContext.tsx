import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiResponse, UserView } from '@jeddah/shared';
import { apiRequest, getErrorMessage, setToken } from '../api/client';

interface LoginResult {
  token: string;
  user: UserView;
}

interface AuthContextValue {
  user: UserView | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem('jeddah-office-token');
    if (!token) {
      setLoading(false);
      return undefined;
    }
    apiRequest<ApiResponse<UserView>>('/auth/me')
      .then((response) => {
        if (active) {
          setUser(response.data);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setToken(null);
          setUser(null);
          if (error instanceof Error && error.message) {
            setUser(null);
          }
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiRequest<ApiResponse<LoginResult>>('/auth/login', {
      method: 'POST',
      body: { username, password },
      token: null,
    });
    setToken(response.data.token);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export { getErrorMessage };
