import { useVoiceState } from '@/providers/VoiceStateProvider';
import { AmbientVoiceFeedback } from './AmbientVoiceFeedback';

/**
 * Voice Ambient Glow - renders edge glow based on VoiceStateProvider context
 */
export function VoiceAmbientGlow() {
  const {
    voiceState,
    isSessionActive,
    isWakeWordListening,
    isHandsFreeEnabled,
    transcript,
    error,
  } = useVoiceState();

  if (!isHandsFreeEnabled) {
    return null;
  }

  return (
    <AmbientVoiceFeedback
      voiceState={voiceState}
      isActive={isSessionActive}
      isWakeWordListening={isWakeWordListening}
      transcript={transcript}
      error={error}
    />
  );
}
