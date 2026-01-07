import {
  useState,
  useCallback,
  type KeyboardEvent,
  type FocusEvent,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, ChevronDown, ExternalLink, Scan } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { badgeVariants } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useVoiceState } from "@/providers/VoiceStateProvider";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const { voiceState, isSessionActive, isWakeWordListening, isHandsFreeEnabled } = useVoiceState();
  const [isChipInteracting, setIsChipInteracting] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [customZoom, setCustomZoom] = useState(String(Math.round(gridScale * 100)));

  const zoomPercent = Math.round(gridScale * 100);
  const isChipExpanded = isChipInteracting || isZoomMenuOpen || isNotificationsOpen;

  // Get recent notifications (max 5)
  const recentNotifications = notifications.slice(0, 5);

  // Determine status dot color based on voice state
  const getStatusDotColor = () => {
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

  const handleChipEnter = useCallback(() => {
    setIsChipInteracting(true);
  }, []);

  const handleChipLeave = useCallback(() => {
    if (!isZoomMenuOpen && !isNotificationsOpen) {
      setIsChipInteracting(false);
    }
  }, [isZoomMenuOpen, isNotificationsOpen]);

  const handleChipBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }
      if (!isZoomMenuOpen && !isNotificationsOpen) {
        setIsChipInteracting(false);
      }
    },
    [isZoomMenuOpen, isNotificationsOpen]
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

  const handleViewAllNotifications = useCallback(() => {
    setIsNotificationsOpen(false);
    setIsChipInteracting(false);
    navigate("/notifications");
  }, [navigate]);

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
        {/* Status indicator with notification badge */}
        <span className="flex items-center gap-1.5 relative">
          {unreadCount > 0 && !isChipExpanded ? (
            // Collapsed: show unread count badge
            <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : (
            // No unread or expanded: show status dot with voice-aware color
            <motion.span 
              className={cn("h-1.5 w-1.5 rounded-full", getStatusDotColor())}
              animate={isSessionActive || isWakeWordListening ? {
                scale: [1, 1.3, 1],
                opacity: [1, 0.8, 1],
              } : {}}
              transition={{
                duration: isSessionActive ? 1 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          {isChipExpanded ? (
            <span className={cn(
              isSessionActive && voiceState === 'listening' && 'text-green-500',
              isSessionActive && voiceState === 'thinking' && 'text-amber-500',
              isSessionActive && voiceState === 'speaking' && 'text-blue-500',
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
            <span className="text-muted-foreground/60" aria-hidden="true">•</span>

            {/* Notifications button + popover */}
            <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-muted-foreground/80 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="View notifications"
                >
                  <Bell className="h-3.5 w-3.5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-4 min-w-4 flex items-center justify-center p-0 text-[9px] absolute -top-1 -right-1"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={12}
                className="w-80 p-0 overflow-hidden"
              >
                <div className="p-3 border-b border-border/50 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Notifications</h4>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => markAllAsRead()}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">No notifications</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="p-2 space-y-1">
                      {recentNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg transition-colors",
                            notification.read
                              ? "bg-transparent hover:bg-muted/50"
                              : "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                          )}
                          onClick={() => {
                            if (!notification.read) markAsRead(notification.id);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-xs truncate",
                                notification.read ? "text-foreground" : "text-foreground font-medium"
                              )}>
                                {notification.title}
                              </p>
                              {notification.body && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {notification.body}
                                </p>
                              )}
                              <p className="text-[9px] text-muted-foreground/60 mt-1">
                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                              </p>
                            </div>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="p-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs h-8"
                    onClick={handleViewAllNotifications}
                  >
                    View all notifications
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

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
