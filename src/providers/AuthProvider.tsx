import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { AuthContextType, AuthState, ArloIdentity } from '@/types/auth';
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
  });

  // Initialize - check if we have a valid cached token
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if already authenticated (has valid in-memory token)
        if (checkIsAuthenticated()) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            identity: getIdentity(),
          });
        } else {
          // No valid token in memory
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            identity: null,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
          identity: null,
        });
      }
    };

    initAuth();
  }, []);

  // Verify authentication by fetching/refreshing token
  const verifyAuth = useCallback(async (): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = await getArloToken();
      
      if (token) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          identity: getIdentity(),
        });
        return true;
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: 'Network access required',
          identity: null,
        });
        return false;
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to verify access',
        identity: null,
      });
      return false;
    }
  }, []);

  // Logout - clear token
  const logout = useCallback(() => {
    clearArloToken();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      identity: null,
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
