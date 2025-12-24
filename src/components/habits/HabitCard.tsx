import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, SkipForward, ChevronDown, ChevronUp, Flame, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HabitWithStreak } from "@/types/habits";

interface HabitCardProps {
  habit: HabitWithStreak;
  onComplete: () => void;
  onSkip: () => void;
  compact?: boolean;
}

export function HabitCard({ habit, onComplete, onSkip, compact = false }: HabitCardProps) {
  const isCompleted = habit.completedToday;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          compact ? "p-3" : "p-4",
          isCompleted && "bg-emerald-500/5 border-emerald-500/20"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Completion Button */}
          <Button
            variant={isCompleted ? "default" : "outline"}
            size="icon"
            className={cn(
              "h-10 w-10 rounded-xl shrink-0 transition-all",
              isCompleted && "bg-emerald-500 hover:bg-emerald-600 border-emerald-500"
            )}
            onClick={onComplete}
            disabled={isCompleted}
          >
            <Check className={cn("h-5 w-5", isCompleted && "text-white")} />
          </Button>

          {/* Habit Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn(
                "font-medium truncate",
                isCompleted && "text-muted-foreground line-through"
              )}>
                {habit.title}
              </p>
              {habit.difficulty === 'hard' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">
                  +15 XP
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {habit.streak > 0 && (
                <span className="flex items-center gap-1 text-xs text-orange-500">
                  <Flame className="h-3 w-3" />
                  {habit.streak} days
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {habit.last7Days}/7 this week
              </span>
            </div>
          </div>

          {/* Skip Button */}
          {!isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={onSkip}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Completion animation overlay */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              className="absolute inset-y-0 left-0 w-1 bg-emerald-500 origin-left"
            />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
