import { useHandsFreeVoice } from '@/hooks/useHandsFreeVoice';
import { AmbientVoiceFeedback } from './AmbientVoiceFeedback';

/**
 * Hands-Free Voice Controller
 * 
 * Replaces GlobalVoiceButton and GlobalVoiceOverlay with a completely
 * invisible, ambient voice experience:
 * 
 * - No floating buttons or pop-up modals
 * - Always-on wake word detection when enabled in settings
 * - Silent background chat creation (no navigation)
 * - Minimal edge glow feedback for voice state
 * - User stays on their current page
 */
export function HandsFreeVoiceController() {
  const {
    voiceState,
    isSessionActive,
    isWakeWordListening,
    isHandsFreeEnabled,
    transcript,
    error,
  } = useHandsFreeVoice();

  // Only render if hands-free mode is enabled
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
