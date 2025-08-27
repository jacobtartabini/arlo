import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContextType, AuthState, AuthUser } from '@/types/auth';
import { authService } from '@/services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    tailscaleVerified: false,
    isLoading: true,
    error: null,
  });

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getStoredUser();
        const tailscaleVerified = sessionStorage.getItem('arlo_access_verified') === 'true';
        const verificationExpiry = sessionStorage.getItem('arlo_access_verified_expiry');
        const isVerificationValid = verificationExpiry && Date.now() < parseInt(verificationExpiry);

        setAuthState({
          user: storedUser,
          isAuthenticated: !!storedUser,
          tailscaleVerified: tailscaleVerified && !!isVerificationValid,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          tailscaleVerified: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      await authService.initiateLogin();
      // Note: This will redirect, so state update won't complete
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const currentUser = authState.user;
      await authService.logout(currentUser?.idToken);

      // Clear Tailscale verification as well
      sessionStorage.removeItem('arlo_access_verified');
      sessionStorage.removeItem('arlo_access_verified_expiry');

      setAuthState({
        user: null,
        isAuthenticated: false,
        tailscaleVerified: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      sessionStorage.removeItem('arlo_access_verified');
      sessionStorage.removeItem('arlo_access_verified_expiry');

      setAuthState({
        user: null,
        isAuthenticated: false,
        tailscaleVerified: false,
        isLoading: false,
        error: null,
      });
    }
  };

  // Refresh session
  const refreshSession = async (): Promise<void> => {
    try {
      const storedUser = authService.getStoredUser();
      setAuthState(prev => ({
        ...prev,
        user: storedUser,
        isAuthenticated: !!storedUser,
        error: null,
      }));
    } catch (error) {
      console.error('Session refresh failed:', error);
      setAuthState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: 'Session refresh failed',
      }));
    }
  };

  // --- Updated Tailscale verification ---
  const verifyTailscaleAccess = async (): Promise<void> => {
    try {
      const response = await fetch(
        'https://jacobs-macbook-pro.tailf531bd.ts.net/api/verify',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Access denied: ${response.status}`);
      }

      const data = await response.json();

      if (data.message && data.message.includes('Tailscale access verified')) {
        // Store verification with expiry (15 minutes)
        const expiry = Date.now() + 15 * 60 * 1000;
        sessionStorage.setItem('arlo_access_verified', 'true');
        sessionStorage.setItem('arlo_access_verified_expiry', expiry.toString());

        setAuthState(prev => ({
          ...prev,
          tailscaleVerified: true,
          error: null,
        }));
      } else {
        throw new Error('Tailscale verification denied by backend');
      }
    } catch (error) {
      sessionStorage.removeItem('arlo_access_verified');
      sessionStorage.removeItem('arlo_access_verified_expiry');

      setAuthState(prev => ({
        ...prev,
        tailscaleVerified: false,
        error: error instanceof Error ? error.message : 'Failed to verify access',
      }));

      throw error;
    }
  };

  // Set Tailscale verification status manually
  const setTailscaleVerified = (verified: boolean) => {
    if (verified) {
      const expiry = Date.now() + 15 * 60 * 1000;
      sessionStorage.setItem('arlo_access_verified', 'true');
      sessionStorage.setItem('arlo_access_verified_expiry', expiry.toString());
    } else {
      sessionStorage.removeItem('arlo_access_verified');
      sessionStorage.removeItem('arlo_access_verified_expiry');
    }

    setAuthState(prev => ({
      ...prev,
      tailscaleVerified: verified,
    }));
  };

  // Handle auth success (callback)
  const handleAuthSuccess = (user: AuthUser) => {
    setAuthState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }));
  };

  // Handle auth error
  const handleAuthError = (error: string) => {
    setAuthState({
