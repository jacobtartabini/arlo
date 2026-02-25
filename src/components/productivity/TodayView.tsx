import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sun, 
  Cloud, 
  Moon,
  CalendarDays,
  Plus,
  RefreshCw,
  Settings2,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  Timer,
  Sparkles,
  Zap,
  Battery,
  BatteryLow,
  Clock,
  ArrowRight,
} from "lucide-react";
import { format, differenceInMinutes, differenceInSeconds } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { PriorityTaskList } from "./PriorityTaskList";
import { QuickTaskInput } from "./QuickTaskInput";
import { EnergySettings, getEnergyForHour } from "./EnergySettings";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useTimeBlocksPersistence } from "@/hooks/useTimeBlocksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { CreateTaskDialog } from "@/components/projects/CreateTaskDialog";
import { EditTaskDialog } from "@/components/projects/EditTaskDialog";
import type { Task, TimeBlock, Project, EnergyLevel } from "@/types/productivity";

interface TodayViewProps {
  onTaskClick?: (task: Task) => void;
  onViewAllTasks?: () => void;
}

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good Morning', icon: Sun };
  if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', icon: Cloud };
  if (hour >= 17 && hour < 21) return { text: 'Good Evening', icon: Moon };
  return { text: 'Good Night', icon: Moon };
}

function getCurrentEnergyLevel(): EnergyLevel {
  const hour = new Date().getHours();
  return getEnergyForHour(hour);
}

const ENERGY_CONFIG: Record<EnergyLevel, { icon: typeof Zap; label: string; color: string }> = {
  high: { icon: Zap, label: 'High Energy', color: 'text-yellow-500' },
  medium: { icon: Battery, label: 'Medium Energy', color: 'text-blue-500' },
  low: { icon: BatteryLow, label: 'Low Energy', color: 'text-muted-foreground' },
};

