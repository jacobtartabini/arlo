export interface UserSettings {
  id: string;
  user_id: string;
  
  // Theme preferences
  theme: 'dark' | 'light' | 'system';
  
  // AI Assistant settings
  voice_responses_enabled: boolean;
  learning_mode_enabled: boolean;
  proactive_suggestions_enabled: boolean;
  
  // Privacy & Security settings
  data_collection_enabled: boolean;
  analytics_enabled: boolean;
  encryption_enabled: boolean;
  
  // Notification settings
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  sound_enabled: boolean;
  
  // Morning wake-up settings
  morning_wakeup_enabled: boolean;
  morning_wakeup_time: string; // HH:MM format
  
  // Connection settings
  api_endpoint: string | null;
  api_token: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type UserSettingsUpdate = Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'system',
  voice_responses_enabled: true,
  learning_mode_enabled: true,
  proactive_suggestions_enabled: true,
  data_collection_enabled: true,
  analytics_enabled: true,
  encryption_enabled: true,
  push_notifications_enabled: true,
  email_notifications_enabled: false,
  sound_enabled: true,
  morning_wakeup_enabled: true,
  morning_wakeup_time: '07:00',
  api_endpoint: null,
  api_token: null,
};
