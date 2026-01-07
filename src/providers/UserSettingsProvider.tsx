import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { UserSettings, UserSettingsUpdate, DEFAULT_USER_SETTINGS } from '@/types/settings';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';

interface UserSettingsContextValue {
  settings: UserSettings | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  updateSettings: (updates: UserSettingsUpdate) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

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
  morning_wakeup_enabled: boolean;
  morning_wakeup_time: string;
  api_endpoint: string | null;
  api_token: string | null;
  dashboard_module_visibility: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the AuthProvider for authentication state
  const { isAuthenticated, identity } = useAuth();
  const userId = isAuthenticated ? identity?.user ?? null : null;

  // Fetch settings when authenticated
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated || !userId) {
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
  }, [isAuthenticated, userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: UserSettingsUpdate) => {
    if (!isAuthenticated || !settings) {
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
  }, [isAuthenticated, settings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const value = useMemo<UserSettingsContextValue>(() => ({
    settings,
    isLoading,
    isAuthenticated,
    userId,
    updateSettings,
    refreshSettings,
  }), [settings, isLoading, isAuthenticated, userId, updateSettings, refreshSettings]);

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
