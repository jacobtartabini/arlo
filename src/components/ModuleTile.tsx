import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { type Module, type ModuleSize } from "@/lib/app-navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday } from "date-fns";

interface DashboardInsights {
  pendingTasksCount: number;
  nextTask: string | null;
  tasksCompletedToday: number;
  habitsCompletedToday: number;
  totalHabitsToday: number;
  longestStreak: number;
  nextEvent: { title: string; time: Date } | null;
  eventsToday: number;
  notesCount: number;
  lastNoteTitle: string | null;
  lastNoteUpdated: Date | null;
  monthlySpending: number;
  recentTransaction: { name: string; amount: number } | null;
  savedPlacesCount: number;
  isLoading: boolean;
}

interface ModuleTileProps {
  module: Module;
  onClick: () => void;
  sizeClass?: ModuleSize;
  insights?: DashboardInsights;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function getModuleInsight(moduleId: string, insights: DashboardInsights, size: ModuleSize): React.ReactNode {
  if (insights.isLoading || size === 'tertiary') return null;

  switch (moduleId) {
    case 'productivity': {
      if (insights.pendingTasksCount === 0) {
        return (
          <div className="flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">All clear</span>
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{insights.pendingTasksCount}</span> tasks remaining
          </p>
          {insights.nextTask && (
            <p className="text-xs text-muted-foreground truncate">
              Next: <span className="text-foreground">{insights.nextTask}</span>
            </p>
          )}
        </div>
      );
    }
    
    case 'habits': {
      const progress = insights.totalHabitsToday > 0 
        ? Math.round((insights.habitsCompletedToday / insights.totalHabitsToday) * 100) 
        : 0;
      
      if (insights.habitsCompletedToday === insights.totalHabitsToday && insights.totalHabitsToday > 0) {
        return (
          <div className="flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Daily win!</span>
          </div>
        );
      }
      
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{insights.habitsCompletedToday}</span>/{insights.totalHabitsToday} today
            </span>
            {insights.longestStreak > 0 && (
              <span className="text-orange-500 font-medium">🔥 {insights.longestStreak}d</span>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary/60 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );
    }
    
    case 'notes': {
      if (insights.notesCount === 0) {
        return <p className="text-xs text-muted-foreground">No notes yet</p>;
      }
      return (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{insights.notesCount}</span> notes
          </p>
          {insights.lastNoteTitle && insights.lastNoteUpdated && (
            <p className="text-xs text-muted-foreground truncate">
              Edited {formatDistanceToNow(insights.lastNoteUpdated, { addSuffix: true })}
            </p>
          )}
        </div>
      );
    }
    
    case 'finance': {
      if (insights.monthlySpending === 0 && !insights.recentTransaction) {
        return <p className="text-xs text-muted-foreground">No transactions</p>;
      }
      return (
        <div className="space-y-0.5">
          {insights.monthlySpending > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{formatCurrency(insights.monthlySpending)}</span> this month
            </p>
          )}
          {insights.recentTransaction && (
            <p className="text-xs text-muted-foreground truncate">
              Latest: {insights.recentTransaction.name}
            </p>
          )}
        </div>
      );
    }
    
    case 'maps': {
      if (insights.nextEvent) {
        return (
          <p className="text-xs text-muted-foreground truncate">
            Next: <span className="text-foreground">{insights.nextEvent.title}</span>
          </p>
        );
      }
      return <p className="text-xs text-muted-foreground">Explore nearby</p>;
    }
    
    case 'calendar': {
      if (insights.nextEvent) {
        const timeStr = isToday(insights.nextEvent.time) 
          ? format(insights.nextEvent.time, 'h:mm a')
          : format(insights.nextEvent.time, 'MMM d, h:mm a');
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground truncate">
              <span className="text-foreground">{insights.nextEvent.title}</span>
            </p>
            <p className="text-xs text-muted-foreground">{timeStr}</p>
          </div>
        );
      }
      if (insights.eventsToday > 0) {
        return (
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{insights.eventsToday}</span> events today
          </p>
        );
      }
      return <p className="text-xs text-muted-foreground">No upcoming events</p>;
    }
    
    default:
      return null;
  }
}

export function ModuleTile({ module, onClick, sizeClass, insights }: ModuleTileProps) {
  const Icon = module.icon;
  const size = sizeClass || module.size;
  const isPrimary = size === "primary";
  const isTertiary = size === "tertiary";
  const isLarge = size === "primary";
  const isMedium = size === "secondary";
  
  const dynamicContent = insights && (isLarge || isMedium) 
    ? getModuleInsight(module.id, insights, size) 
    : null;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="h-full cursor-pointer group"
    >
      <Card 
        className={cn(
          "glass-module h-full relative overflow-hidden transition-all duration-200",
          isPrimary ? "p-5" : isTertiary ? "p-3" : "p-4"
        )}
      >
        {/* Subtle accent line on hover */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(var(--${module.color})), transparent)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className={cn(
            "flex items-start gap-3",
            isPrimary ? "mb-3" : isTertiary ? "mb-2" : "mb-2"
          )}>
            {/* Icon */}
            <div className={cn(
              "rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors",
              isPrimary ? "w-10 h-10" : isTertiary ? "w-7 h-7" : "w-8 h-8"
            )}>
              <Icon 
                className={cn(
                  "text-primary",
                  isPrimary ? "w-5 h-5" : isTertiary ? "w-3.5 h-3.5" : "w-4 h-4"
                )} 
                strokeWidth={2} 
              />
            </div>

            {/* Title & Summary */}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "font-semibold text-foreground tracking-tight leading-tight",
                isPrimary ? "text-base" : isTertiary ? "text-xs" : "text-sm"
              )}>
                {module.title}
              </h3>
              {/* Show static summary only for tertiary or when no dynamic content */}
              {isTertiary && module.summary && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {module.summary}
                </p>
              )}
            </div>
          </div>

          {/* Dynamic content for medium/large modules */}
          {dynamicContent && (
            <div className={cn(
              "flex-1 min-h-0",
              isPrimary ? "mb-3" : "mb-2"
            )}>
              {dynamicContent}
            </div>
          )}

          {/* Spacer for tiles without dynamic content */}
          {!dynamicContent && <div className="flex-1" />}

          {/* Action hint - only on primary/secondary */}
          {!isTertiary && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 group-hover:text-primary/80 transition-colors pt-2 border-t border-border/30">
              <span className="font-medium">{module.actionLabel}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>

        {/* Subtle corner accent on hover */}
        <div 
          className="absolute bottom-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at bottom right, hsl(var(--${module.color}) / 0.1), transparent 70%)`
          }}
        />
      </Card>
    </motion.div>
  );
}