export function TodayView({ onTaskClick, onViewAllTasks }: TodayViewProps) {
  const navigate = useNavigate();
  const { fetchTasks, toggleTask } = useTasksPersistence();
  const { fetchTimeBlocksForDate, completeTimeBlock } = useTimeBlocksPersistence();
  const { fetchProjects } = useProjectsPersistence();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [energySettingsOpen, setEnergySettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    
    try {
      const today = new Date();
      
      const [fetchedTasks, fetchedBlocks, fetchedProjects] = await Promise.all([
        fetchTasks(),
        fetchTimeBlocksForDate(today),
        fetchProjects(),
      ]);

      const todayStr = today.toDateString();
      const todayTasks = fetchedTasks.filter(task => {
        if (task.done) return false;
        if (task.scheduledDate?.toDateString() === todayStr) return true;
        if (task.dueDate?.toDateString() === todayStr) return true;
        if (task.priority >= 2) return true;
        return false;
      });

      setTasks(todayTasks.length > 0 ? todayTasks : fetchedTasks.filter(t => !t.done));
      setTimeBlocks(fetchedBlocks);
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('[TodayView] Failed to load data:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, fetchTimeBlocksForDate, fetchProjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer tick for active time block
  useEffect(() => {
    const currentBlock = timeBlocks.find(
      block => !block.isCompleted && block.startTime <= now && block.endTime >= now
    );
    if (!currentBlock || isPaused) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [timeBlocks, isPaused, now]);

  // Current time block
  const currentBlock = timeBlocks.find(
    block => !block.isCompleted && block.startTime <= now && block.endTime >= now
  );
  const currentBlockTask = currentBlock?.taskId 
    ? tasks.find(t => t.id === currentBlock.taskId) 
    : null;

  // Focus suggestion
  const currentEnergy = getCurrentEnergyLevel();
  const suggestedTask = useMemo(() => {
    const incompleteTasks = tasks.filter(t => !t.done);
    if (incompleteTasks.length === 0) return null;

    const scoredTasks = incompleteTasks.map(task => {
      let score = 0;
      score += task.priority * 20;
      if (task.energyLevel === currentEnergy) score += 30;
      if (task.timeEstimateMinutes && task.timeEstimateMinutes <= 60) score += 25;
      if (task.dueDate) {
        const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 1) score += 50;
        else if (daysUntilDue <= 3) score += 25;
      }
      if (task.scheduledDate?.toDateString() === new Date().toDateString()) score += 40;
      return { task, score };
    });
    
    scoredTasks.sort((a, b) => b.score - a.score);
    return scoredTasks[0]?.task || null;
  }, [tasks, currentEnergy]);

  const handleToggle = useCallback(async (taskId: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t));
    const success = await toggleTask(taskId, done);
    if (!success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !done } : t));
    }
  }, [toggleTask]);

  const handleCompleteBlock = useCallback(async (blockId: string) => {
    await completeTimeBlock(blockId);
    setTimeBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, isCompleted: true } : b
    ));
  }, [completeTimeBlock]);

  const handleTaskClick = useCallback((task: Task) => {
    setEditTask(task);
  }, []);

  const handleStartFocus = useCallback((task: Task) => {
    navigate(`/focus?taskId=${task.id}&duration=${task.timeEstimateMinutes || 25}`);
  }, [navigate]);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const completedToday = tasks.filter(t => t.done).length;
  const totalToday = tasks.length;
  const tasksRemaining = totalToday - completedToday;
  const EnergyIcon = ENERGY_CONFIG[currentEnergy].icon;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
        <p className="text-sm text-foreground font-medium mb-1">Failed to load</p>
        <p className="text-xs text-muted-foreground mb-3">{loadError}</p>
        <Button onClick={loadData} variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  // Compute time block display values
  let blockProgress = 0;
  let remainingMinutes = 0;
  let remainingSecs = 0;
  let isOvertime = false;
  if (currentBlock) {
    const totalMinutes = differenceInMinutes(currentBlock.endTime, currentBlock.startTime);
    const elapsedMinutes = differenceInMinutes(now, currentBlock.startTime);
    const remainingSeconds = Math.max(0, differenceInSeconds(currentBlock.endTime, now));
    remainingMinutes = Math.floor(remainingSeconds / 60);
    remainingSecs = remainingSeconds % 60;
    blockProgress = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
    isOvertime = now > currentBlock.endTime;
  }

  // Pick the focus target: active block task > suggested task
  const focusTarget = currentBlockTask || suggestedTask;

  return (
    <div className="space-y-5">
      {/* Today header - compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GreetingIcon className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">{greeting.text}</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d')} · {tasksRemaining} task{tasksRemaining !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => setEnergySettingsOpen(true)} className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={loadData} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            Task
          </Button>
        </div>
      </div>

      {/* Quick Task Input */}
      <QuickTaskInput 
        onTaskCreated={loadData}
        defaultScheduledDate={new Date()}
      />

      {/* Unified Focus Panel - merges time block + suggestion */}
      <div className="rounded-xl border border-border/60 bg-card/80 p-5 space-y-4">
        {currentBlock ? (
          /* Active time block */
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {currentBlock.blockType === 'focus' ? 'Focus' : currentBlock.blockType === 'break' ? 'Break' : 'Soft Focus'} Block
                  </p>
                  {currentBlockTask && (
                    <p className="text-xs text-muted-foreground">{currentBlockTask.title}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold tabular-nums ${isOvertime ? 'text-destructive' : 'text-foreground'}`}>
                  {isOvertime ? '+' : ''}{remainingMinutes}:{String(remainingSecs).padStart(2, '0')}
                </p>
                <p className="text-[11px] text-muted-foreground">{isOvertime ? 'overtime' : 'remaining'}</p>
              </div>
            </div>
            <Progress value={blockProgress} className="h-1.5" />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsPaused(!isPaused)} className="h-7 gap-1 text-xs">
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const params = new URLSearchParams();
                params.set("blockId", currentBlock.id);
                if (currentBlockTask) params.set("taskId", currentBlockTask.id);
                navigate(`/focus?${params.toString()}`);
              }} className="h-7 gap-1 text-xs">
                Fullscreen
              </Button>
              <Button size="sm" onClick={() => handleCompleteBlock(currentBlock.id)} className="h-7 gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </Button>
            </div>
          </>
        ) : focusTarget ? (
          /* Suggested focus task */
          <>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Suggested Next</span>
              <Badge variant="outline" className="ml-auto gap-1 text-[11px] py-0.5">
                <EnergyIcon className={`h-3 w-3 ${ENERGY_CONFIG[currentEnergy].color}`} />
                {ENERGY_CONFIG[currentEnergy].label}
              </Badge>
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{focusTarget.title}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {focusTarget.timeEstimateMinutes && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {focusTarget.timeEstimateMinutes} min
                  </span>
                )}
                {focusTarget.dueDate && (
                  <span className={`flex items-center gap-1 text-xs ${
                    focusTarget.dueDate.getTime() - Date.now() < 86400000 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    <CalendarDays className="h-3 w-3" />
                    {focusTarget.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <Button className="w-full gap-2 h-9" onClick={() => handleStartFocus(focusTarget)}>
              <Play className="h-3.5 w-3.5" />
              Start Focus Session
            </Button>
          </>
        ) : (
          /* No active block, no suggestion */
          <div className="flex items-center gap-3 text-muted-foreground py-2">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium text-foreground">No focus block active</p>
              <p className="text-xs text-muted-foreground">Schedule a block or pick a task to start</p>
            </div>
          </div>
        )}
      </div>

      {/* Priority Tasks - simplified */}
      <PriorityTaskList
        tasks={tasks}
        projects={projects}
        maxTasks={7}
        onToggle={handleToggle}
        onTaskClick={handleTaskClick}
        onViewAll={onViewAllTasks}
      />

      {/* Upcoming Blocks - minimal */}
      {timeBlocks.filter(b => !b.isCompleted && b.startTime > now).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming</p>
          <div className="flex flex-wrap gap-1.5">
            {timeBlocks
              .filter(b => !b.isCompleted && b.startTime > now)
              .slice(0, 4)
              .map(block => {
                const task = block.taskId ? tasks.find(t => t.id === block.taskId) : null;
                return (
                  <Badge key={block.id} variant="secondary" className="gap-1 text-xs py-1">
                    {format(block.startTime, 'h:mm a')}
                    {task && <span className="text-muted-foreground">· {task.title}</span>}
                  </Badge>
                );
              })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => { loadData(); setCreateDialogOpen(false); }}
        projects={projects}
        defaultScheduledDate={new Date()}
      />
      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
        projects={projects}
        onUpdated={loadData}
        onDeleted={loadData}
        onStartFocus={handleStartFocus}
      />
      <EnergySettings
        open={energySettingsOpen}
        onOpenChange={setEnergySettingsOpen}
      />
    </div>
  );
}
