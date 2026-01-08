import { motion } from "framer-motion";
import { Flame, Zap, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileModuleCard } from "../MobileModuleCard";
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

  return (
    <MobileModuleCard
      title="Habits"
      icon={Flame}
      onClick={() => navigate("/habits")}
      actionLabel="Open"
      isCompact
    >
      {/* Stats row */}
      <div className="flex items-center gap-4">
        {/* Circular progress */}
        <div className="relative w-14 h-14">
          <svg className="w-full h-full -rotate-90">
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
            <span className="text-sm font-bold text-foreground">
              {completed}/{total}
            </span>
          </div>
        </div>

        {/* Info chips */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-medium">{streak} day streak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium">{xp} XP</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {remaining > 0 
              ? `${remaining} habit${remaining !== 1 ? "s" : ""} remaining today`
              : "All habits complete! 🎉"
            }
          </p>
        </div>
      </div>
    </MobileModuleCard>
  );
}
