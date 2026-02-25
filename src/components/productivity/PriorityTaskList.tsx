import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Zap, 
  Battery, 
  BatteryLow, 
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Project, EnergyLevel } from "@/types/productivity";

interface PriorityTaskListProps {
  tasks: Task[];
  projects?: Project[];
  maxTasks?: number;
  onToggle: (taskId: string, done: boolean) => void;
  onTaskClick?: (task: Task) => void;
  onViewAll?: () => void;
}

const ENERGY_ICONS: Record<EnergyLevel, typeof Zap> = {
  high: Zap,
  medium: Battery,
  low: BatteryLow,
};

const ENERGY_COLORS: Record<EnergyLevel, string> = {
  high: 'text-yellow-500',
  medium: 'text-blue-500',
  low: 'text-muted-foreground',
};

function getEnergyIcon(level: string | undefined): typeof Zap {
  if (level && level in ENERGY_ICONS) return ENERGY_ICONS[level as EnergyLevel];
  return Battery;
}

function getEnergyColor(level: string | undefined): string {
  if (level && level in ENERGY_COLORS) return ENERGY_COLORS[level as EnergyLevel];
  return 'text-muted-foreground';
}

export function PriorityTaskList({
  tasks,
  projects = [],
  maxTasks = 5,
  onToggle,
  onTaskClick,
  onViewAll,
}: PriorityTaskListProps) {
  const projectMap = new Map(projects.map(p => [p.id, p]));
  
  const sortedTasks = [...tasks]
    .filter(t => !t.done)
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, maxTasks);

  const handleToggle = useCallback((taskId: string, checked: boolean) => {
    onToggle(taskId, checked);
  }, [onToggle]);

  if (sortedTasks.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">All tasks complete — nice work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tasks</span>
        {onViewAll && tasks.filter(t => !t.done).length > maxTasks && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="h-6 text-xs gap-1 px-2">
            View All
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Task List */}
      <div className="rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden">
        {sortedTasks.map((task) => {
          const project = task.projectId ? projectMap.get(task.projectId) : null;
          const EnergyIcon = getEnergyIcon(task.energyLevel);
          const energyColor = getEnergyColor(task.energyLevel);
          
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 transition-colors",
                "hover:bg-muted/30 cursor-pointer bg-card/60",
                task.done && "opacity-40"
              )}
              onClick={() => onTaskClick?.(task)}
            >
              <Checkbox
                checked={task.done}
                onCheckedChange={(checked) => handleToggle(task.id, !!checked)}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm text-foreground truncate",
                  task.done && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                
                <div className="flex items-center gap-2.5 mt-0.5">
                  {project && (
                    <span className="text-[11px] text-muted-foreground">
                      {project.icon} {project.name}
                    </span>
                  )}
                  {task.timeEstimateMinutes && (
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {task.timeEstimateMinutes}m
                    </span>
                  )}
                  <EnergyIcon className={cn("h-3 w-3", energyColor)} />
                  {task.dueDate && (
                    <span className={cn(
                      "flex items-center gap-0.5 text-[11px]",
                      task.dueDate.getTime() - Date.now() < 86400000 
                        ? "text-destructive" 
                        : "text-muted-foreground"
                    )}>
                      <Calendar className="h-2.5 w-2.5" />
                      {task.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {task.priority >= 2 && (
                <span className={cn(
                  "text-[11px] font-medium px-1.5 py-0.5 rounded",
                  task.priority >= 3 
                    ? "text-destructive bg-destructive/10" 
                    : "text-muted-foreground bg-muted/50"
                )}>
                  P{task.priority}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
