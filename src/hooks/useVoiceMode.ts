import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceState } from '@/types/voice';
import { getSpeechRecognition, SpeechRecognitionInstance, SpeechRecognitionEventResult } from '@/types/speech-recognition';
import { useVoiceSettings } from './useVoiceSettings';
import { useArlo } from '@/providers/ArloProvider';
import { getAuthHeaders } from '@/lib/arloAuth';

export function useVoiceMode() {
  const { settings, updateSettings } = useVoiceSettings();
  const { sendMessage, messages, isLoading: arloLoading } = useArlo();
  
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const pendingTranscriptRef = useRef('');
  const lastMessageCountRef = useRef(messages.length);

  // Pre-initialize audio element for low latency
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

  // Watch for new assistant messages to speak
  useEffect(() => {
    if (!isVoiceModeActive || isMuted) return;
    
    const currentCount = messages.length;
    if (currentCount > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const lastAssistantMessage = newMessages.reverse().find(m => m.role === 'assistant');
      
      if (lastAssistantMessage && lastAssistantMessage.content && voiceState === 'thinking') {
        speak(lastAssistantMessage.content);
      }
    }
    lastMessageCountRef.current = currentCount;
  }, [messages, isVoiceModeActive, isMuted, voiceState]);

  // Update state when arloLoading changes
  useEffect(() => {
    if (isVoiceModeActive && arloLoading && voiceState === 'listening') {
      setVoiceState('thinking');
    }
  }, [arloLoading, isVoiceModeActive, voiceState]);

  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

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
        
        // Auto-send after silence if enabled
        if (settings?.auto_send_on_silence) {
          silenceTimeoutRef.current = window.setTimeout(() => {
            if (pendingTranscriptRef.current.trim()) {
              handleSendTranscript();
            }
          }, settings?.silence_timeout_ms || 1500);
        }
      } else {
        setTranscript(pendingTranscriptRef.current + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('[useVoiceMode] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Restart if voice mode is still active and we're listening
      if (isVoiceModeActive && voiceState === 'listening' && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    return recognition;
  }, [settings, isVoiceModeActive, voiceState]);

  const handleSendTranscript = useCallback(async () => {
    const textToSend = pendingTranscriptRef.current.trim();
    if (!textToSend) return;

    // Clear the pending transcript
    pendingTranscriptRef.current = '';
    setTranscript('');
    setVoiceState('thinking');

    // Stop recognition while processing
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Send to Arlo
    await sendMessage(textToSend);
  }, [sendMessage]);

  const startVoiceMode = useCallback(async () => {
    setError(null);
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize speech recognition
      const recognition = initSpeechRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      pendingTranscriptRef.current = '';
      setTranscript('');
      lastMessageCountRef.current = messages.length;

      recognition.start();
      setIsVoiceModeActive(true);
      setVoiceState('listening');
    } catch (err) {
      console.error('[useVoiceMode] Error starting voice mode:', err);
      setError('Failed to access microphone');
    }
  }, [initSpeechRecognition, messages.length]);

  const stopVoiceMode = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsVoiceModeActive(false);
    setVoiceState('idle');
    setTranscript('');
    pendingTranscriptRef.current = '';
  }, []);

  const cancelVoice = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    pendingTranscriptRef.current = '';
    setTranscript('');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (voiceState === 'speaking') {
      setVoiceState('listening');
      // Restart recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already running
        }
      }
    }
  }, [voiceState]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (audioRef.current && !isMuted) {
      audioRef.current.pause();
    }
  }, [isMuted]);

  const speak = useCallback(async (text: string) => {
    if (!text || isMuted) {
      // If muted, just return to listening
      setVoiceState('listening');
      if (recognitionRef.current && isVoiceModeActive) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already running
        }
      }
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
        const errorData = await response.json().catch(() => ({}));
        console.error('[useVoiceMode] TTS error:', errorData);
        throw new Error(errorData.error || 'TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (isVoiceModeActive) {
            setVoiceState('listening');
            // Restart recognition
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already running
              }
            }
          }
        };

        await audioRef.current.play();
      }
    } catch (err) {
      console.error('[useVoiceMode] Error speaking:', err);
      setError('Failed to generate speech');
      // Fall back to listening state
      if (isVoiceModeActive) {
        setVoiceState('listening');
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already running
          }
        }
      }
    }
  }, [isMuted, settings, isVoiceModeActive]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (isVoiceModeActive) {
      setVoiceState('listening');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already running
        }
      }
    }
  }, [isVoiceModeActive]);

  // Manual send function for when auto-send is disabled
  const sendTranscript = useCallback(() => {
    handleSendTranscript();
  }, [handleSendTranscript]);

  return {
    voiceState,
    isVoiceModeActive,
    transcript,
    error,
    isMuted,
    startVoiceMode,
    stopVoiceMode,
    cancelVoice,
    toggleMute,
    speak,
    stopSpeaking,
    sendTranscript,
    settings,
    updateSettings,
  };
}
