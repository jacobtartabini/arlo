import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Zap, 
  Battery, 
  BatteryLow, 
  Calendar,
  ChevronRight,
  Star,
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

export function PriorityTaskList({
  tasks,
  projects = [],
  maxTasks = 5,
  onToggle,
  onTaskClick,
  onViewAll,
}: PriorityTaskListProps) {
  const projectMap = new Map(projects.map(p => [p.id, p]));
  
  // Sort tasks: incomplete first, then by priority (high to low), then by due date
  const sortedTasks = [...tasks]
    .filter(t => !t.done)
    .sort((a, b) => {
      // Priority first (higher is more important)
      if (a.priority !== b.priority) return b.priority - a.priority;
      // Then by due date (earlier is more urgent)
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
      <Card className="border-border/60 bg-card/80 p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Star className="h-6 w-6" />
          </div>
          <p className="font-medium text-foreground">No Priority Tasks</p>
          <p className="text-sm text-muted-foreground mt-1">
            All tasks are complete or none are scheduled for today
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Priority Tasks</span>
          <Badge variant="secondary" className="text-xs">{sortedTasks.length}</Badge>
        </div>
        {onViewAll && tasks.length > maxTasks && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="h-7 text-xs gap-1">
            View All
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Task List */}
      <div className="divide-y divide-border/50">
        {sortedTasks.map((task) => {
          const project = task.projectId ? projectMap.get(task.projectId) : null;
          const EnergyIcon = ENERGY_ICONS[task.energyLevel];
          
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors",
                "hover:bg-muted/30 cursor-pointer",
                task.done && "opacity-50"
              )}
              onClick={() => onTaskClick?.(task)}
            >
              {/* Checkbox */}
              <Checkbox
                checked={task.done}
                onCheckedChange={(checked) => {
                  handleToggle(task.id, !!checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />

              {/* Task Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className={cn(
                  "text-sm font-medium text-foreground truncate",
                  task.done && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Project badge */}
                  {project && (
                    <Badge 
                      variant="outline" 
                      className="text-xs gap-1 py-0"
                      style={{ borderColor: project.color, color: project.color }}
                    >
                      {project.icon} {project.name}
                    </Badge>
                  )}
                  
                  {/* Time estimate */}
                  {task.timeEstimateMinutes && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {task.timeEstimateMinutes}m
                    </span>
                  )}
                  
                  {/* Energy level */}
                  <span className={cn("flex items-center gap-1 text-xs", ENERGY_COLORS[task.energyLevel])}>
                    <EnergyIcon className="h-3 w-3" />
                  </span>
                  
                  {/* Due date */}
                  {task.dueDate && (
                    <span className={cn(
                      "flex items-center gap-1 text-xs",
                      task.dueDate.getTime() - Date.now() < 86400000 
                        ? "text-destructive" 
                        : "text-muted-foreground"
                    )}>
                      <Calendar className="h-3 w-3" />
                      {task.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Priority indicator */}
              {task.priority >= 2 && (
                <div className="flex items-center">
                  <Badge 
                    variant={task.priority >= 3 ? "destructive" : "secondary"} 
                    className="text-xs"
                  >
                    P{task.priority}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
