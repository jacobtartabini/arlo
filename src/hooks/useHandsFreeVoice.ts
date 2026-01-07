import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceState } from '@/types/voice';
import { getSpeechRecognition, SpeechRecognitionInstance, SpeechRecognitionEventResult } from '@/types/speech-recognition';
import { useVoiceSettings } from './useVoiceSettings';
import { useArlo } from '@/providers/ArloProvider';
import { getAuthHeaders } from '@/lib/arloAuth';
import { usePorcupineWakeWord } from './usePorcupineWakeWord';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Hands-Free Voice Mode Hook
 * 
 * Manages the complete hands-free voice experience:
 * - Always-on wake word detection (when enabled)
 * - Speech recognition after wake word
 * - Silent chat creation (no navigation)
 * - TTS response playback
 * - Automatic return to wake word listening
 */
export function useHandsFreeVoice() {
  const { isAuthenticated } = useAuth();
  const { settings, updateSettings, isLoading: settingsLoading } = useVoiceSettings();
  const { sendMessage, messages, isLoading: arloLoading } = useArlo();
  
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const pendingTranscriptRef = useRef('');
  const lastMessageCountRef = useRef(messages.length);
  const sessionTimeoutRef = useRef<number | null>(null);

  // Check if hands-free mode is enabled
  const isHandsFreeEnabled = Boolean(
    isAuthenticated &&
    !settingsLoading &&
    settings?.voice_mode_enabled &&
    settings?.wake_word_enabled
  );

  // Pre-initialize audio element for low latency TTS
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    return recognition;
  }, []);

  // Send transcript to Arlo
  const sendTranscriptToArlo = useCallback(async () => {
    const textToSend = pendingTranscriptRef.current.trim();
    if (!textToSend) {
      // No speech detected, return to passive listening
      cleanup();
      setIsSessionActive(false);
      setVoiceState('idle');
      setTranscript('');
      return;
    }

    // Clear transcript and switch to thinking state
    pendingTranscriptRef.current = '';
    setTranscript('');
    setVoiceState('thinking');

    // Stop speech recognition while processing
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }

    // Send message to Arlo (creates chat silently in background)
    console.log('[HandsFree] Sending to Arlo:', textToSend);
    await sendMessage(textToSend);
  }, [sendMessage, cleanup]);

  // Speak response via Cartesia TTS
  const speakResponse = useCallback(async (text: string) => {
    if (!text) {
      // No response, return to passive listening
      cleanup();
      setIsSessionActive(false);
      setVoiceState('idle');
      return;
    }

    setVoiceState('speaking');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/cartesia-tts`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 2000), // Limit text length
          voiceId: settings?.cartesia_voice_id,
          model: settings?.cartesia_model,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS generation failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          // Return to passive wake word listening
          cleanup();
          setIsSessionActive(false);
          setVoiceState('idle');
          console.log('[HandsFree] Response complete, returning to wake word listening');
        };

        await audioRef.current.play();
      }
    } catch (err) {
      console.error('[HandsFree] TTS error:', err);
      setError('Failed to speak response');
      // Return to passive listening on error
      cleanup();
      setIsSessionActive(false);
      setVoiceState('idle');
    }
  }, [settings, cleanup]);

  // Watch for new assistant messages to speak
  useEffect(() => {
    if (!isSessionActive || voiceState !== 'thinking') return;
    
    const currentCount = messages.length;
    if (currentCount > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const lastAssistantMessage = newMessages.reverse().find(m => m.role === 'assistant');
      
      if (lastAssistantMessage && lastAssistantMessage.content) {
        console.log('[HandsFree] Got assistant response, speaking');
        speakResponse(lastAssistantMessage.content);
      }
    }
    lastMessageCountRef.current = currentCount;
  }, [messages, isSessionActive, voiceState, speakResponse]);

  // Update thinking state when Arlo starts processing
  useEffect(() => {
    if (isSessionActive && arloLoading && voiceState === 'listening') {
      setVoiceState('thinking');
    }
  }, [arloLoading, isSessionActive, voiceState]);

  // Start voice session after wake word detection
  const startVoiceSession = useCallback(async () => {
    console.log('[HandsFree] Wake word detected, starting voice session');
    setError(null);
    
    try {
      // Request microphone permission (should already be granted from wake word)
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize speech recognition
      const recognition = initSpeechRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      pendingTranscriptRef.current = '';
      setTranscript('');
      lastMessageCountRef.current = messages.length;

      // Set up recognition event handlers
      recognition.onresult = (event: SpeechRecognitionEventResult) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          pendingTranscriptRef.current += finalTranscript;
          setTranscript(pendingTranscriptRef.current);
          
          // Reset silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          // Auto-send after silence
          silenceTimeoutRef.current = window.setTimeout(() => {
            if (pendingTranscriptRef.current.trim()) {
              sendTranscriptToArlo();
            }
          }, settings?.silence_timeout_ms || 1500);
        } else {
          setTranscript(pendingTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('[HandsFree] Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied');
        } else if (event.error !== 'aborted') {
          setError(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If session is still active and we're listening, restart
        if (isSessionActive && voiceState === 'listening' && recognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Already started
          }
        }
      };

      // Start listening
      recognition.start();
      setIsSessionActive(true);
      setVoiceState('listening');

      // Set a session timeout (30 seconds max listening)
      sessionTimeoutRef.current = window.setTimeout(() => {
        if (pendingTranscriptRef.current.trim()) {
          sendTranscriptToArlo();
        } else {
          cleanup();
          setIsSessionActive(false);
          setVoiceState('idle');
        }
      }, 30000);

    } catch (err) {
      console.error('[HandsFree] Error starting voice session:', err);
      setError('Failed to start voice session');
    }
  }, [initSpeechRecognition, messages.length, settings, sendTranscriptToArlo, cleanup, isSessionActive, voiceState]);

  // Handle interruption (user speaks while Arlo is talking)
  const handleInterruption = useCallback(() => {
    if (voiceState === 'speaking' && audioRef.current) {
      console.log('[HandsFree] Interruption detected');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Immediately start new listening session
      startVoiceSession();
    }
  }, [voiceState, startVoiceSession]);

  // Wake word detection - always active when hands-free mode is enabled and not in active session
  const { isListening: isWakeWordListening, isInitializing, error: wakeWordError } = usePorcupineWakeWord({
    onWakeWordDetected: startVoiceSession,
    enabled: isHandsFreeEnabled && !isSessionActive,
  });

  // Pass through wake word errors
  useEffect(() => {
    if (wakeWordError) {
      setError(wakeWordError);
    }
  }, [wakeWordError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [cleanup]);

  return {
    // State
    voiceState,
    isSessionActive,
    isWakeWordListening,
    isInitializing,
    transcript,
    error,
    
    // Computed
    isHandsFreeEnabled,
    
    // Actions
    handleInterruption,
    
    // Settings
    settings,
    updateSettings,
  };
}
