import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalVoiceOverlay } from './GlobalVoiceOverlay';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { useAuth } from '@/providers/AuthProvider';
import { useLocation } from 'react-router-dom';
import { getSpeechRecognition, SpeechRecognitionInstance } from '@/types/speech-recognition';

export function GlobalVoiceButton() {
  const { isAuthenticated } = useAuth();
  const { settings } = useVoiceSettings();
  const location = useLocation();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const wakeWordRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Don't show on chat page (has its own voice controls)
  const isOnChatPage = location.pathname === '/chat';

  // Wake word detection
  const initWakeWordDetection = useCallback(() => {
    if (!settings?.wake_word_enabled) return null;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        const wakePhrase = (settings?.wake_word_phrase || 'hey arlo').toLowerCase();
        
        if (transcript.includes(wakePhrase)) {
          // Wake word detected!
          setIsOverlayOpen(true);
          recognition.stop();
          setIsWakeWordListening(false);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('[GlobalVoiceButton] Wake word error:', event.error);
      if (event.error !== 'aborted') {
        // Restart on recoverable errors
        setTimeout(() => {
          if (settings?.wake_word_enabled && !isOverlayOpen) {
            try {
              recognition.start();
            } catch (e) {
              // Already running
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Restart if wake word is still enabled and overlay is not open
      if (settings?.wake_word_enabled && !isOverlayOpen) {
        setTimeout(() => {
          try {
            recognition.start();
            setIsWakeWordListening(true);
          } catch (e) {
            // Already running
          }
        }, 500);
      }
    };

    wakeWordRecognitionRef.current = recognition;
    return recognition;
  }, [settings?.wake_word_enabled, settings?.wake_word_phrase, isOverlayOpen]);

  // Start/stop wake word detection based on settings
  useEffect(() => {
    if (!isAuthenticated) return;
    
    if (settings?.wake_word_enabled && !isOverlayOpen) {
      const recognition = initWakeWordDetection();
      if (recognition) {
        try {
          recognition.start();
          setIsWakeWordListening(true);
        } catch (e) {
          // Already running
        }
      }
    } else {
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
        setIsWakeWordListening(false);
      }
    }

    return () => {
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
    };
  }, [settings?.wake_word_enabled, isOverlayOpen, initWakeWordDetection, isAuthenticated]);

  const handleStopWakeWord = useCallback(() => {
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
      wakeWordRecognitionRef.current = null;
    }
    setIsWakeWordListening(false);
  }, []);

  if (!isAuthenticated || isOnChatPage) return null;

  return (
    <>
      {/* Floating voice button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="relative">
          {/* Wake word listening indicator */}
          <AnimatePresence>
            {isWakeWordListening && !isOverlayOpen && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute -top-1 -right-1 w-3 h-3"
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsOverlayOpen(true)}
            className={cn(
              "p-4 rounded-full shadow-lg transition-all duration-200",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
          >
            <Mic className="w-6 h-6" />
          </button>

          {/* Stop listening button (shown when wake word is active) */}
          {isWakeWordListening && (
            <button
              onClick={handleStopWakeWord}
              className="absolute -bottom-2 -left-2 p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
              title="Stop listening for wake word"
            >
              <MicOff className="w-3 h-3" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Voice overlay */}
      <GlobalVoiceOverlay
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
      />
    </>
  );
}
