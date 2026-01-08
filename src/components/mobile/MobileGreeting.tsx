import { useMemo } from "react";
import { motion } from "framer-motion";
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

  const pendingTasks = tasksToday - tasksDone;
  const pendingHabits = habitsToday - habitsDone;
  const allDone = pendingTasks === 0 && pendingHabits === 0 && tasksToday > 0;

  return (
    <motion.header 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-safe-top"
    >
      {/* Minimal date */}
      <p className="text-[13px] text-muted-foreground/70 font-medium">
        {format(new Date(), "EEEE, MMM d")}
      </p>
      
      {/* Large greeting */}
      <h1 className="text-[28px] font-semibold text-foreground tracking-tight mt-1">
        {greeting}
      </h1>
      
      {/* Status pills */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {pendingTasks > 0 && (
          <StatusPill 
            label={`${pendingTasks} task${pendingTasks !== 1 ? 's' : ''}`}
            variant="default"
          />
        )}
        {pendingHabits > 0 && (
          <StatusPill 
            label={`${pendingHabits} habit${pendingHabits !== 1 ? 's' : ''}`}
            variant="muted"
          />
        )}
        {eventsToday > 0 && (
          <StatusPill 
            label={`${eventsToday} event${eventsToday !== 1 ? 's' : ''}`}
            variant="muted"
          />
        )}
        {allDone && (
          <StatusPill 
            label="All caught up ✓"
            variant="success"
          />
        )}
        {tasksToday === 0 && habitsToday === 0 && (
          <StatusPill 
            label="Nothing scheduled"
            variant="muted"
          />
        )}
      </div>
    </motion.header>
  );
}

function StatusPill({ 
  label, 
  variant = "default" 
}: { 
  label: string; 
  variant: "default" | "muted" | "success";
}) {
  const variants = {
    default: "bg-primary/15 text-primary",
    muted: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <span className={`
      inline-flex items-center px-2.5 py-1 rounded-full
      text-[12px] font-medium
      ${variants[variant]}
    `}>
      {label}
    </span>
  );
}
