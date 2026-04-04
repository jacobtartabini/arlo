import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { AuthContextType, AuthState } from '@/types/auth';
import {
  getArloToken,
  clearArloToken,
  isAuthenticated as checkIsAuthenticated,
  getIdentity,
  clearAuthRedirectAttempts,
  shouldBypassAuthRedirect,
  ARLO_AUTH_INVALIDATED_EVENT,
} from '@/lib/arloAuth';
import { isPublicBookingDomain } from '@/lib/domain-utils';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    identity: null,
    userKey: null,
  });

  const setLegacyAuthFlags = (userKey: string | null) => {
    if (userKey) {
      sessionStorage.setItem('arlo_user_id', userKey);
      sessionStorage.setItem('arlo_access_verified', 'true');
      sessionStorage.setItem('arlo_access_verified_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
    }
  };

  const clearLegacyAuthFlags = () => {
    sessionStorage.removeItem('arlo_user_id');
    sessionStorage.removeItem('arlo_access_verified');
    sessionStorage.removeItem('arlo_access_verified_expiry');
  };

  useEffect(() => {
    const initAuth = async () => {
      if (isPublicBookingDomain()) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          identity: null,
          userKey: null,
        });
        return;
      }

      try {
        // This will hydrate from sessionStorage and validate claims.
        await getArloToken();

        if (checkIsAuthenticated()) {
          const identity = getIdentity();
          const userKey = identity?.user ?? null;

          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            identity,
            userKey,
          });
          setLegacyAuthFlags(userKey);
          clearAuthRedirectAttempts();
          return;
        }

        clearLegacyAuthFlags();
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          identity: null,
          userKey: null,
        });
        // Don't redirect here — let ProtectedRoute handle it to avoid
        // multiple concurrent redirects that trip the loop breaker.
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearLegacyAuthFlags();
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
          identity: null,
          userKey: null,
        });
        // Don't redirect here either.
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleAuthInvalidated = () => {
      clearLegacyAuthFlags();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: 'Session expired. Please sign in again.',
        identity: null,
        userKey: null,
      });

      if (!shouldBypassAuthRedirect()) {
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.assign(`/login?return_to=${encodeURIComponent(currentPath)}`);
      }
    };

    window.addEventListener(ARLO_AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    return () => window.removeEventListener(ARLO_AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
  }, []);

  const verifyAuth = useCallback(async (): Promise<boolean> => {
    if (isPublicBookingDomain()) {
      return false;
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = await getArloToken();

      if (token) {
        const identity = getIdentity();
        const userKey = identity?.user ?? null;

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          identity,
          userKey,
        });
        setLegacyAuthFlags(userKey);
        return true;
      }

      clearLegacyAuthFlags();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        identity: null,
        userKey: null,
      });
      // Don't redirect here — let ProtectedRoute handle it.
      return false;
    } catch (error) {
      console.error('Auth verification failed:', error);
      clearLegacyAuthFlags();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to verify access',
        identity: null,
        userKey: null,
      });
      // Don't redirect here — let ProtectedRoute handle it.
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearArloToken();
    clearLegacyAuthFlags();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      identity: null,
      userKey: null,
    });
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    verifyAuth,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export function useUserKey(): string | null {
  const { userKey, isAuthenticated } = useAuth();
  return isAuthenticated ? userKey : null;
}

/** @deprecated Use useUserKey() - this app uses user_key (TEXT) not UUID user_id. */
export function useUserId(): string | null {
  return useUserKey();
}
