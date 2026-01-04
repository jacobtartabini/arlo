import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Trophy, Target, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UserProgress, HabitWithStreak } from "@/types/habits";
import { xpToNextLevel } from "@/types/habits";
import { isScheduledForToday } from "@/hooks/useHabits";

interface ProgressHeaderProps {
  progress: UserProgress | null;
  habits: HabitWithStreak[];
  xpPopup: { amount: number; visible: boolean };
}

export function ProgressHeader({ progress, habits, xpPopup }: ProgressHeaderProps) {
  const todaysHabits = habits.filter(h => h.enabled && isScheduledForToday(h));
  const completedCount = todaysHabits.filter(h => h.completedToday).length;
  const totalCount = todaysHabits.length;
  const alignmentScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isDailyWin = alignmentScore >= 80;
  const xpInfo = progress ? xpToNextLevel(progress.totalXp) : { current: 0, next: 100, progress: 0 };

  return (
    <div className="relative">
      {/* XP Popup */}
      <AnimatePresence>
        {xpPopup.visible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-white font-bold text-sm shadow-lg shadow-amber-500/30">
              <Zap className="h-4 w-4" />
              +{xpPopup.amount} XP
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {/* Daily Alignment - Large */}
        <div className="col-span-2 p-4 rounded-2xl bg-card border">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl font-bold text-xl transition-all",
              isDailyWin 
                ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25" 
                : "bg-primary/10 text-primary"
            )}>
              {alignmentScore}%
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daily Alignment</p>
              {isDailyWin ? (
                <motion.p 
                  className="text-sm font-semibold text-amber-500 flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Daily Win!
                </motion.p>
              ) : (
                <p className="text-sm font-medium">
                  {completedCount}/{totalCount} done
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Level & XP */}
        <div className="p-4 rounded-2xl bg-card border">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Level</span>
          </div>
          <p className="text-2xl font-bold">{progress?.currentLevel || 1}</p>
          <Progress value={xpInfo.progress} className="h-1 mt-2" />
        </div>

        {/* Streak */}
        <div className="p-4 rounded-2xl bg-card border">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Streak</span>
          </div>
          <p className="text-2xl font-bold">{progress?.currentStreak || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">days</p>
        </div>
      </div>

      {/* Available XP bar */}
      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Available XP</span>
        </div>
        <span className="font-bold text-lg text-amber-500">{progress?.availableXp || 0}</span>
      </div>
    </div>
  );
}
