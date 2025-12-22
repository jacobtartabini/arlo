import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
      
      if (!session?.user) {
        setIsLoading(false);
        return;
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) {
        setSettings(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch settings when userId changes
  const fetchSettings = useCallback(async () => {
    if (!userId) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user settings:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings for new user
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            ...DEFAULT_USER_SETTINGS,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user settings:', insertError);
        } else {
          setSettings(newSettings as UserSettings);
        }
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: UserSettingsUpdate) => {
    if (!userId || !settings) {
      toast.error('You must be logged in to update settings');
      return;
    }

    // Optimistic update
    const previousSettings = settings;
    setSettings(prev => prev ? { ...prev, ...updates } : null);

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId);

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
  }, [userId, settings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const value = useMemo<UserSettingsContextValue>(() => ({
    settings,
    isLoading,
    isAuthenticated: !!userId,
    userId,
    updateSettings,
    refreshSettings,
  }), [settings, isLoading, userId, updateSettings, refreshSettings]);

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
