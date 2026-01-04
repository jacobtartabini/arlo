import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, SkipForward, Pause, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { RoutineWithHabits, HabitWithStreak } from "@/types/habits";
import { HabitTimer } from "./HabitTimer";
import { RoutineComplete } from "./RoutineComplete";

interface FocusModeProps {
  routine: RoutineWithHabits;
  onComplete: (habitId: string, skipped?: boolean) => Promise<{ success: boolean; xpEarned: number; bonuses: string[] }>;
  onClose: () => void;
}

export function FocusMode({ routine, onComplete, onClose }: FocusModeProps) {
  // Find first incomplete habit
  const getNextHabitIndex = useCallback(() => {
    return routine.habits.findIndex(h => !h.completedToday);
  }, [routine.habits]);

  const [currentIndex, setCurrentIndex] = useState(getNextHabitIndex);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [bonuses, setBonuses] = useState<string[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);

  const currentHabit = routine.habits[currentIndex];
  const upcomingHabits = routine.habits.slice(currentIndex + 1);
  const completedCount = routine.habits.filter(h => h.completedToday).length;
  const progressPercent = routine.totalCount > 0 ? (completedCount / routine.totalCount) * 100 : 0;

  // Check if routine is complete
  useEffect(() => {
    if (completedCount === routine.totalCount && routine.totalCount > 0) {
      setShowComplete(true);
    }
  }, [completedCount, routine.totalCount]);

  // Update current index when habits change
  useEffect(() => {
    const nextIndex = getNextHabitIndex();
    if (nextIndex === -1 && routine.totalCount > 0) {
      setShowComplete(true);
    } else if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
    }
  }, [routine.habits, getNextHabitIndex, routine.totalCount]);

  const handleComplete = useCallback(async () => {
    if (!currentHabit || isCompleting) return;

    setIsCompleting(true);
    const result = await onComplete(currentHabit.id, false);
    
    if (result.success) {
      setEarnedXp(prev => prev + result.xpEarned);
      setBonuses(prev => [...prev, ...result.bonuses]);
      setTimerRunning(false);
      
      // Move to next habit or show completion
      const nextIncomplete = routine.habits.findIndex((h, i) => i > currentIndex && !h.completedToday);
      if (nextIncomplete !== -1) {
        setCurrentIndex(nextIncomplete);
      }
    }
    setIsCompleting(false);
  }, [currentHabit, isCompleting, onComplete, currentIndex, routine.habits]);

  const handleSkip = useCallback(async () => {
    if (!currentHabit || isCompleting) return;

    setIsCompleting(true);
    await onComplete(currentHabit.id, true);
    setTimerRunning(false);
    
    // Move to next habit
    const nextIncomplete = routine.habits.findIndex((h, i) => i > currentIndex && !h.completedToday);
    if (nextIncomplete !== -1) {
      setCurrentIndex(nextIncomplete);
    }
    setIsCompleting(false);
  }, [currentHabit, isCompleting, onComplete, currentIndex, routine.habits]);

  const handleTimerComplete = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // Show completion screen
  if (showComplete) {
    return (
      <RoutineComplete
        routine={routine}
        earnedXp={earnedXp}
        bonuses={bonuses}
        onClose={onClose}
      />
    );
  }

  // No habits to show
  if (!currentHabit) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-6"
      >
        <div className="text-center">
          <p className="text-muted-foreground mb-4">All habits completed!</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-500">●</span>
          <span className="font-medium">Focus</span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentHabit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm text-center"
          >
            {/* Current Habit Title */}
            <h2 className="text-2xl font-bold mb-8">{currentHabit.title}</h2>

            {/* Timer or Simple Check */}
            {currentHabit.durationMinutes ? (
              <HabitTimer
                durationMinutes={currentHabit.durationMinutes}
                isRunning={timerRunning}
                onComplete={handleTimerComplete}
                onToggle={() => setTimerRunning(prev => !prev)}
              />
            ) : (
              <div className="w-32 h-32 mx-auto mb-8 rounded-full border-4 border-primary/20 flex items-center justify-center">
                <span className="text-4xl">{currentHabit.icon || '✓'}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={() => setTimerRunning(prev => !prev)}
                disabled={!currentHabit.durationMinutes}
              >
                {timerRunning ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
              
              <Button
                size="icon"
                className={cn(
                  "h-16 w-16 rounded-full transition-all",
                  isCompleting && "animate-pulse"
                )}
                onClick={handleComplete}
                disabled={isCompleting}
              >
                <Check className="h-8 w-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={handleSkip}
                disabled={isCompleting}
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer - Up Next & Progress */}
      <footer className="p-4 border-t bg-muted/30">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-4">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground">
            {completedCount}/{routine.totalCount}
          </span>
        </div>

        {/* Up Next */}
        {upcomingHabits.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Up next:</span>
            <span className="font-medium text-foreground">
              {upcomingHabits[0].title}
            </span>
            {upcomingHabits[0].durationMinutes && (
              <span className="text-xs">({upcomingHabits[0].durationMinutes}m)</span>
            )}
          </div>
        )}

        {/* Routine End Time */}
        {routine.endTime && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Ends at {routine.endTime}</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              Reorder
            </Button>
          </div>
        )}
      </footer>
    </motion.div>
  );
}
