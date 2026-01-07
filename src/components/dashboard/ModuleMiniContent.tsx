/**
 * Mini interaction content for dashboard module tiles
 * Shows real data with visual components and subtle animations
 */

import { motion } from "framer-motion";
import { 
  Check, Plus, FileText, MapPin, Plane, Flame, Moon,
  Sparkles, Clock, FolderOpen, Navigation, Calendar,
  Zap, Upload, PenLine, Shield, Monitor, Palette
} from "lucide-react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import type { ModuleSize } from "@/lib/app-navigation";
import { useCallback, memo } from "react";

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
    userLocation?: { lat: number; lng: number } | null;
    upcomingTrips: { id: string; name: string; startDate: Date }[];
    activityScore: number;
    sleepHours: number;
    connectedDevices: number;
  };
  onClick?: (e: React.MouseEvent) => void;
}

// Animated progress ring with glow effect
function ProgressRing({ 
  progress, 
  size = 40, 
  strokeWidth = 3.5,
  color = "primary",
  showGlow = false,
  children
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color?: "primary" | "amber" | "emerald" | "destructive";
  showGlow?: boolean;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const colorClasses = {
    primary: "text-primary",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    destructive: "text-destructive",
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-muted/20"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={colorClasses[color]}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      {showGlow && progress > 80 && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full",
            color === "amber" ? "bg-amber-500/10" : 
            color === "emerald" ? "bg-emerald-500/10" : 
            "bg-primary/10"
          )}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// Visual stat badge
function StatBadge({ 
  icon: Icon, 
  value, 
  label,
  color = "muted" 
}: { 
  icon: React.ElementType; 
  value: string | number; 
  label?: string;
  color?: "primary" | "amber" | "emerald" | "muted";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    muted: "bg-muted/50 text-muted-foreground",
  };

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium",
      colorClasses[color]
    )}>
      <Icon className="w-3 h-3" />
      <span>{value}</span>
      {label && <span className="opacity-60">{label}</span>}
    </div>
  );
}

