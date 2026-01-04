import { motion } from "framer-motion";
import { Play, Check, Sun, Moon, Flame, MoreHorizontal, Clock, Sunrise, Sunset, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { RoutineWithHabits } from "@/types/habits";
import { DAY_NAMES } from "@/types/habits";

interface RoutineCardProps {
  routine: RoutineWithHabits;
  onStart: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RoutineCard({ routine, onStart, onEdit, onDelete }: RoutineCardProps) {
  const progressPercent = routine.totalCount > 0 
    ? Math.round((routine.completedCount / routine.totalCount) * 100) 
    : 0;
  const isComplete = routine.completedCount === routine.totalCount && routine.totalCount > 0;
  const today = new Date().getDay();
  const isScheduledToday = routine.scheduleDays?.includes(today) ?? true;

  const getIcon = () => {
    if (isComplete) return <Check className="h-5 w-5" />;
    switch (routine.routineType) {
      case 'morning':
        return <Sun className="h-5 w-5" />;
      case 'night':
        return <Moon className="h-5 w-5" />;
      default:
        return <Flame className="h-5 w-5" />;
    }
  };

  const getColors = () => {
    if (isComplete) return "bg-emerald-500 text-white";
    switch (routine.routineType) {
      case 'morning':
        return "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";
      case 'night':
        return "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  // Format time window based on trigger type
  const formatTimeWindow = () => {
    const triggerType = routine.triggerType ?? 'time';
    
    if (triggerType === 'sunrise') {
      const offset = routine.sunriseOffsetMinutes ?? 0;
      if (offset === 0) return { icon: Sunrise, text: 'At sunrise' };
      const label = offset > 0 ? `${offset}m after sunrise` : `${Math.abs(offset)}m before sunrise`;
      return { icon: Sunrise, text: label };
    }
    
    if (triggerType === 'sunset') {
      const offset = routine.sunriseOffsetMinutes ?? 0;
      if (offset === 0) return { icon: Sunset, text: 'At sunset' };
      const label = offset > 0 ? `${offset}m after sunset` : `${Math.abs(offset)}m before sunset`;
      return { icon: Sunset, text: label };
    }
    
    if (triggerType === 'location') {
      return { icon: MapPin, text: 'When arriving' };
    }
    
    // Default time trigger
    if (!routine.startTime) return null;
    const parts = [routine.startTime];
    if (routine.endTime) parts.push(routine.endTime);
    return { icon: Clock, text: parts.join(' - ') };
  };

  const timeInfo = formatTimeWindow();

  // Format repeat pattern
  const formatRepeat = () => {
    if (routine.repeatInterval === 1 && routine.repeatUnit === 'day') {
      return null; // Daily is default, don't show
    }
    if (routine.repeatInterval === 1) {
      return `Weekly`;
    }
    return `Every ${routine.repeatInterval} ${routine.repeatUnit}s`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card p-4 transition-all",
        isComplete && "border-emerald-500/30 bg-emerald-500/5",
        !isScheduledToday && "opacity-60"
      )}
    >
      {/* Header Row */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <motion.div 
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all",
            getColors()
          )}
          animate={isComplete ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {getIcon()}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold truncate">{routine.name}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Time Window */}
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {timeInfo && (
              <span className="flex items-center gap-1">
                <timeInfo.icon className="h-3 w-3" />
                {timeInfo.text}
              </span>
            )}
            {formatRepeat() && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                {formatRepeat()}
              </span>
            )}
          </div>

          {/* Schedule Days */}
          <div className="flex items-center gap-1 mt-2">
            {DAY_NAMES.map((day, i) => {
              const isActive = routine.scheduleDays?.includes(i) ?? true;
              const isTodayActive = i === today;
              return (
                <span
                  key={i}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isActive && isTodayActive && "bg-primary text-primary-foreground",
                    isActive && !isTodayActive && "bg-primary/10 text-primary",
                    !isActive && "text-muted-foreground/50"
                  )}
                >
                  {day}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress & Action */}
      <div className="flex items-center gap-3 mt-4">
        <Progress 
          value={progressPercent} 
          className={cn(
            "flex-1 h-2",
            isComplete && "[&>div]:bg-emerald-500"
          )} 
        />
        <span className="text-sm text-muted-foreground tabular-nums shrink-0">
          {routine.completedCount}/{routine.totalCount}
        </span>
        
        {!isComplete && isScheduledToday && routine.habits.length > 0 && (
          <Button 
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={onStart}
          >
            <Play className="h-4 w-4" />
            Start
          </Button>
        )}
        
        {isComplete && (
          <span className="flex items-center gap-1 text-sm text-emerald-500 font-medium shrink-0">
            <Check className="h-4 w-4" />
            Done
          </span>
        )}
      </div>
    </motion.div>
  );
}
