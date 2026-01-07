import {
  useState,
  useCallback,
  type KeyboardEvent,
  type FocusEvent,
  type FormEvent,
} from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Scan, Mic, MicOff } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVoiceState } from "@/providers/VoiceStateProvider";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const PRESET_ZOOM_LEVELS = [50, 75, 100, 125, 150, 175, 200];

interface StatusChipProps {
  gridScale: number;
  isFit: boolean;
  onPresetSelect: (percent: number) => void;
  onFitSelect: () => void;
  onRecenter: () => void;
  onCustomZoomSubmit: (percent: number) => void;
}

export function StatusChip({
  gridScale,
  isFit,
  onPresetSelect,
  onFitSelect,
  onRecenter,
  onCustomZoomSubmit,
}: StatusChipProps) {
  const { voiceState, isSessionActive, isWakeWordListening, isHandsFreeEnabled, isMuted, toggleMute } = useVoiceState();
  const [isChipInteracting, setIsChipInteracting] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [customZoom, setCustomZoom] = useState(String(Math.round(gridScale * 100)));

  const zoomPercent = Math.round(gridScale * 100);
  const isChipExpanded = isChipInteracting || isZoomMenuOpen;

  // Determine status dot color based on voice state
  const getStatusDotColor = () => {
    if (isMuted) {
      return 'bg-muted-foreground/50'; // Muted state
    }
    
    if (!isHandsFreeEnabled) {
      return 'bg-emerald-500'; // Default online state
    }
    
    if (isSessionActive) {
      switch (voiceState) {
        case 'listening':
          return 'bg-green-500';
        case 'thinking':
          return 'bg-amber-500';
        case 'speaking':
          return 'bg-blue-500';
        default:
          return 'bg-emerald-500';
      }
    }
    
    // Wake word listening - subtle pulsing emerald
    if (isWakeWordListening) {
      return 'bg-emerald-500';
    }
    
    return 'bg-emerald-500';
  };

  // Get status text based on voice state
  const getStatusText = () => {
    if (isMuted) {
      return 'Muted';
    }
    
    if (!isHandsFreeEnabled) {
      return 'Arlo Online';
    }
    
    if (isSessionActive) {
      switch (voiceState) {
        case 'listening':
          return 'Listening...';
        case 'thinking':
          return 'Thinking...';
        case 'speaking':
          return 'Speaking...';
        default:
          return 'Arlo Online';
      }
    }
    
    if (isWakeWordListening) {
      return 'Hey Arlo';
    }
    
    return 'Arlo Online';
  };

  const handleMuteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  }, [toggleMute]);

  const handleChipEnter = useCallback(() => {
    setIsChipInteracting(true);
  }, []);

  const handleChipLeave = useCallback(() => {
    if (!isZoomMenuOpen) {
      setIsChipInteracting(false);
    }
  }, [isZoomMenuOpen]);

  const handleChipBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }
      if (!isZoomMenuOpen) {
        setIsChipInteracting(false);
      }
    },
    [isZoomMenuOpen]
  );

  const handleChipKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setIsChipInteracting(true);
      }
      if (event.key === "Escape") {
        setIsChipInteracting(false);
      }
    },
    []
  );

  const handleCustomSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsed = parseFloat(customZoom);
      if (!Number.isFinite(parsed)) return;
      onCustomZoomSubmit(parsed);
      setIsZoomMenuOpen(false);
    },
    [customZoom, onCustomZoomSubmit]
  );

  const handlePresetClick = useCallback(
    (level: number) => {
      onPresetSelect(level);
      setIsZoomMenuOpen(false);
    },
    [onPresetSelect]
  );

  const handleFitClick = useCallback(() => {
    onFitSelect();
    setIsZoomMenuOpen(false);
  }, [onFitSelect]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5 }}
      onHoverStart={handleChipEnter}
      onHoverEnd={handleChipLeave}
      onFocusCapture={handleChipEnter}
      onBlurCapture={handleChipBlur}
      onKeyDown={handleChipKeyDown}
      aria-label="Arlo status controls"
      aria-expanded={isChipExpanded}
      role="group"
      tabIndex={0}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          badgeVariants({ variant: "secondary" }),
          "rounded-full border border-border/60 bg-muted/80 text-muted-foreground shadow-sm backdrop-blur transition-colors duration-300 ease-out overflow-hidden",
          isChipExpanded ? "gap-3 px-3 py-1.5" : "gap-1.5 px-2 py-1"
        )}
      >
        {/* Status indicator */}
        <span className="flex items-center gap-1.5 relative">
          <motion.span 
            className={cn("h-1.5 w-1.5 rounded-full", getStatusDotColor())}
            animate={!isMuted && (isSessionActive || isWakeWordListening) ? {
              scale: [1, 1.3, 1],
              opacity: [1, 0.8, 1],
            } : {}}
            transition={{
              duration: isSessionActive ? 1 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {isChipExpanded ? (
            <span className={cn(
              isMuted && 'text-muted-foreground/50',
              isSessionActive && voiceState === 'listening' && !isMuted && 'text-green-500',
              isSessionActive && voiceState === 'thinking' && !isMuted && 'text-amber-500',
              isSessionActive && voiceState === 'speaking' && !isMuted && 'text-blue-500',
            )}>
              {getStatusText()}
            </span>
          ) : (
            <span className="sr-only">{getStatusText()}</span>
          )}
        </span>

        {/* Expanded controls */}
        {isChipExpanded && (
          <div className="flex items-center gap-2">
            {/* Mute button - only show when hands-free is enabled */}
            {isHandsFreeEnabled && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isMuted 
                        ? "text-destructive/80 hover:text-destructive" 
                        : "text-muted-foreground/80 hover:text-foreground"
                    )}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    onClick={handleMuteClick}
                  >
                    {isMuted ? (
                      <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isMuted ? "Unmute" : "Mute"}
                </TooltipContent>
              </Tooltip>
            )}
            
            <span className="text-muted-foreground/60" aria-hidden="true">•</span>

            {/* Zoom dropdown */}
            <DropdownMenu open={isZoomMenuOpen} onOpenChange={setIsZoomMenuOpen}>
              <div className="flex items-center gap-1">
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-muted-foreground/80 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Adjust dashboard zoom"
                  >
                    <span>{isFit ? "Fit" : `${zoomPercent}%`}</span>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground/80 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Recenter canvas"
                  onClick={onRecenter}
                >
                  <Scan className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Zoom options
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PRESET_ZOOM_LEVELS.map((level) => (
                  <DropdownMenuItem
                    key={level}
                    onSelect={(event) => {
                      event.preventDefault();
                      handlePresetClick(level);
                    }}
                    className="flex items-center justify-between text-sm"
                  >
                    {level}%
                    {!isFit && zoomPercent === level ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleFitClick();
                  }}
                  className="flex items-center justify-between text-sm"
                >
                  Fit to screen
                  {isFit ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form onSubmit={handleCustomSubmit} className="grid gap-2 px-2 py-2">
                  <label
                    htmlFor="dashboard-custom-zoom"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Custom zoom
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="dashboard-custom-zoom"
                      value={customZoom}
                      onChange={(event) =>
                        setCustomZoom(event.target.value.replace(/[^0-9.]/g, ""))
                      }
                      inputMode="decimal"
                      placeholder="120"
                      className="h-8"
                    />
                    <Button type="submit" size="sm">
                      Apply
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Enter a value between 50% and 200%.
                  </p>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
