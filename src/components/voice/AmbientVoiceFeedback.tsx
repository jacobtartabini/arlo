import { motion, AnimatePresence } from 'framer-motion';
import { VoiceState } from '@/types/voice';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AmbientVoiceFeedbackProps {
  voiceState: VoiceState;
  isActive: boolean;
  isWakeWordListening: boolean;
  transcript?: string;
  error?: string | null;
}

/**
 * Ambient Voice Feedback - Minimal edge glow UI for hands-free voice mode
 * Non-intrusive, futuristic, and calm visual feedback
 */
export function AmbientVoiceFeedback({
  voiceState,
  isActive,
  isWakeWordListening,
  transcript,
  error,
}: AmbientVoiceFeedbackProps) {
  // Determine glow color based on state
  const getGlowConfig = () => {
    switch (voiceState) {
      case 'listening':
        return {
          color: 'hsl(142, 71%, 45%)', // Green
          shadowColor: 'hsl(142, 71%, 45%, 0.4)',
          pulseIntensity: 0.8,
          label: 'Listening...',
        };
      case 'thinking':
        return {
          color: 'hsl(45, 93%, 47%)', // Amber/Gold
          shadowColor: 'hsl(45, 93%, 47%, 0.4)',
          pulseIntensity: 0.6,
          label: 'Processing...',
        };
      case 'speaking':
        return {
          color: 'hsl(217, 91%, 60%)', // Blue
          shadowColor: 'hsl(217, 91%, 60%, 0.4)',
          pulseIntensity: 0.5,
          label: 'Speaking...',
        };
      default:
        return {
          color: 'hsl(var(--muted-foreground))',
          shadowColor: 'hsl(var(--muted-foreground), 0.2)',
          pulseIntensity: 0.3,
          label: '',
        };
    }
  };

  const glowConfig = getGlowConfig();
  const showActiveState = isActive && voiceState !== 'idle';
  const showWakeWordIndicator = isWakeWordListening && !isActive;

  return (
    <>
      {/* Edge glow effect - all four edges */}
      <AnimatePresence>
        {showActiveState && (
          <>
            {/* Top edge glow */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{
                opacity: [glowConfig.pulseIntensity, glowConfig.pulseIntensity * 0.6, glowConfig.pulseIntensity],
                scaleX: 1,
              }}
              exit={{ opacity: 0, scaleX: 0.5 }}
              transition={{
                opacity: {
                  duration: voiceState === 'listening' ? 1.5 : 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
                scaleX: { duration: 0.3 },
              }}
              className="fixed top-0 left-0 right-0 h-1 z-[200] pointer-events-none"
              style={{
                background: `linear-gradient(to right, transparent, ${glowConfig.color}, transparent)`,
                boxShadow: `0 0 20px 5px ${glowConfig.shadowColor}`,
              }}
            />

            {/* Bottom edge glow */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{
                opacity: [glowConfig.pulseIntensity, glowConfig.pulseIntensity * 0.6, glowConfig.pulseIntensity],
                scaleX: 1,
              }}
              exit={{ opacity: 0, scaleX: 0.5 }}
              transition={{
                opacity: {
                  duration: voiceState === 'listening' ? 1.5 : 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.1,
                },
                scaleX: { duration: 0.3 },
              }}
              className="fixed bottom-0 left-0 right-0 h-1 z-[200] pointer-events-none"
              style={{
                background: `linear-gradient(to right, transparent, ${glowConfig.color}, transparent)`,
                boxShadow: `0 0 20px 5px ${glowConfig.shadowColor}`,
              }}
            />

            {/* Left edge glow */}
            <motion.div
              initial={{ opacity: 0, scaleY: 0.5 }}
              animate={{
                opacity: [glowConfig.pulseIntensity * 0.7, glowConfig.pulseIntensity * 0.4, glowConfig.pulseIntensity * 0.7],
                scaleY: 1,
              }}
              exit={{ opacity: 0, scaleY: 0.5 }}
              transition={{
                opacity: {
                  duration: voiceState === 'listening' ? 1.5 : 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.2,
                },
                scaleY: { duration: 0.3 },
              }}
              className="fixed top-0 left-0 bottom-0 w-1 z-[200] pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent, ${glowConfig.color}, transparent)`,
                boxShadow: `0 0 15px 3px ${glowConfig.shadowColor}`,
              }}
            />

            {/* Right edge glow */}
            <motion.div
              initial={{ opacity: 0, scaleY: 0.5 }}
              animate={{
                opacity: [glowConfig.pulseIntensity * 0.7, glowConfig.pulseIntensity * 0.4, glowConfig.pulseIntensity * 0.7],
                scaleY: 1,
              }}
              exit={{ opacity: 0, scaleY: 0.5 }}
              transition={{
                opacity: {
                  duration: voiceState === 'listening' ? 1.5 : 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                },
                scaleY: { duration: 0.3 },
              }}
              className="fixed top-0 right-0 bottom-0 w-1 z-[200] pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent, ${glowConfig.color}, transparent)`,
                boxShadow: `0 0 15px 3px ${glowConfig.shadowColor}`,
              }}
            />

            {/* Subtle corner accents */}
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((position, index) => (
              <motion.div
                key={position}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: glowConfig.pulseIntensity * 0.5, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn('fixed w-8 h-8 z-[200] pointer-events-none', position)}
                style={{
                  background: `radial-gradient(circle at ${position.includes('left') ? '0%' : '100%'} ${position.includes('top') ? '0%' : '100%'}, ${glowConfig.shadowColor}, transparent 70%)`,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Minimal status indicator - bottom right, very subtle */}
      <AnimatePresence>
        {(showActiveState || showWakeWordIndicator) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-[200] pointer-events-none"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-border/30 shadow-lg">
              {/* Mic indicator with state color */}
              <motion.div
                animate={showActiveState ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative"
              >
                <Mic 
                  className={cn(
                    "w-3.5 h-3.5",
                    showActiveState && voiceState === 'listening' && "text-green-500",
                    showActiveState && voiceState === 'thinking' && "text-amber-500",
                    showActiveState && voiceState === 'speaking' && "text-blue-500",
                    showWakeWordIndicator && "text-muted-foreground"
                  )}
                />
                {/* Pulse ring for wake word listening */}
                {showWakeWordIndicator && (
                  <motion.span
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border border-muted-foreground"
                  />
                )}
              </motion.div>

              {/* State label */}
              <span className={cn(
                "text-xs font-medium",
                showActiveState && voiceState === 'listening' && "text-green-500",
                showActiveState && voiceState === 'thinking' && "text-amber-500",
                showActiveState && voiceState === 'speaking' && "text-blue-500",
                showWakeWordIndicator && "text-muted-foreground"
              )}>
                {showActiveState ? glowConfig.label : 'Hey Arlo'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript preview - shows briefly while speaking, very minimal */}
      <AnimatePresence>
        {transcript && isActive && voiceState === 'listening' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none max-w-md"
          >
            <div className="px-4 py-2 rounded-full bg-background/70 backdrop-blur-md border border-green-500/30 shadow-lg">
              <p className="text-sm text-foreground/80 text-center truncate">
                {transcript}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error indicator - minimal, bottom left */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="fixed bottom-4 left-4 z-[200] pointer-events-none"
          >
            <div className="px-3 py-1.5 rounded-full bg-destructive/10 backdrop-blur-md border border-destructive/30">
              <span className="text-xs text-destructive">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
