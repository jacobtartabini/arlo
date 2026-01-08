import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobileHabitsCardProps {
  completed: number;
  total: number;
  streak: number;
  xp: number;
}

export function MobileHabitsCard({
  completed,
  total,
  streak,
  xp,
}: MobileHabitsCardProps) {
  const navigate = useNavigate();
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;
  const remaining = total - completed;
  const allDone = remaining === 0 && total > 0;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate("/habits")}
      className="rounded-2xl bg-card border border-border/50 p-4 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-[15px] font-semibold text-foreground">Habits</h3>
          </div>
          
          <p className="text-[13px] text-muted-foreground">
            {allDone 
              ? "All done for today! 🎉" 
              : `${remaining} remaining`
            }
          </p>
        </div>

        {/* Circular progress */}
        <div className="relative w-14 h-14">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="24"
              className="fill-none stroke-muted"
              strokeWidth="4"
            />
            <motion.circle
              cx="28"
              cy="28"
              r="24"
              className="fill-none stroke-primary"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={150.8}
              initial={{ strokeDashoffset: 150.8 }}
              animate={{ strokeDashoffset: 150.8 - (progressPercent / 100) * 150.8 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] font-bold text-foreground">
              {completed}/{total}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-orange-500/10 flex items-center justify-center">
            <Flame className="h-3 w-3 text-orange-500" />
          </div>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">{streak}</span> day streak
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center">
            <Zap className="h-3 w-3 text-amber-500" />
          </div>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">{xp}</span> XP
          </span>
        </div>
      </div>
    </motion.div>
  );
}
