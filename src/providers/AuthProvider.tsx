import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { AuthContextType, AuthState } from '@/types/auth';
import {
  getArloToken, 
  clearArloToken, 
  isAuthenticated as checkIsAuthenticated,
  getIdentity 
} from '@/lib/arloAuth';

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

  // Helper to set legacy compatibility flags
  const setLegacyAuthFlags = (userKey: string | null) => {
    if (userKey) {
      sessionStorage.setItem('arlo_user_id', userKey);
      sessionStorage.setItem('arlo_access_verified', 'true');
      // Set expiry to 24 hours from now
      sessionStorage.setItem(
        'arlo_access_verified_expiry',
        String(Date.now() + 24 * 60 * 60 * 1000)
      );
    }
  };

  // Helper to clear legacy compatibility flags
  const clearLegacyAuthFlags = () => {
    sessionStorage.removeItem('arlo_user_id');
    sessionStorage.removeItem('arlo_access_verified');
    sessionStorage.removeItem('arlo_access_verified_expiry');
  };

  // Initialize - check if we have a valid cached token
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if already authenticated (has valid in-memory token)
        if (checkIsAuthenticated()) {
          const identity = getIdentity();
          const userKey = identity?.user ?? null;

          if (import.meta.env.DEV) {
            console.log('[auth] init identity/userKey', { userKey, identity });
          }

          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            identity,
            userKey,
          });
          // Store legacy flags for backward compatibility
          setLegacyAuthFlags(userKey);
        } else {
          // No valid token in memory
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            identity: null,
            userKey: null,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
          identity: null,
          userKey: null,
        });
      }
    };

    initAuth();
  }, []);

  // Verify authentication by fetching/refreshing token
  const verifyAuth = useCallback(async (): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    // Hard watchdog so the UI can't spin forever if the network stack stalls
    const VERIFY_TIMEOUT_MS = 12_000;

    try {
      const token = await Promise.race([
        getArloToken(),
        new Promise<string | null>((resolve) => {
          setTimeout(() => resolve(null), VERIFY_TIMEOUT_MS);
        }),
      ]);

      if (token) {
        const identity = getIdentity();
        const userKey = identity?.user ?? null;

        if (import.meta.env.DEV) {
          console.log('[auth] verifyAuth identity/userKey', { userKey, identity });
        }

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          identity,
          userKey,
        });
        // Store legacy flags for backward compatibility
        setLegacyAuthFlags(userKey);
        return true;
      } else {
        clearLegacyAuthFlags();
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: 'Network access required',
          identity: null,
          userKey: null,
        });
        return false;
      }
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
      return false;
    }
  }, []);

  // Logout - clear token
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

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

/**
 * Get the current user's identity from the auth context
 * This should be used instead of hard-coded user IDs
 */
export function useUserKey(): string | null {
  const { userKey, isAuthenticated } = useAuth();
  return isAuthenticated ? userKey : null;
}

/** @deprecated Use useUserKey() - this app uses user_key (TEXT) not UUID user_id. */
export function useUserId(): string | null {
  return useUserKey();
}
