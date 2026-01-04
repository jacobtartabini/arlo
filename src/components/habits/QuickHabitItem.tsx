import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, TrendingUp, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HabitWithStreak } from "@/types/habits";

interface QuickHabitItemProps {
  habit: HabitWithStreak;
  onComplete: () => Promise<void> | Promise<any>;
  onSkip: () => Promise<void> | Promise<any>;
}

export function QuickHabitItem({ habit, onComplete, onSkip }: QuickHabitItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isCompleted = habit.completedToday || showSuccess;

  const handleComplete = useCallback(async () => {
    if (isCompleting || isCompleted) return;
    
    setIsCompleting(true);
    setShowSuccess(true);
    
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  }, [isCompleting, isCompleted, onComplete]);

  const handleSkip = useCallback(async () => {
    if (isCompleting || isCompleted) return;
    
    setIsCompleting(true);
    try {
      await onSkip();
      setShowSuccess(true);
    } finally {
      setIsCompleting(false);
    }
  }, [isCompleting, isCompleted, onSkip]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-200",
        isCompleted && "bg-emerald-500/5 border-emerald-500/30"
      )}
    >
      {/* Completion indicator bar */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-full origin-center"
          />
        )}
      </AnimatePresence>

      {/* Complete button */}
      <Button
        variant={isCompleted ? "default" : "outline"}
        size="icon"
        className={cn(
          "h-10 w-10 rounded-xl shrink-0 transition-all duration-200",
          isCompleted && "bg-emerald-500 hover:bg-emerald-500 border-emerald-500",
          isCompleting && "animate-pulse"
        )}
        onClick={handleComplete}
        disabled={isCompleted}
      >
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Check className="h-5 w-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Habit info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium truncate transition-all",
            isCompleted && "text-muted-foreground line-through"
          )}>
            {habit.title}
          </span>
          {habit.difficulty === 'hard' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 shrink-0">
              +15
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {habit.streak > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-500">
              <Flame className="h-3 w-3" />
              {habit.streak}d
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {habit.last7Days}/7
          </span>
        </div>
      </div>

      {/* Skip button */}
      {!isCompleted && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={handleSkip}
          disabled={isCompleting}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}
