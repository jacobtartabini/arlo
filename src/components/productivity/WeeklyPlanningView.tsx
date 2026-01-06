import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useTimeBlocksPersistence } from "@/hooks/useTimeBlocksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { cn } from "@/lib/utils";
import type { Task, TimeBlock, Project } from "@/types/productivity";

interface WeeklyPlanningViewProps {
  onTaskClick?: (task: Task) => void;
  onDayClick?: (date: Date) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export function WeeklyPlanningView({ onTaskClick, onDayClick }: WeeklyPlanningViewProps) {
  const { fetchTasks } = useTasksPersistence();
  const { fetchTimeBlocksForDate } = useTimeBlocksPersistence();
  const { fetchProjects } = useProjectsPersistence();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeBlocksByDay, setTimeBlocksByDay] = useState<Map<string, TimeBlock[]>>(new Map());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Use ref to track the week for stable dependency
  const weekKeyRef = useRef(weekStart.toDateString());
  weekKeyRef.current = weekStart.toDateString();

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    
    try {
      const [fetchedTasks, fetchedProjects] = await Promise.all([
        fetchTasks(),
        fetchProjects(),
      ]);

      // Fetch time blocks for each day of the week
      const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const end = endOfWeek(currentWeek, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start, end });
      
      const blocksMap = new Map<string, TimeBlock[]>();
      await Promise.all(
        days.map(async (day) => {
          const blocks = await fetchTimeBlocksForDate(day);
          blocksMap.set(day.toDateString(), blocks);
        })
      );

      setTasks(fetchedTasks);
      setTimeBlocksByDay(blocksMap);
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('[WeeklyPlanningView] Failed to load data:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, fetchProjects, fetchTimeBlocksForDate, currentWeek]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  // Group tasks by scheduled date
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.scheduledDate) {
        const key = task.scheduledDate.toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeek(new Date());

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="p-8 text-center border-destructive/50">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
        <p className="text-foreground font-medium mb-2">Failed to load week data</p>
        <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
        <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="border-border/60 bg-card/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Weekly Grid */}
      <Card className="border-border/60 bg-card/80 overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 border-b border-border/50">
              <div className="p-3 text-xs font-medium text-muted-foreground">Time</div>
              {weekDays.map((day) => (
                <div
                  key={day.toDateString()}
                  onClick={() => onDayClick?.(day)}
                  className={cn(
                    "p-3 text-center cursor-pointer transition-colors hover:bg-muted/30",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn(
                    "text-lg font-semibold",
                    isToday(day) ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, 'd')}
                  </p>
                  {/* Task count badge */}
                  {(tasksByDay.get(day.toDateString())?.length || 0) > 0 && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {tasksByDay.get(day.toDateString())?.length} tasks
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-border/30">
                  <div className="p-2 text-xs text-muted-foreground text-right pr-3 h-16">
                    {format(new Date().setHours(hour, 0), 'h a')}
                  </div>
                  {weekDays.map((day) => {
                    const dayBlocks = timeBlocksByDay.get(day.toDateString()) || [];
                    const hourBlocks = dayBlocks.filter(block => {
                      const blockHour = block.startTime.getHours();
                      return blockHour === hour;
                    });
                    
                    return (
                      <div
                        key={`${day.toDateString()}-${hour}`}
                        className={cn(
                          "relative h-16 border-l border-border/30",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        {hourBlocks.map((block) => {
                          const task = block.taskId ? tasks.find(t => t.id === block.taskId) : null;
                          const project = task?.projectId ? projectMap.get(task.projectId) : null;
                          const durationHours = (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60 * 60);
                          const heightPercent = Math.min(durationHours * 100, 200);
                          
                          return (
                            <div
                              key={block.id}
                              onClick={() => task && onTaskClick?.(task)}
                              className={cn(
                                "absolute inset-x-0.5 rounded-md px-1.5 py-1 text-xs overflow-hidden cursor-pointer",
                                "transition-all hover:ring-2 hover:ring-primary/50",
                                block.isCompleted 
                                  ? "bg-muted/50 text-muted-foreground" 
                                  : block.blockType === 'focus'
                                  ? "bg-primary/20 text-primary"
                                  : "bg-orange-500/20 text-orange-600"
                              )}
                              style={{ 
                                top: '2px',
                                height: `calc(${heightPercent}% - 4px)`,
                                borderLeft: project ? `3px solid ${project.color}` : undefined,
                              }}
                            >
                              <p className="font-medium truncate">{task?.title || block.blockType}</p>
                              <p className="text-[10px] opacity-70">
                                {format(block.startTime, 'h:mm')} - {format(block.endTime, 'h:mm a')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      {/* Unscheduled Tasks for the Week */}
      <Card className="border-border/60 bg-card/80 p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Circle className="h-4 w-4" />
          Unscheduled Tasks This Week
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tasks
            .filter(t => !t.done && !t.scheduledDate)
            .slice(0, 6)
            .map((task) => {
              const project = task.projectId ? projectMap.get(task.projectId) : null;
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border border-border/50",
                    "cursor-pointer hover:bg-muted/30 transition-colors"
                  )}
                >
                  {task.done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {project && (
                        <span style={{ color: project.color }}>{project.icon} {project.name}</span>
                      )}
                      {task.timeEstimateMinutes && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {task.timeEstimateMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
