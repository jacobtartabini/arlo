import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronDown, 
  ChevronRight,
  Clock,
  Zap,
  Battery,
  BatteryMedium,
  BatteryLow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task } from "@/types/tasks";
import type { Subtask } from "@/types/productivity";

const PRIORITY_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: "P1", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  2: { label: "P2", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  3: { label: "P3", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  4: { label: "P4", className: "bg-muted text-muted-foreground border-border" },
};

const ENERGY_ICONS: Record<string, React.ElementType> = {
  high: Zap,
  medium: BatteryMedium,
  low: BatteryLow,
};

interface TaskItemProps {
  task: Task;
  projectColor?: string;
  onToggle: (taskId: string, done: boolean) => void;
  subtasks?: Subtask[];
  onSubtaskToggle?: (subtaskId: string, done: boolean) => void;
}

export function TaskItem({ task, projectColor, onToggle, subtasks = [], onSubtaskToggle }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const priorityConfig = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[4];
  const EnergyIcon = ENERGY_ICONS[task.energyLevel || 'medium'] || BatteryMedium;
  
  const completedSubtasks = subtasks.filter(s => s.done).length;
  const hasSubtasks = subtasks.length > 0;

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    await onToggle(task.id, !task.done);
    setIsToggling(false);
  };

  return (
    <Card 
      className={cn(
        "p-4 transition-all border-border/50",
        task.done && "opacity-60 bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Expand toggle */}
        {hasSubtasks && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 p-0.5 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}

        {/* Checkbox */}
        <Checkbox
          checked={task.done}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          className="mt-0.5"
          style={{ 
            borderColor: projectColor,
            ...(task.done ? { backgroundColor: projectColor, borderColor: projectColor } : {})
          }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={cn(
              "font-medium",
              task.done && "line-through text-muted-foreground"
            )}>
              {task.title}
            </span>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Priority */}
              <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
                {priorityConfig.label}
              </Badge>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {/* Time estimate */}
            {task.timeEstimateMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {task.timeEstimateMinutes}m
              </span>
            )}

            {/* Energy level */}
            {task.energyLevel && (
              <span className="flex items-center gap-1">
                <EnergyIcon className="h-3 w-3" />
                {task.energyLevel}
              </span>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span className="flex items-center gap-1">
                Due {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}

            {/* Subtasks progress */}
            {hasSubtasks && (
              <span className="flex items-center gap-1">
                {completedSubtasks}/{subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div className="ml-10 mt-3 space-y-2 border-l-2 pl-4" style={{ borderColor: projectColor }}>
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-3">
              <Checkbox
                checked={subtask.done}
                onCheckedChange={() => onSubtaskToggle?.(subtask.id, !subtask.done)}
                className="h-4 w-4"
              />
              <span className={cn(
                "text-sm",
                subtask.done && "line-through text-muted-foreground"
              )}>
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
