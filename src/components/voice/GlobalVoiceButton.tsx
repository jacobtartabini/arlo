import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalVoiceOverlay } from './GlobalVoiceOverlay';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { useAuth } from '@/providers/AuthProvider';
import { useLocation } from 'react-router-dom';
import { usePorcupineWakeWord } from '@/hooks/usePorcupineWakeWord';

export function GlobalVoiceButton() {
  const { isAuthenticated } = useAuth();
  const { settings } = useVoiceSettings();
  const location = useLocation();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Don't show on chat page (has its own voice controls)
  const isOnChatPage = location.pathname === '/chat';

  // Handle wake word detection
  const handleWakeWordDetected = useCallback(() => {
    console.log('[GlobalVoiceButton] Wake word detected, opening overlay');
    setIsOverlayOpen(true);
  }, []);

  // Porcupine wake word detection - only enabled when settings allow and overlay is closed
  const { isListening: isWakeWordListening, isInitializing, error: wakeWordError, stop: stopWakeWord } = usePorcupineWakeWord({
    onWakeWordDetected: handleWakeWordDetected,
    enabled: Boolean(settings?.wake_word_enabled && !isOverlayOpen && isAuthenticated),
  });

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
            {(isWakeWordListening || isInitializing) && !isOverlayOpen && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute -top-1 -right-1 w-3 h-3"
              >
                {isInitializing ? (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error indicator */}
          {wakeWordError && settings?.wake_word_enabled && (
            <div className="absolute -top-1 -right-1 w-3 h-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" title={wakeWordError} />
            </div>
          )}

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
              onClick={stopWakeWord}
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
