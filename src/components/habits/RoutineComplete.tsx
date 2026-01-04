import { motion } from "framer-motion";
import { Check, Sparkles, Trophy, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoutineWithHabits } from "@/types/habits";

interface RoutineCompleteProps {
  routine: RoutineWithHabits;
  earnedXp: number;
  bonuses: string[];
  onClose: () => void;
}

export function RoutineComplete({ routine, earnedXp, bonuses, onClose }: RoutineCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6"
    >
      {/* Celebration Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="h-12 w-12 text-white" />
        </div>
        
        {/* Sparkles around */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="absolute"
            style={{
              top: `${50 + 50 * Math.sin((i * Math.PI * 2) / 6)}%`,
              left: `${50 + 50 * Math.cos((i * Math.PI * 2) / 6)}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </motion.div>
        ))}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-center mb-2"
      >
        {routine.name} Complete!
      </motion.h2>

      {/* XP Earned */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 text-lg mb-6"
      >
        <Trophy className="h-5 w-5 text-primary" />
        <span className="font-semibold text-primary">+{earnedXp} XP earned</span>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6"
      >
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <div className="text-2xl font-bold text-primary">{routine.totalCount}</div>
          <div className="text-xs text-muted-foreground">Habits done</div>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold">
              {Math.max(...routine.habits.map(h => h.streak))}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">Best streak</div>
        </div>
      </motion.div>

      {/* Bonuses */}
      {bonuses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-2 justify-center mb-8"
        >
          {bonuses.map((bonus, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
            >
              {bonus}
            </span>
          ))}
        </motion.div>
      )}

      {/* Reward Description */}
      {routine.rewardDescription && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-muted-foreground text-center mb-8 max-w-xs"
        >
          Time for your reward: {routine.rewardDescription}
        </motion.p>
      )}

      {/* Close Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Button size="lg" onClick={onClose} className="px-8">
          Done
        </Button>
      </motion.div>
    </motion.div>
  );
}
