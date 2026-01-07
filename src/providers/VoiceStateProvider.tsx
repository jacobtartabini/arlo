import { createContext, useContext, ReactNode } from 'react';
import { VoiceState } from '@/types/voice';
import { useHandsFreeVoice } from '@/hooks/useHandsFreeVoice';

interface VoiceStateContextValue {
  voiceState: VoiceState;
  isSessionActive: boolean;
  isWakeWordListening: boolean;
  isInitializing: boolean;
  isHandsFreeEnabled: boolean;
  transcript: string;
  error: string | null;
}

const VoiceStateContext = createContext<VoiceStateContextValue | null>(null);

export function VoiceStateProvider({ children }: { children: ReactNode }) {
  const {
    voiceState,
    isSessionActive,
    isWakeWordListening,
    isInitializing,
    isHandsFreeEnabled,
    transcript,
    error,
  } = useHandsFreeVoice();

  return (
    <VoiceStateContext.Provider
      value={{
        voiceState,
        isSessionActive,
        isWakeWordListening,
        isInitializing,
        isHandsFreeEnabled,
        transcript,
        error,
      }}
    >
      {children}
    </VoiceStateContext.Provider>
  );
}

export function useVoiceState() {
  const context = useContext(VoiceStateContext);
  if (!context) {
    // Return default values when provider not mounted
    return {
      voiceState: 'idle' as VoiceState,
      isSessionActive: false,
      isWakeWordListening: false,
      isInitializing: false,
      isHandsFreeEnabled: false,
      transcript: '',
      error: null,
    };
  }
  return context;
}