// Mini task list for Today module with visual priority indicators
function TodayMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";
  const tasks = data.todayTasks.slice(0, isTertiary ? 2 : isPrimary ? 4 : 3);
  const completedCount = data.tasksCompletedToday;
  const totalToday = data.tasksDueToday;

  return (
    <div className={cn("flex", isPrimary ? "gap-4" : "gap-3")}>
      {/* Progress ring */}
      <ProgressRing 
        progress={totalToday > 0 ? (completedCount / totalToday) * 100 : 0}
        size={isPrimary ? 48 : isTertiary ? 32 : 40}
        strokeWidth={isPrimary ? 4 : 3}
        color="primary"
        showGlow
      >
        <div className="flex flex-col items-center">
          <span className={cn(
            "font-semibold text-foreground leading-none",
            isPrimary ? "text-sm" : "text-xs"
          )}>
            {completedCount}
          </span>
          <span className="text-[8px] text-muted-foreground/60">/{totalToday}</span>
        </div>
      </ProgressRing>

      {/* Task list */}
      <div className="flex-1 min-w-0 space-y-1">
        {tasks.length === 0 ? (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 py-1">
            <Sparkles className="w-3 h-3" />
            <span>All clear!</span>
          </div>
        ) : (
          tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-1.5 group/task"
            >
              {/* Priority indicator */}
              <div className={cn(
                "w-1 h-3 rounded-full shrink-0",
                task.priority >= 3 ? "bg-destructive/60" :
                task.priority >= 2 ? "bg-amber-500/60" :
                "bg-muted-foreground/20"
              )} />
              <span className={cn(
                "text-[10px] truncate leading-tight",
                task.done ? "text-muted-foreground/40 line-through" : "text-foreground/80"
              )}>
                {task.title}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// Habit streak with visual XP and progress
function HabitsMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const progress = data.totalHabitsToday > 0 
    ? (data.habitsCompletedToday / data.totalHabitsToday) * 100 
    : 0;
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";

  return (
    <div className={cn("flex items-center", isPrimary ? "gap-4" : "gap-3")}>
      {/* Main progress ring */}
      <ProgressRing 
        progress={progress}
        size={isPrimary ? 48 : isTertiary ? 32 : 40}
        strokeWidth={isPrimary ? 4 : 3}
        color={progress === 100 ? "emerald" : "amber"}
        showGlow={progress === 100}
      >
        {progress === 100 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Check className={cn(
              "text-emerald-500",
              isPrimary ? "w-5 h-5" : "w-4 h-4"
            )} />
          </motion.div>
        ) : (
          <span className={cn(
            "font-semibold text-foreground",
            isPrimary ? "text-sm" : "text-xs"
          )}>
            {data.habitsCompletedToday}
          </span>
        )}
      </ProgressRing>

      {/* Stats */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {/* Streak badge */}
        {data.currentStreak > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 w-fit"
          >
            <Flame className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {data.currentStreak} day{data.currentStreak !== 1 ? "s" : ""}
            </span>
          </motion.div>
        )}
        
        {/* XP display */}
        {data.totalXp > 0 && !isTertiary && (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
            <Zap className="w-2.5 h-2.5 text-primary/60" />
            <span>{data.totalXp.toLocaleString()} XP</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Notes with quick action buttons
function NotesMiniContent({ data, size, onClick }: { data: MiniContentProps["data"]; size: ModuleSize; onClick?: (e: React.MouseEvent) => void }) {
  const notes = data.recentNotes.slice(0, size === "primary" ? 2 : 1);
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";

  return (
    <div className="flex flex-col gap-2">
      {/* Recent note preview */}
      {notes.length > 0 && (
        <div className="flex gap-1.5">
          {notes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-muted/30 border border-border/30"
            >
              <div className="flex items-start gap-1.5">
                <FileText className="w-3 h-3 text-primary/50 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-foreground/80 truncate">
                    {note.title}
                  </p>
                  <p className="text-[8px] text-muted-foreground/50 truncate">
                    {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick action buttons */}
      {!isTertiary && (
        <div className="flex gap-1.5">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-[9px] font-medium text-primary"
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to notes with new note action
              window.location.href = '/notes?action=new';
            }}
          >
            <Plus className="w-3 h-3" />
            New
          </motion.button>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-[9px] font-medium text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/notes?action=upload';
            }}
          >
            <Upload className="w-3 h-3" />
            Upload
          </motion.button>
          {isPrimary && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-[9px] font-medium text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = '/notes?action=write';
              }}
            >
              <PenLine className="w-3 h-3" />
              Write
            </motion.button>
          )}
        </div>
      )}

      {/* Stats badge for tertiary */}
      {isTertiary && notes.length === 0 && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <Plus className="w-3 h-3 text-primary/60" />
          </div>
          <span className="text-[9px] text-muted-foreground">Create note</span>
        </div>
      )}
    </div>
  );
}

