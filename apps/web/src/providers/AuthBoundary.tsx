import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserRole, PermissionKey } from '@crm/types';
import { apiClient } from '../lib/api-client';
import { queryClient } from '../lib/query-client';
import { LoginPage } from '../pages/LoginPage';
import { Loader2 } from 'lucide-react';

export type AuthStatus = 'AUTH_CHECKING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface AuthUserProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string | null;
  role: UserRole;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  lockedOut?: boolean;
  attemptsRemaining?: number;
}

interface AuthContextValue {
  user: AuthUserProfile | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  authStatus: AuthStatus;
  isInitialCheckDone: boolean;
  hasPermission: (permission: PermissionKey | string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  login: (username: string, password: string, challengeId: string, captcha: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setUserProfile: (data: { user: AuthUserProfile; permissions: string[] }) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  authStatus: 'AUTH_CHECKING',
  isInitialCheckDone: false,
  hasPermission: () => false,
  hasRole: () => false,
  login: async () => ({ success: false, error: 'Auth not initialized' }),
  logout: async () => {},
  setUserProfile: () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('crm_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.user || parsed;
        }
      }
    } catch {}
    return null;
  });

  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('crm_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed.permissions) ? parsed.permissions : ['*'];
        }
      }
    } catch {}
    return [];
  });

  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('crm_user');
        if (saved) return 'AUTHENTICATED';
      }
    } catch {}
    return 'AUTH_CHECKING';
  });

  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

  /**
   * Strictly verifies authenticated session with the backend server (/api/v1/auth/me).
   * Uses cached session optimistically and validates in background.
   */
  const checkAuth = useCallback(async () => {
    try {
      const response = await apiClient.get<{ user: AuthUserProfile; permissions: string[] }>('/auth/me');
      if (response && response.success && response.data?.user) {
        setUser(response.data.user);
        setPermissions(Array.isArray(response.data.permissions) ? response.data.permissions : ['*']);
        setAuthStatus('AUTHENTICATED');
        try {
          localStorage.setItem(
            'crm_user',
            JSON.stringify({ user: response.data.user, permissions: response.data.permissions || ['*'] })
          );
        } catch {}
        return;
      }

      // No valid user in response -> Unauthenticated
      setUser(null);
      setPermissions([]);
      setAuthStatus('UNAUTHENTICATED');
      try {
        localStorage.removeItem('crm_user');
        localStorage.removeItem('crm_session_token');
      } catch {}
    } catch (err: any) {
      // If 401 or explicitly unauthorized, clear session
      const isUnauthorized = err?.status === 401 || err?.code === 'UNAUTHORIZED';
      if (isUnauthorized) {
        setUser(null);
        setPermissions([]);
        setAuthStatus('UNAUTHENTICATED');
        try {
          localStorage.removeItem('crm_user');
          localStorage.removeItem('crm_session_token');
        } catch {}
      } else {
        // Transient network glitch: keep cached session if present, otherwise set unauthenticated
        try {
          const cached = localStorage.getItem('crm_user');
          if (!cached) {
            setAuthStatus('UNAUTHENTICATED');
          }
        } catch {
          setAuthStatus('UNAUTHENTICATED');
        }
      }
    } finally {
      setIsInitialCheckDone(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setPermissions([]);
      setAuthStatus('UNAUTHENTICATED');
      try {
        localStorage.removeItem('crm_user');
        localStorage.removeItem('crm_session_token');
      } catch {}
      queryClient.clear();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  /**
   * Server authentication dispatch.
   */
  const login = async (
    username: string,
    password: string,
    challengeId: string,
    captcha: string
  ): Promise<LoginResult> => {
    try {
      const response = await apiClient.post<any>('/auth/login', {
        username: username.trim(),
        password,
        challengeId,
        captcha,
        captchaAnswer: captcha,
      });

      const payload = response?.data?.data || response?.data;

      if (payload && payload.user) {
        setUser(payload.user);
        setPermissions(Array.isArray(payload.permissions) ? payload.permissions : ['*']);
        setAuthStatus('AUTHENTICATED');
        try {
          localStorage.setItem(
            'crm_user',
            JSON.stringify({ user: payload.user, permissions: payload.permissions || ['*'] })
          );
          const token = payload.token || payload.sessionId;
          if (token) {
            localStorage.setItem('crm_session_token', token);
          }
        } catch {}
        return { success: true };
      }

      return {
        success: false,
        error: 'Invalid username, password, or verification code.',
      };
    } catch (err: any) {
      const isLockedOut =
        err?.code === 'ACCOUNT_LOCKED' ||
        err?.code === 'AUTH_LOCKED_OUT' ||
        err?.message?.includes?.('locked') ||
        err?.message?.includes?.('Too many');
      const attemptsRemaining = err?.remainingAttempts;

      return {
        success: false,
        error: err?.message || 'Invalid username, password, or verification code.',
        lockedOut: isLockedOut,
        attemptsRemaining,
      };
    }
  };

  /**
   * Session termination: Invalidate server session, clear cookies, and reset auth state.
   */
  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network error during logout
    } finally {
      setUser(null);
      setPermissions([]);
      setAuthStatus('UNAUTHENTICATED');
      try {
        localStorage.removeItem('crm_user');
        localStorage.removeItem('crm_session_token');
      } catch {}
      queryClient.clear();
    }
  };

  const setUserProfile = (data: { user: AuthUserProfile; permissions: string[] }) => {
    setUser(data.user);
    setPermissions(data.permissions);
    setAuthStatus('AUTHENTICATED');
    try {
      localStorage.setItem('crm_user', JSON.stringify(data));
    } catch {}
  };

  const isAuthenticated = authStatus === 'AUTHENTICATED' && user !== null;
  const isLoading = authStatus === 'AUTH_CHECKING';

  const hasPermission = (permission: PermissionKey | string): boolean => {
    if (!isAuthenticated || !user) return false;
    if (user.role === 'Super Admin' || permissions.includes('*') || user.role === 'Admin') return true;
    if (
      user.role === 'Staff' &&
      (permission.startsWith('customers.') ||
        permission.startsWith('sales.') ||
        permission.startsWith('invoices.') ||
        permission.startsWith('rentals.') ||
        permission.startsWith('assets.') ||
        permission.startsWith('services.') ||
        permission.startsWith('payments.') ||
        permission.startsWith('tasks.') ||
        permission.startsWith('inquiries.') ||
        permission.startsWith('whatsapp.'))
    ) {
      return true;
    }
    return permissions.includes(permission);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    if (user.role === 'Super Admin') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated,
        isLoading,
        authStatus,
        isInitialCheckDone,
        hasPermission,
        hasRole,
        login,
        logout,
        setUserProfile,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export const AuthBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm font-medium text-slate-400">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={checkAuth} />;
  }

  return <>{children}</>;
};
