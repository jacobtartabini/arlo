import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { VoiceState } from '@/types/voice';
import { getSpeechRecognition, SpeechRecognitionInstance, SpeechRecognitionEventResult } from '@/types/speech-recognition';
import { useVoiceSettings } from './useVoiceSettings';
import { getAuthHeaders } from '@/lib/arloAuth';
import { usePorcupineWakeWord } from './usePorcupineWakeWord';
import { useAuth } from '@/providers/AuthProvider';
import { useChatHistory } from '@/providers/ChatHistoryProvider';
import { invokeEdgeFunction } from '@/lib/edge-functions';

/**
 * Routes where "Hey Arlo" is NEVER allowed (unauthenticated / public surfaces).
 * Wake word + voice session are only ever enabled when the user is authenticated
 * AND on a protected application route.
 */
const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/auth/callback',
  '/auth/error',
  '/book',
  '/booking',
  '/unauthorized',
];

function isProtectedPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return !PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

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
  const location = useLocation();
  const { settings, updateSettings, isLoading: settingsLoading } = useVoiceSettings();
  const { appendMessage, ensureActiveConversation } = useChatHistory();
  
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const pendingTranscriptRef = useRef('');
  const sessionTimeoutRef = useRef<number | null>(null);

  // Hands-free is gated on:
  // 1. User is authenticated (verified Arlo JWT)
  // 2. Settings loaded and both voice mode + wake word enabled
  // 3. Current route is a protected (non-public) route
  const onProtectedRoute = isProtectedPath(location.pathname);
  const isHandsFreeEnabled = Boolean(
    isAuthenticated &&
    !settingsLoading &&
    settings?.voice_mode_enabled &&
    settings?.wake_word_enabled &&
    onProtectedRoute
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
      
      if (!headers) {
        throw new Error('Not authenticated');
      }
      
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
        const errorText = await response.text();
        console.error('[HandsFree] TTS response error:', response.status, errorText);
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

  // Send transcript to Arlo and persist to chat history
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

    // Log what user said
    console.log('[HandsFree] User said:', textToSend);

    // Get or create a conversation and save user message
    const conversationId = ensureActiveConversation();
    appendMessage({
      conversationId,
      text: textToSend,
      sender: 'user',
      status: 'sent',
    });

    // Call the real Arlo AI (Claude via arlo-ai edge function)
    try {
      const result = await invokeEdgeFunction<{ text?: string; error?: string }>(
        'arlo-ai',
        {
          messages: [{ role: 'user', content: textToSend }],
          system:
            'You are Arlo, a JARVIS-style voice assistant. Answer the exact question in one short spoken sentence. No greetings, no sign-offs, no filler, no emojis, no markdown, no extra context or history. If asked a factual question, give only the fact. Maximum two sentences, only if absolutely required.',
        },
        { requireAuth: true },
      );

      if (!result.ok) {
        throw new Error(result.message || 'AI request failed');
      }

      const reply =
        typeof result.data === 'object' && result.data && 'text' in result.data
          ? String((result.data as { text?: string }).text ?? '').trim()
          : '';

      if (!reply) {
        throw new Error('Empty AI response');
      }

      console.log('[HandsFree] Arlo replied:', reply);

      appendMessage({
        conversationId,
        text: reply,
        sender: 'arlo',
        status: 'sent',
      });

      await speakResponse(reply);
    } catch (err) {
      console.error('[HandsFree] AI call failed:', err);
      const fallback = "Sorry, I couldn't reach my brain just now. Please try again in a moment.";
      appendMessage({
        conversationId,
        text: fallback,
        sender: 'arlo',
        status: 'error',
      });
      await speakResponse(fallback);
    }
  }, [cleanup, speakResponse, ensureActiveConversation, appendMessage]);

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
  }, [initSpeechRecognition, settings, sendTranscriptToArlo, cleanup, isSessionActive, voiceState]);

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

  // Toggle mute - pauses wake word detection
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Wake word detection - always active when hands-free mode is enabled, not in active session, and not muted
  const { isListening: isWakeWordListening, isInitializing, error: wakeWordError } = usePorcupineWakeWord({
    onWakeWordDetected: startVoiceSession,
    enabled: isHandsFreeEnabled && !isSessionActive && !isMuted,
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
    isMuted,
    
    // Computed
    isHandsFreeEnabled,
    
    // Actions
    handleInterruption,
    toggleMute,
    
    // Settings
    settings,
    updateSettings,
  };
}
