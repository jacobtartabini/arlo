// Voice Mode Types

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceSettings {
  id: string;
  user_key: string;
  
  // Cartesia TTS settings
  cartesia_api_key: string | null;
  cartesia_voice_id: string;
  cartesia_model: string;
  
  // Wake word settings
  wake_word_enabled: boolean;
  wake_word_phrase: string;
  
  // Voice mode preferences
  voice_mode_enabled: boolean;
  auto_send_on_silence: boolean;
  silence_timeout_ms: number;
  
  created_at: string;
  updated_at: string;
}

export interface VoiceContextType {
  // State
  voiceState: VoiceState;
  isVoiceModeActive: boolean;
  transcript: string;
  error: string | null;
  isMuted: boolean;
  
  // Actions
  startVoiceMode: () => Promise<void>;
  stopVoiceMode: () => void;
  cancelVoice: () => void;
  toggleMute: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  
  // Settings
  settings: VoiceSettings | null;
  updateSettings: (updates: Partial<VoiceSettings>) => Promise<void>;
}

export const DEFAULT_VOICE_SETTINGS: Omit<VoiceSettings, 'id' | 'user_key' | 'created_at' | 'updated_at'> = {
  cartesia_api_key: null,
  cartesia_voice_id: '41f3c367-e0a8-4a85-89e0-c27bae9c9b6d', // User's preferred Cartesia voice
  cartesia_model: 'sonic-english',
  wake_word_enabled: false,
  wake_word_phrase: 'Hey Arlo',
  voice_mode_enabled: false,
  auto_send_on_silence: true,
  silence_timeout_ms: 1500,
};
