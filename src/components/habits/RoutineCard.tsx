import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sun, Moon, Flame, Check, SkipForward, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { RoutineWithHabits } from "@/types/habits";
import { HabitCard } from "./HabitCard";

interface RoutineCardProps {
  routine: RoutineWithHabits;
  onCompleteHabit: (habitId: string, skipped?: boolean) => void;
}

export function RoutineCard({ routine, onCompleteHabit }: RoutineCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const progressPercent = routine.totalCount > 0 
    ? Math.round((routine.completedCount / routine.totalCount) * 100) 
    : 0;
  const isComplete = routine.completedCount === routine.totalCount && routine.totalCount > 0;

  const getIcon = () => {
    switch (routine.routineType) {
      case 'morning':
        return <Sun className="h-5 w-5" />;
      case 'night':
        return <Moon className="h-5 w-5" />;
      default:
        return <Flame className="h-5 w-5" />;
    }
  };

  const getIconBg = () => {
    switch (routine.routineType) {
      case 'morning':
        return "bg-amber-500/10 text-amber-500";
      case 'night':
        return "bg-indigo-500/10 text-indigo-500";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isComplete && "bg-emerald-500/5 border-emerald-500/20"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-4 h-auto flex items-center gap-3 justify-start hover:bg-transparent"
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", getIconBg())}>
              {isComplete ? <Check className="h-5 w-5" /> : getIcon()}
            </div>
            
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{routine.name}</span>
                {isComplete && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                    +25 XP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <Progress value={progressPercent} className="h-1.5 w-24" />
                <span className="text-xs text-muted-foreground">
                  {routine.completedCount}/{routine.totalCount}
                </span>
              </div>
            </div>

            <div className="shrink-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {routine.habits.map((habit, index) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-4"
              >
                {/* Connecting line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-px bg-border" />
                
                <HabitCard
                  habit={habit}
                  onComplete={() => onCompleteHabit(habit.id)}
                  onSkip={() => onCompleteHabit(habit.id, true)}
                  compact
                />
              </motion.div>
            ))}

            {routine.habits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No habits in this routine yet
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
