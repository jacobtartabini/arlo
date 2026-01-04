import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { Sun, Moon, Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineWithHabits } from "@/types/habits";

interface WeeklyCalendarProps {
  routines: RoutineWithHabits[];
  onSelectRoutine?: (routine: RoutineWithHabits) => void;
}

export function WeeklyCalendar({ routines, onSelectRoutine }: WeeklyCalendarProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const getRoutinesForDay = (dayIndex: number) => {
    return routines.filter((r) => {
      const scheduleDays = r.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6];
      return scheduleDays.includes(dayIndex);
    });
  };

  const getIcon = (routine: RoutineWithHabits) => {
    switch (routine.routineType) {
      case "morning":
        return <Sun className="h-3 w-3" />;
      case "night":
        return <Moon className="h-3 w-3" />;
      default:
        return <Flame className="h-3 w-3" />;
    }
  };

  const getColors = (routine: RoutineWithHabits, isComplete: boolean) => {
    if (isComplete) return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    switch (routine.routineType) {
      case "morning":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "night":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((day) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "py-3 text-center",
                dayIsToday && "bg-primary/5"
              )}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {format(day, "EEE")}
              </p>
              <p
                className={cn(
                  "text-sm font-semibold mt-0.5",
                  dayIsToday && "text-primary"
                )}
              >
                {format(day, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Calendar Body */}
      <div className="grid grid-cols-7 min-h-[200px]">
        {weekDays.map((day, dayIndex) => {
          const dayRoutines = getRoutinesForDay(dayIndex);
          const dayIsToday = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-1.5 border-r last:border-r-0 min-h-[140px]",
                dayIsToday && "bg-primary/5"
              )}
            >
              <div className="space-y-1">
                {dayRoutines.map((routine) => {
                  const isComplete =
                    routine.completedCount === routine.totalCount &&
                    routine.totalCount > 0 &&
                    dayIsToday;

                  return (
                    <motion.button
                      key={routine.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelectRoutine?.(routine)}
                      className={cn(
                        "w-full p-1.5 rounded-lg border text-left transition-all",
                        "flex items-start gap-1",
                        getColors(routine, isComplete)
                      )}
                    >
                      <span className="shrink-0 mt-0.5">
                        {isComplete ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          getIcon(routine)
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium truncate leading-tight">
                          {routine.name}
                        </p>
                        {routine.startTime && (
                          <p className="text-[9px] opacity-70 mt-0.5">
                            {routine.startTime}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
