import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, X, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import { Button } from '@/components/ui/button';

interface GlobalVoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalVoiceOverlay({ isOpen, onClose }: GlobalVoiceOverlayProps) {
  const {
    voiceState,
    isVoiceModeActive,
    transcript,
    error,
    isMuted,
    startVoiceMode,
    stopVoiceMode,
    cancelVoice,
    toggleMute,
    stopSpeaking,
    sendTranscript,
    settings,
  } = useVoiceMode();

  React.useEffect(() => {
    if (isOpen && !isVoiceModeActive) {
      startVoiceMode();
    }
  }, [isOpen, isVoiceModeActive, startVoiceMode]);

  const handleClose = () => {
    stopVoiceMode();
    onClose();
  };

  const getStateLabel = () => {
    switch (voiceState) {
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      default:
        return 'Voice Mode';
    }
  };

  const getStateColor = () => {
    switch (voiceState) {
      case 'listening':
        return 'text-green-500';
      case 'thinking':
        return 'text-yellow-500';
      case 'speaking':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-card border border-border shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* State indicator */}
            <div className="flex flex-col items-center gap-4">
              {/* Animated circle */}
              <div className="relative">
                <motion.div
                  animate={voiceState === 'listening' ? {
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  } : voiceState === 'speaking' ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{
                    duration: voiceState === 'listening' ? 1.5 : 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center",
                    voiceState === 'listening' && "bg-green-500/20 ring-2 ring-green-500",
                    voiceState === 'thinking' && "bg-yellow-500/20 ring-2 ring-yellow-500",
                    voiceState === 'speaking' && "bg-blue-500/20 ring-2 ring-blue-500",
                    voiceState === 'idle' && "bg-muted"
                  )}
                >
                  {voiceState === 'thinking' ? (
                    <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
                  ) : voiceState === 'speaking' ? (
                    <Volume2 className="w-10 h-10 text-blue-500" />
                  ) : (
                    <Mic className={cn("w-10 h-10", getStateColor())} />
                  )}
                </motion.div>
              </div>

              {/* State label */}
              <div className={cn("text-lg font-medium", getStateColor())}>
                {getStateLabel()}
              </div>

              {/* Error message */}
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* Transcript display */}
              {transcript && (
                <div className="w-full p-4 rounded-lg bg-muted/50 max-h-32 overflow-y-auto">
                  <p className="text-sm text-foreground">{transcript}</p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-3 mt-4">
                {/* Mute toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMute}
                  className={cn(isMuted && "bg-destructive/10 border-destructive")}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-destructive" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>

                {/* Stop/Cancel */}
                {voiceState === 'speaking' ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={stopSpeaking}
                  >
                    <Square className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={cancelVoice}
                    disabled={!transcript}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}

                {/* Manual send (when auto-send is disabled) */}
                {!settings?.auto_send_on_silence && transcript && voiceState === 'listening' && (
                  <Button
                    onClick={sendTranscript}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                )}

                {/* End voice mode */}
                <Button
                  variant="destructive"
                  onClick={handleClose}
                  className="gap-2"
                >
                  <MicOff className="w-4 h-4" />
                  End
                </Button>
              </div>

              {/* Wake word indicator */}
              {settings?.wake_word_enabled && (
                <div className="text-xs text-muted-foreground mt-2">
                  Say "{settings.wake_word_phrase}" to activate from any page
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
