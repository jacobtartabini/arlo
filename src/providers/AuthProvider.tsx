import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContextType, AuthState } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    tailscaleVerified: false,
    isLoading: true,
    error: null,
  });

  // Initialize verification state
  useEffect(() => {
    const initAuth = () => {
      try {
        const tailscaleVerified = sessionStorage.getItem('arlo_access_verified') === 'true';
        const verificationExpiry = sessionStorage.getItem('arlo_access_verified_expiry');
        const isVerificationValid = verificationExpiry && Date.now() < parseInt(verificationExpiry);

        setAuthState({
          tailscaleVerified: tailscaleVerified && !!isVerificationValid,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthState({
          tailscaleVerified: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initAuth();
  }, []);

  // Verify Tailscale access (checks both Pi and Mac endpoints)
  const verifyTailscaleAccess = async (): Promise<void> => {
    const endpoints = [
      'https://raspberrypi.tailf531bd.ts.net/auth/verify',
      'https://jacobs-macbook-pro.tailf531bd.ts.net/api/verify',
    ];

    let success = false;
    let lastError: any = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          success = true;
          break;
        } else {
          lastError = new Error(`Access denied via ${url}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!success) {
      sessionStorage.removeItem('arlo_access_verified');
      sessionStorage.removeItem('arlo_access_verified_expiry');

      setAuthState(prev => ({
        ...prev,
        tailscaleVerified: false,
        error: lastError instanceof Error ? lastError.message : 'Failed to verify access',
      }));
      throw lastError || new Error('Verification failed');
    }

    // Store verification with 15-minute expiry
    const expiry = Date.now() + 15 * 60 * 1000;
    sessionStorage.setItem('arlo_access_verified', 'true');
    sessionStorage.setItem('arlo_access_verified_expiry', expiry.toString());

    setAuthState(prev => ({ ...prev, tailscaleVerified: true, error: null }));
  };

  // Set Tailscale verification status
  const setTailscaleVerified = (verified: boolean) => {
    if (verified) {
      const expiry = Date.now() + 15 * 60 * 1000;
      sessionStorage.setItem('arlo_access_verified', 'true');
      sessionStorage.setItem('arlo_access_verified_expiry', expiry.toString());
    } else {
      sessionStorage.removeItem('arlo_access_verified');
      sessionStorage.removeItem('arlo_access_verified_expiry');
    }

    setAuthState(prev => ({ ...prev, tailscaleVerified: verified }));
  };

  const contextValue: AuthContextType = {
    ...authState,
    verifyTailscaleAccess,
    setTailscaleVerified,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
