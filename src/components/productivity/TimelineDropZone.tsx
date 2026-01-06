import { useCallback, useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  GripVertical,
  Zap,
  Battery,
  BatteryLow,
  Calendar,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { format, addMinutes, setHours, setMinutes, startOfDay } from "date-fns";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useTimeBlocksPersistence } from "@/hooks/useTimeBlocksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Task, TimeBlock, Project, EnergyLevel } from "@/types/productivity";

interface TimelineDropZoneProps {
  date?: Date;
  onBlockCreated?: () => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
const ENERGY_ICONS: Record<EnergyLevel, typeof Zap> = {
  high: Zap,
  medium: Battery,
  low: BatteryLow,
};

// Safe energy icon accessor
function getEnergyIcon(level: string | undefined): typeof Zap {
  if (level && level in ENERGY_ICONS) {
    return ENERGY_ICONS[level as EnergyLevel];
  }
  return Battery; // Default fallback
}

// Draggable Task Card
function DraggableTask({ task, project }: { task: Task; project?: Project }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const EnergyIcon = getEnergyIcon(task.energyLevel);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-card",
        "cursor-grab active:cursor-grabbing transition-all",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {project && (
            <span className="flex items-center gap-0.5" style={{ color: project.color }}>
              {project.icon}
            </span>
          )}
          {task.timeEstimateMinutes && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {task.timeEstimateMinutes}m
            </span>
          )}
          <EnergyIcon className={cn(
            "h-3 w-3",
            task.energyLevel === 'high' ? 'text-yellow-500' : 
            task.energyLevel === 'medium' ? 'text-blue-500' : 'text-muted-foreground'
          )} />
        </div>
      </div>
    </div>
  );
}

// Task preview during drag
function TaskDragOverlay({ task, project }: { task: Task; project?: Project }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-primary bg-card shadow-lg">
      <GripVertical className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{task.title}</p>
        {task.timeEstimateMinutes && (
          <p className="text-xs text-muted-foreground">{task.timeEstimateMinutes} min</p>
        )}
      </div>
    </div>
  );
}

// Droppable Time Slot
function TimeSlot({ 
  hour, 
  minute, 
  date,
  existingBlock,
  task,
}: { 
  hour: number; 
  minute: number;
  date: Date;
  existingBlock?: TimeBlock;
  task?: Task;
}) {
  const slotId = `${hour}:${minute}`;
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { hour, minute, date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-8 border-b border-border/20 relative transition-colors",
        isOver && "bg-primary/20 ring-1 ring-primary",
        minute === 0 && "border-b-border/40"
      )}
    >
      {existingBlock && minute === existingBlock.startTime.getMinutes() && (
        <div
          className={cn(
            "absolute inset-x-1 rounded px-2 py-1 text-xs z-10",
            existingBlock.isCompleted 
              ? "bg-muted text-muted-foreground" 
              : existingBlock.blockType === 'focus'
              ? "bg-primary/20 text-primary"
              : "bg-orange-500/20 text-orange-600"
          )}
          style={{
            top: 0,
            height: `${Math.min((existingBlock.endTime.getTime() - existingBlock.startTime.getTime()) / (1000 * 60 * 15) * 32, 128)}px`,
          }}
        >
          <p className="font-medium truncate">{task?.title || existingBlock.blockType}</p>
        </div>
      )}
      {isOver && (
        <div className="absolute inset-x-1 top-0 h-1 bg-primary rounded" />
      )}
    </div>
  );
}

export function TimelineDropZone({ date = new Date(), onBlockCreated }: TimelineDropZoneProps) {
  const { fetchTasks } = useTasksPersistence();
  const { fetchTimeBlocksForDate, createTimeBlock } = useTimeBlocksPersistence();
  const { fetchProjects } = useProjectsPersistence();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    
    try {
      const [fetchedTasks, fetchedBlocks, fetchedProjects] = await Promise.all([
        fetchTasks(),
        fetchTimeBlocksForDate(date),
        fetchProjects(),
      ]);
      setTasks(fetchedTasks.filter(t => !t.done));
      setTimeBlocks(fetchedBlocks);
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('[TimelineDropZone] Failed to load data:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, fetchTimeBlocksForDate, fetchProjects, date.toDateString()]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  // Tasks not yet scheduled
  const unscheduledTasks = useMemo(() => 
    tasks.filter(t => !timeBlocks.some(b => b.taskId === t.id)),
    [tasks, timeBlocks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task as Task;
    const { hour, minute } = over.data.current as { hour: number; minute: number };

    if (!task) return;

    const startTime = setMinutes(setHours(startOfDay(date), hour), minute);
    const duration = task.timeEstimateMinutes || 30;
    const endTime = addMinutes(startTime, duration);

    const block = await createTimeBlock(startTime, endTime, {
      taskId: task.id,
      blockType: 'focus',
    });

    if (block) {
      toast({ 
        title: "Focus block created", 
        description: `${task.title} scheduled for ${format(startTime, 'h:mm a')}` 
      });
      setTimeBlocks(prev => [...prev, block]);
      onBlockCreated?.();
    } else {
      toast({ title: "Error", description: "Failed to create time block", variant: "destructive" });
    }
  };

  if (loadError) {
    return (
      <Card className="p-8 text-center border-destructive/50">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
        <p className="text-foreground font-medium mb-2">Failed to load schedule</p>
        <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
        <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
        {/* Task Pool */}
        <Card className="border-border/60 bg-card/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Available Tasks</h3>
            <Badge variant="secondary" className="text-xs">{unscheduledTasks.length}</Badge>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : unscheduledTasks.length > 0 ? (
                unscheduledTasks.map((task) => (
                  <DraggableTask 
                    key={task.id} 
                    task={task} 
                    project={task.projectId ? projectMap.get(task.projectId) : undefined}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  All tasks are scheduled!
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Timeline */}
        <Card className="border-border/60 bg-card/80 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">{format(date, 'EEEE, MMMM d')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">Drag tasks to schedule</p>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="flex border-b border-border/30">
                  <div className="w-16 p-2 text-xs text-muted-foreground text-right shrink-0 border-r border-border/30">
                    {format(new Date().setHours(hour, 0), 'h a')}
                  </div>
                  <div className="flex-1">
                    {[0, 15, 30, 45].map((minute) => {
                      const existingBlock = timeBlocks.find(b => 
                        b.startTime.getHours() === hour && 
                        b.startTime.getMinutes() === minute
                      );
                      const blockTask = existingBlock?.taskId ? taskMap.get(existingBlock.taskId) : undefined;
                      
                      return (
                        <TimeSlot
                          key={`${hour}:${minute}`}
                          hour={hour}
                          minute={minute}
                          date={date}
                          existingBlock={existingBlock}
                          task={blockTask}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <TaskDragOverlay 
            task={activeTask} 
            project={activeTask.projectId ? projectMap.get(activeTask.projectId) : undefined}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
