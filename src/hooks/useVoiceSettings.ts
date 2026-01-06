import { useState, useEffect, useCallback } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { useAuth } from '@/providers/AuthProvider';
import { VoiceSettings, DEFAULT_VOICE_SETTINGS } from '@/types/voice';
import { toast } from 'sonner';

export function useVoiceSettings() {
  const { isAuthenticated, userKey, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated || !userKey || authLoading) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await dataApiHelpers.select<VoiceSettings[]>('voice_settings', {
        filters: { user_key: userKey },
        limit: 1,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSettings(data[0]);
      } else {
        // Create default settings if none exist
        const { data: created, error: createError } = await dataApiHelpers.insert<VoiceSettings>('voice_settings', {
          user_key: userKey,
          ...DEFAULT_VOICE_SETTINGS,
        });

        if (createError) throw createError;
        if (created) setSettings(created);
      }
    } catch (err) {
      console.error('[useVoiceSettings] Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, userKey, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchSettings();
    }
  }, [fetchSettings, authLoading]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<VoiceSettings>): Promise<boolean> => {
    if (!settings?.id) {
      toast.error('Voice settings not loaded');
      return false;
    }

    try {
      const { error } = await dataApiHelpers.update('voice_settings', settings.id, updates);
      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Voice settings updated');
      return true;
    } catch (err) {
      console.error('[useVoiceSettings] Error updating settings:', err);
      toast.error('Failed to update voice settings');
      return false;
    }
  }, [settings?.id]);

  return {
    settings,
    isLoading,
    updateSettings,
    refetch: fetchSettings,
  };
}