// Finance with visual spending bar
function FinanceMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const progress = Math.min((data.monthlySpending / data.monthlyBudget) * 100, 100);
  const isOverBudget = data.monthlySpending > data.monthlyBudget;
  const remaining = Math.max(data.monthlyBudget - data.monthlySpending, 0);
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Spending bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className={cn(
              "font-semibold",
              isPrimary ? "text-base" : "text-sm",
              isOverBudget ? "text-destructive" : "text-foreground"
            )}>
              {formatCurrency(data.monthlySpending)}
            </span>
            <span className="text-[9px] text-muted-foreground/50">
              / {formatCurrency(data.monthlyBudget)}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                isOverBudget ? "bg-destructive" :
                progress > 80 ? "bg-amber-500" :
                "bg-primary"
              )}
            />
          </div>
        </div>

        {/* Remaining badge */}
        {!isTertiary && (
          <div className={cn(
            "flex flex-col items-end shrink-0",
            isPrimary ? "min-w-[60px]" : "min-w-[50px]"
          )}>
            <span className={cn(
              "font-medium",
              isPrimary ? "text-xs" : "text-[10px]",
              isOverBudget ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {isOverBudget ? "-" : ""}{formatCurrency(isOverBudget ? data.monthlySpending - data.monthlyBudget : remaining)}
            </span>
            <span className="text-[8px] text-muted-foreground/50">
              {isOverBudget ? "over" : "left"}
            </span>
          </div>
        )}
      </div>

      {/* Recent transactions */}
      {isPrimary && data.recentTransactions.length > 0 && (
        <div className="flex gap-1.5 mt-1">
          {data.recentTransactions.slice(0, 3).map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex-1 px-2 py-1 rounded bg-muted/20 border border-border/20"
            >
              <p className="text-[9px] text-foreground/70 truncate">{tx.name}</p>
              <p className={cn(
                "text-[10px] font-medium",
                tx.amount < 0 ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(0)}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mini Google Map component
const MiniMapComponent = memo(function MiniMapComponent({ 
  center, 
  size 
}: { 
  center: { lat: number; lng: number }; 
  size: ModuleSize;
}) {
  const isPrimary = size === "primary";
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const mapContainerStyle = {
    width: "100%",
    height: isPrimary ? "80px" : "60px",
    borderRadius: "8px",
  };

  const options: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: "none",
    styles: [
      { elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "administrative", stylers: [{ visibility: "off" }] },
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
    ],
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    map.setZoom(14);
  }, []);

  if (!isLoaded) {
    return (
      <div 
        className="bg-muted/30 rounded-lg animate-pulse flex items-center justify-center"
        style={{ height: isPrimary ? "80px" : "60px" }}
      >
        <MapPin className="w-4 h-4 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      options={options}
      onLoad={onLoad}
    />
  );
});

// Maps with mini map preview
function MapsMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";
  const places = data.recentPlaces.slice(0, 2);
  
  // Default to San Francisco if no user location
  const mapCenter = data.userLocation || { lat: 37.7749, lng: -122.4194 };

  return (
    <div className="flex flex-col gap-2">
      {/* Mini map preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="overflow-hidden rounded-lg border border-border/30"
      >
        <MiniMapComponent center={mapCenter} size={size} />
      </motion.div>

      {/* Recent places chips */}
      {!isTertiary && places.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {places.map((place, i) => (
            <motion.div
              key={place.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/30 text-[9px] text-muted-foreground"
            >
              <MapPin className="w-2.5 h-2.5" />
              <span className="truncate max-w-[60px]">{place.name}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Travel with compact countdown
function TravelMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const trip = data.upcomingTrips[0];
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";

  if (!trip) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <Plane className="w-3.5 h-3.5 text-primary/60" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground/80">No trips planned</span>
          <span className="text-[9px] text-muted-foreground/50">Start exploring</span>
        </div>
      </div>
    );
  }

  const daysUntil = differenceInDays(trip.startDate, new Date());

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 border border-border/30"
    >
      {/* Trip info first */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Plane className="w-3 h-3 text-primary/60 shrink-0" />
          <span className="text-[11px] font-medium text-foreground truncate">
            {trip.name}
          </span>
        </div>
        {!isTertiary && (
          <div className="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground/50">
            <Calendar className="w-2.5 h-2.5" />
            <span>{formatDistanceToNow(trip.startDate, { addSuffix: true })}</span>
          </div>
        )}
      </div>

      {/* Compact countdown badge */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 shrink-0">
        <span className="text-sm font-semibold text-primary">{daysUntil}</span>
        <span className="text-[8px] text-primary/70">days</span>
      </div>
    </motion.div>
  );
}

// Health with activity rings (Apple Watch style)
function HealthMiniContent({ data, size }: { data: MiniContentProps["data"]; size: ModuleSize }) {
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";

  // Simulated health metrics
  const moveProgress = data.activityScore;
  const exerciseProgress = 65;
  const standProgress = 80;

  return (
    <div className={cn("flex items-center", isPrimary ? "gap-4" : "gap-3")}>
      {/* Stacked rings (Apple Watch style) */}
      <div className="relative" style={{ width: isPrimary ? 52 : 40, height: isPrimary ? 52 : 40 }}>
        {/* Outer ring - Move */}
        <ProgressRing 
          progress={moveProgress}
          size={isPrimary ? 52 : 40}
          strokeWidth={isPrimary ? 5 : 4}
          color="destructive"
        />
        {/* Middle ring - Exercise */}
        <div className="absolute" style={{ 
          top: isPrimary ? 6 : 5, 
          left: isPrimary ? 6 : 5 
        }}>
          <ProgressRing 
            progress={exerciseProgress}
            size={isPrimary ? 40 : 30}
            strokeWidth={isPrimary ? 5 : 4}
            color="emerald"
          />
        </div>
        {/* Inner ring - Stand */}
        <div className="absolute" style={{ 
          top: isPrimary ? 12 : 10, 
          left: isPrimary ? 12 : 10 
        }}>
          <ProgressRing 
            progress={standProgress}
            size={isPrimary ? 28 : 20}
            strokeWidth={isPrimary ? 5 : 4}
            color="primary"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-destructive/80" />
          <span className="text-[10px] text-foreground/80">{moveProgress}%</span>
          <span className="text-[9px] text-muted-foreground/50">move</span>
        </div>
        {!isTertiary && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
              <span className="text-[10px] text-foreground/80">{exerciseProgress}%</span>
              <span className="text-[9px] text-muted-foreground/50">exercise</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Moon className="w-2.5 h-2.5 text-muted-foreground/50" />
              <span className="text-[10px] text-foreground/80">{data.sleepHours}h</span>
              <span className="text-[9px] text-muted-foreground/50">sleep</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Security with device count
function SecurityMiniContent({ size, data }: { size: ModuleSize; data?: { connectedDevices?: number } }) {
  const isPrimary = size === "primary";
  const deviceCount = data?.connectedDevices ?? 0;
  
  const systems = [
    { name: "Network", status: "secure" },
    { name: "Auth", status: "secure" },
  ];

  return (
    <div className={cn("flex items-center", isPrimary ? "gap-4" : "gap-3")}>
      {/* Device count badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-0.5"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Monitor className="w-4 h-4 text-emerald-500" />
          <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
            {deviceCount}
          </span>
        </div>
        <span className="text-[8px] text-muted-foreground/50">devices</span>
      </motion.div>

      {/* System statuses */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-emerald-500/80" />
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
            All systems secure
          </span>
        </div>
        {systems.map((sys, i) => (
          <motion.div
            key={sys.name}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
            <span className="text-[9px] text-muted-foreground/70">{sys.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Files with storage visual
function FilesMiniContent({ size }: { size: ModuleSize }) {
  const isPrimary = size === "primary";
  
  // Simulated storage data
  const drives = [
    { name: "Drive", icon: FolderOpen, used: 45 },
    { name: "Local", icon: FolderOpen, used: 32 },
  ];

  return (
    <div className={cn("flex", isPrimary ? "gap-3" : "gap-2")}>
      {drives.slice(0, isPrimary ? 2 : 1).map((drive, i) => (
        <motion.div
          key={drive.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex-1 p-2 rounded-lg bg-muted/20 border border-border/20"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <drive.icon className="w-3 h-3 text-primary/60" />
            <span className="text-[10px] font-medium text-foreground/80">{drive.name}</span>
          </div>
          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${drive.used}%` }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="h-full bg-primary/60 rounded-full"
            />
          </div>
          <span className="text-[8px] text-muted-foreground/50 mt-0.5 block">
            {drive.used}% used
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// Creation - compact design
function CreationMiniContent({ size }: { size: ModuleSize }) {
  const isTertiary = size === "tertiary";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground/80">3D modeling workspace</span>
      </div>
      {!isTertiary && (
        <div className="flex gap-1.5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-[9px] font-medium text-primary"
          >
            <Plus className="w-3 h-3" />
            New project
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 text-[9px] text-muted-foreground"
          >
            <FolderOpen className="w-3 h-3" />
            Open
          </motion.div>
        </div>
      )}
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
        return <SecurityMiniContent size={size} data={{ connectedDevices: data.connectedDevices }} />;
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
      transition={{ delay: 0.15 }}
      className={cn(
        "mt-auto",
        !isTertiary && "pt-3"
      )}
      onClick={onClick}
    >
      {content}
    </motion.div>
  );
}
