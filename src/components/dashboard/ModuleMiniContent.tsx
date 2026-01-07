/**
 * Mini interaction content for dashboard module tiles
 * Shows real data with subtle animations
 */

import { motion } from "framer-motion";
import { Check, Plus, Circle, FileText, ChevronRight, MapPin, Plane, TrendingDown, TrendingUp, Flame, Moon, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ModuleSize } from "@/lib/app-navigation";

interface MiniContentProps {
  moduleId: string;
  size: ModuleSize;
  data: {
    todayTasks: { id: string; title: string; done: boolean; priority: number }[];
    tasksCompletedToday: number;
    tasksDueToday: number;
    habitsCompletedToday: number;
    totalHabitsToday: number;
    currentStreak: number;
    totalXp: number;
    recentNotes: { id: string; title: string; updatedAt: Date }[];
    totalNotes: number;
    notesThisWeek: number;
    monthlySpending: number;
    monthlyBudget: number;
    recentTransactions: { id: string; name: string; amount: number }[];
    recentPlaces: { id: string; name: string; address?: string }[];
    savedPlacesCount: number;
    upcomingTrips: { id: string; name: string; startDate: Date }[];
    activityScore: number;
    sleepHours: number;
  };
  onClick?: (e: React.MouseEvent) => void;
}

// Animated progress ring
function ProgressRing({ 
  progress, 
  size = 32, 
  strokeWidth = 3,
  className 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className={className}>
      <circle
        className="text-muted/30"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <motion.circle
        className="text-primary"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          strokeDasharray: circumference,
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
      />
    </svg>
  );
}

// Mini task list for Today module
function TodayMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const isTertiary = size === "tertiary";
  const tasks = data.todayTasks.slice(0, isTertiary ? 2 : 3);
  const remaining = data.tasksDueToday - tasks.length;

  if (tasks.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground/60 italic">
        No tasks scheduled
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task, i) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-1.5 group/task"
        >
          <div className={cn(
            "w-3 h-3 rounded-full border flex items-center justify-center shrink-0 transition-colors",
            task.done 
              ? "bg-primary/20 border-primary/40" 
              : "border-muted-foreground/30 group-hover/task:border-primary/50"
          )}>
            {task.done && <Check className="w-2 h-2 text-primary" />}
          </div>
          <span className={cn(
            "text-[10px] truncate leading-tight",
            task.done ? "text-muted-foreground/50 line-through" : "text-foreground/80"
          )}>
            {task.title}
          </span>
        </motion.div>
      ))}
      {remaining > 0 && (
        <div className="text-[9px] text-muted-foreground/50 pl-4">
          +{remaining} more
        </div>
      )}
    </div>
  );
}

