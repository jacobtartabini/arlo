import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { UserSettings, UserSettingsUpdate, DEFAULT_USER_SETTINGS } from '@/types/settings';
import { toast } from 'sonner';

interface UserSettingsContextValue {
  settings: UserSettings | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  updateSettings: (updates: UserSettingsUpdate) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

/**
 * Check if Tailscale is verified
 */
function isTailscaleVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const verified = sessionStorage.getItem('arlo_access_verified') === 'true';
  const expiry = sessionStorage.getItem('arlo_access_verified_expiry');
  return verified && !!expiry && Date.now() < parseInt(expiry);
}

/**
 * Get user ID from session storage (set by AuthProvider from JWT)
 */
function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('arlo_user_id');
}

interface DbUserSettings {
  id: string;
  user_id: string;
  theme: string;
  voice_responses_enabled: boolean;
  proactive_suggestions_enabled: boolean;
  learning_mode_enabled: boolean;
  data_collection_enabled: boolean;
  analytics_enabled: boolean;
  encryption_enabled: boolean;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  sound_enabled: boolean;
  api_endpoint: string | null;
  api_token: string | null;
  created_at: string;
  updated_at: string;
}

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check Tailscale auth status
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(isTailscaleVerified());
    };
    
    checkAuth();
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!isTailscaleVerified()) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await dataApiHelpers.select<DbUserSettings[]>('user_settings', {
        limit: 1,
      });

      if (error) {
        console.error('Error fetching user settings:', error);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setSettings(data[0] as unknown as UserSettings);
      } else {
        // Create default settings for user
        const { data: newSettings, error: insertError } = await dataApiHelpers.insert<DbUserSettings>(
          'user_settings',
          DEFAULT_USER_SETTINGS
        );

        if (insertError) {
          console.error('Error creating user settings:', insertError);
        } else if (newSettings) {
          setSettings(newSettings as unknown as UserSettings);
        }
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: UserSettingsUpdate) => {
    if (!isTailscaleVerified() || !settings) {
      toast.error('Please connect via Tailscale to update settings');
      return;
    }

    // Optimistic update
    const previousSettings = settings;
    setSettings(prev => prev ? { ...prev, ...updates } : null);

    try {
      const { error } = await dataApiHelpers.update('user_settings', settings.id, updates);

      if (error) {
        // Rollback on error
        setSettings(previousSettings);
        console.error('Error updating settings:', error);
        toast.error('Failed to save settings');
        return;
      }

      toast.success('Settings saved');
    } catch (error) {
      setSettings(previousSettings);
      console.error('Error updating settings:', error);
      toast.error('Failed to save settings');
    }
  }, [settings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const value = useMemo<UserSettingsContextValue>(() => ({
    settings,
    isLoading,
    isAuthenticated,
    userId: isAuthenticated ? getUserId() : null,
    updateSettings,
    refreshSettings,
  }), [settings, isLoading, isAuthenticated, updateSettings, refreshSettings]);

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
};
