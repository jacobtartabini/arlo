import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";

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
    if (hour < 5) return "Night owl?";
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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="px-5 pt-safe-top relative"
    >
      {/* Subtle ambient glow */}
      <div className="absolute -top-20 left-1/4 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Date with icon */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-xs font-medium tracking-wide uppercase opacity-70">
          {format(new Date(), "EEEE")}
        </span>
        <span className="text-xs opacity-40">•</span>
        <span className="text-xs font-medium opacity-70">
          {format(new Date(), "MMMM d")}
        </span>
      </div>
      
      {/* Large greeting with editorial flair */}
      <h1 className="text-3xl font-display font-semibold text-foreground tracking-tight mt-2">
        {greeting}
      </h1>
      
      {/* Status pills */}
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {pendingTasks > 0 && (
          <StatusPill 
            label={`${pendingTasks} task${pendingTasks !== 1 ? 's' : ''}`}
            variant="primary"
          />
        )}
        {pendingHabits > 0 && (
          <StatusPill 
            label={`${pendingHabits} habit${pendingHabits !== 1 ? 's' : ''}`}
            variant="accent"
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
            label="All done"
            variant="success"
            icon={<Sparkles className="h-3 w-3" />}
          />
        )}
        {tasksToday === 0 && habitsToday === 0 && (
          <StatusPill 
            label="Clear day"
            variant="muted"
          />
        )}
      </div>
    </motion.header>
  );
}

function StatusPill({ 
  label, 
  variant = "primary",
  icon
}: { 
  label: string; 
  variant: "primary" | "accent" | "muted" | "success";
  icon?: React.ReactNode;
}) {
  const variants = {
    primary: "bg-primary/15 text-primary border-primary/20",
    accent: "bg-accent/15 text-accent border-accent/20",
    muted: "bg-muted text-muted-foreground border-border/50",
    success: "bg-success/15 text-success border-success/20",
  };

  return (
    <motion.span 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center gap-1 px-3 py-1.5 rounded-full
        text-xs font-medium border
        ${variants[variant]}
      `}
    >
      {icon}
      {label}
    </motion.span>
  );
}