// Habit streak and progress
function HabitsMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const progress = data.totalHabitsToday > 0 
    ? (data.habitsCompletedToday / data.totalHabitsToday) * 100 
    : 0;
  const isTertiary = size === "tertiary";

  return (
    <div className="flex items-center gap-3">
      <ProgressRing 
        progress={progress} 
        size={isTertiary ? 28 : 36} 
        strokeWidth={isTertiary ? 2.5 : 3}
      />
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-foreground">
            {data.habitsCompletedToday}/{data.totalHabitsToday}
          </span>
          <span className="text-[9px] text-muted-foreground/60">done</span>
        </div>
        {data.currentStreak > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-0.5 text-[9px] text-amber-500/80"
          >
            <Flame className="w-2.5 h-2.5" />
            <span>{data.currentStreak}d streak</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Recent notes preview
function NotesMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const notes = data.recentNotes.slice(0, size === "tertiary" ? 1 : 2);

  if (notes.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Plus className="w-3 h-3" />
        <span>New note</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {notes.map((note, i) => (
        <motion.div
          key={note.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-1.5 group/note"
        >
          <FileText className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
          <span className="text-[10px] text-foreground/70 truncate">
            {note.title}
          </span>
        </motion.div>
      ))}
      {data.notesThisWeek > 0 && (
        <div className="text-[9px] text-muted-foreground/50 pl-3.5">
          {data.notesThisWeek} this week
        </div>
      )}
    </div>
  );
}

// Finance donut and spending
function FinanceMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const progress = Math.min((data.monthlySpending / data.monthlyBudget) * 100, 100);
  const isOverBudget = data.monthlySpending > data.monthlyBudget;
  const isTertiary = size === "tertiary";

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <ProgressRing 
          progress={progress} 
          size={isTertiary ? 28 : 36}
          strokeWidth={isTertiary ? 2.5 : 3}
        />
        {isOverBudget && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <TrendingUp className="w-3 h-3 text-destructive/70" />
          </motion.div>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={cn(
          "text-xs font-medium",
          isOverBudget ? "text-destructive" : "text-foreground"
        )}>
          {formatCurrency(data.monthlySpending)}
        </span>
        <span className="text-[9px] text-muted-foreground/60">
          of {formatCurrency(data.monthlyBudget)}
        </span>
      </div>
    </div>
  );
}

// Recent places mini map placeholder
function MapsMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const places = data.recentPlaces.slice(0, size === "tertiary" ? 1 : 2);

  if (places.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground/60 italic">
        Search a place
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {places.map((place, i) => (
        <motion.div
          key={place.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-1.5"
        >
          <MapPin className="w-2.5 h-2.5 text-primary/60 shrink-0" />
          <span className="text-[10px] text-foreground/70 truncate">
            {place.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// Upcoming trips
function TravelMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const trips = data.upcomingTrips.slice(0, 1);

  if (trips.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Plus className="w-3 h-3" />
        <span>Plan trip</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {trips.map((trip) => (
        <motion.div
          key={trip.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5"
        >
          <Plane className="w-2.5 h-2.5 text-primary/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-foreground/70 truncate">
              {trip.name}
            </span>
            <span className="text-[9px] text-muted-foreground/50">
              {formatDistanceToNow(trip.startDate, { addSuffix: true })}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Health activity ring
function HealthMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const isTertiary = size === "tertiary";

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <ProgressRing 
          progress={data.activityScore} 
          size={isTertiary ? 28 : 36}
          strokeWidth={isTertiary ? 2.5 : 3}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="w-3 h-3 text-primary/60" />
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-foreground">
          {data.activityScore}%
        </span>
        <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground/60">
          <Moon className="w-2 h-2" />
          <span>{data.sleepHours}h</span>
        </div>
      </div>
    </div>
  );
}

// Security status indicator
function SecurityMiniContent({ size }: { size: ModuleSize }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2"
    >
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
        <motion.div
          className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500/40"
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
        All systems secure
      </span>
    </motion.div>
  );
}

// Files mini content
function FilesMiniContent({ size }: { size: ModuleSize }) {
  return (
    <div className="text-[10px] text-muted-foreground/60 italic">
      Browse drives
    </div>
  );
}

// Creation mini content
function CreationMiniContent({ size }: { size: ModuleSize }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
      <Plus className="w-3 h-3" />
      <span>New project</span>
    </div>
  );
}

export function ModuleMiniContent({ moduleId, size, data, onClick }: MiniContentProps) {
  const isTertiary = size === "tertiary";

  const content = (() => {
    switch (moduleId) {
      case "productivity":
        return <TodayMiniContent data={data} size={size} />;
      case "habits":
        return <HabitsMiniContent data={data} size={size} />;
      case "notes":
        return <NotesMiniContent data={data} size={size} />;
      case "finance":
        return <FinanceMiniContent data={data} size={size} />;
      case "maps":
        return <MapsMiniContent data={data} size={size} />;
      case "travel":
        return <TravelMiniContent data={data} size={size} />;
      case "health":
        return <HealthMiniContent data={data} size={size} />;
      case "security":
        return <SecurityMiniContent size={size} />;
      case "files":
        return <FilesMiniContent size={size} />;
      case "creation":
        return <CreationMiniContent size={size} />;
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        "mt-auto pt-2",
        !isTertiary && "border-t border-border/20"
      )}
      onClick={onClick}
    >
      {content}
    </motion.div>
  );
}
