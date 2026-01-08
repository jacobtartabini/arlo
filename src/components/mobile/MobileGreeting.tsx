import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface MobileGreetingProps {
  tasksToday: number;
  tasksDone: number;
  eventsToday: number;
  habitsToday: number;
  habitsDone: number;
  alerts?: number;
}

export function MobileGreeting({
  tasksToday,
  tasksDone,
  eventsToday,
  habitsToday,
  habitsDone,
  alerts = 0,
}: MobileGreetingProps) {
  const hour = new Date().getHours();
  
  const greeting = useMemo(() => {
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }, [hour]);

  const contextSummary = useMemo(() => {
    const parts: string[] = [];
    
    const pendingTasks = tasksToday - tasksDone;
    if (pendingTasks > 0) {
      parts.push(`${pendingTasks} task${pendingTasks !== 1 ? "s" : ""} left`);
    } else if (tasksToday > 0) {
      parts.push("All tasks done!");
    }
    
    if (eventsToday > 0) {
      parts.push(`${eventsToday} event${eventsToday !== 1 ? "s" : ""}`);
    }
    
    const pendingHabits = habitsToday - habitsDone;
    if (pendingHabits > 0) {
      parts.push(`${pendingHabits} habit${pendingHabits !== 1 ? "s" : ""} to go`);
    }
    
    if (parts.length === 0) {
      return "You're all caught up";
    }
    
    return parts.join(" • ");
  }, [tasksToday, tasksDone, eventsToday, habitsToday, habitsDone]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-4 pb-2"
    >
      {/* Date chip */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d")}
        </span>
        {alerts > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-destructive">
            <AlertCircle className="h-3 w-3" />
            {alerts}
          </span>
        )}
      </div>
      
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-foreground tracking-tight">
        {greeting}
      </h1>
      
      {/* Summary */}
      <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
        {contextSummary}
        {tasksToday > 0 && tasksDone === tasksToday && (
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        )}
      </p>
    </motion.div>
  );
}
