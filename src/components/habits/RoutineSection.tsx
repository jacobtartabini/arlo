import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sun, Moon, Flame, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { RoutineWithHabits } from "@/types/habits";
import { QuickHabitItem } from "./QuickHabitItem";

interface RoutineSectionProps {
  routine: RoutineWithHabits;
  onCompleteHabit: (habitId: string, skipped?: boolean) => Promise<void>;
}

export function RoutineSection({ routine, onCompleteHabit }: RoutineSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const progressPercent = routine.totalCount > 0 
    ? Math.round((routine.completedCount / routine.totalCount) * 100) 
    : 0;
  const isComplete = routine.completedCount === routine.totalCount && routine.totalCount > 0;

  const getIcon = () => {
    if (isComplete) return <Check className="h-5 w-5 text-white" />;
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
        return "bg-amber-500/10 text-amber-500";
      case 'night':
        return "bg-indigo-500/10 text-indigo-500";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className={cn(
      "rounded-2xl border bg-card overflow-hidden transition-all duration-300",
      isComplete && "border-emerald-500/30 bg-emerald-500/5"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-4 h-auto flex items-center gap-3 justify-start hover:bg-transparent"
          >
            <motion.div 
              className={cn("flex h-11 w-11 items-center justify-center rounded-xl shrink-0 transition-all", getColors())}
              animate={isComplete ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {getIcon()}
            </motion.div>
            
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{routine.name}</span>
                <AnimatePresence>
                  {isComplete && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500"
                    >
                      <Sparkles className="h-3 w-3" />
                      +25 XP
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <Progress 
                  value={progressPercent} 
                  className={cn(
                    "h-1.5 w-24",
                    isComplete && "[&>div]:bg-emerald-500"
                  )} 
                />
                <span className="text-xs text-muted-foreground">
                  {routine.completedCount}/{routine.totalCount}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-muted-foreground">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {routine.habits.map((habit, index) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <QuickHabitItem
                  habit={habit}
                  onComplete={() => onCompleteHabit(habit.id)}
                  onSkip={() => onCompleteHabit(habit.id, true)}
                />
              </motion.div>
            ))}

            {routine.habits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No habits in this routine yet
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
