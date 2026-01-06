import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
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
  Timer,
} from "lucide-react";
import { format } from "date-fns";
import { CurrentTimeBlock } from "./CurrentTimeBlock";
import { FocusSuggestion } from "./FocusSuggestion";
import { PriorityTaskList } from "./PriorityTaskList";
import { QuickScheduleDialog } from "./QuickScheduleDialog";
import { EnergySettings, getEnergyForHour } from "./EnergySettings";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useTimeBlocksPersistence } from "@/hooks/useTimeBlocksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { CreateTaskDialog } from "@/components/projects/CreateTaskDialog";
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

export function TodayView({ onTaskClick, onViewAllTasks }: TodayViewProps) {
  const { fetchTasks, toggleTask } = useTasksPersistence();
  const { fetchTimeBlocksForDate, completeTimeBlock } = useTimeBlocksPersistence();
  const { fetchProjects } = useProjectsPersistence();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [quickScheduleTask, setQuickScheduleTask] = useState<Task | null>(null);
  const [energySettingsOpen, setEnergySettingsOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    
    const [fetchedTasks, fetchedBlocks, fetchedProjects] = await Promise.all([
      fetchTasks(),
      fetchTimeBlocksForDate(today),
      fetchProjects(),
    ]);

    // Filter to today's tasks (scheduled for today OR has due date today OR high priority)
    const todayStr = today.toDateString();
    const todayTasks = fetchedTasks.filter(task => {
      if (task.done) return false;
      if (task.scheduledDate?.toDateString() === todayStr) return true;
      if (task.dueDate?.toDateString() === todayStr) return true;
      if (task.priority >= 2) return true; // High priority always shows
      return false;
    });

    setTasks(todayTasks.length > 0 ? todayTasks : fetchedTasks.filter(t => !t.done));
    setTimeBlocks(fetchedBlocks);
    setProjects(fetchedProjects);
    setLoading(false);
  }, [fetchTasks, fetchTimeBlocksForDate, fetchProjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Find current/active time block
  const now = new Date();
  const currentBlock = timeBlocks.find(
    block => !block.isCompleted && block.startTime <= now && block.endTime >= now
  );
  const currentBlockTask = currentBlock?.taskId 
    ? tasks.find(t => t.id === currentBlock.taskId) 
    : null;

  // Handle task toggle with optimistic update
  const handleToggle = useCallback(async (taskId: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t));
    const success = await toggleTask(taskId, done);
    if (!success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !done } : t));
    }
  }, [toggleTask]);

  // Handle time block completion
  const handleCompleteBlock = useCallback(async (blockId: string) => {
    await completeTimeBlock(blockId);
    setTimeBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, isCompleted: true } : b
    ));
  }, [completeTimeBlock]);

  // Handle quick schedule (tap to create time block)
  const handleQuickSchedule = useCallback((task: Task) => {
    setQuickScheduleTask(task);
  }, []);

  // Handle starting a focus session
  const handleStartFocus = useCallback((task: Task) => {
    setQuickScheduleTask(task);
  }, []);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const currentEnergy = getCurrentEnergyLevel();

  // Stats for today
  const completedToday = tasks.filter(t => t.done).length;
  const totalToday = tasks.length;
  const completedBlocks = timeBlocks.filter(b => b.isCompleted).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today Header */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-primary/5 via-card/80 to-card/80 p-6">
        <div className="absolute inset-0 opacity-30" aria-hidden>
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-muted/50 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GreetingIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{greeting.text}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick stats */}
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{completedToday}/{totalToday}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{completedBlocks}/{timeBlocks.length}</p>
                <p className="text-xs text-muted-foreground">Blocks</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEnergySettingsOpen(true)}
                className="h-9 w-9"
                title="Energy Settings"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                className="h-9 w-9"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Time Block & Focus Suggestion */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentTimeBlock
          timeBlock={currentBlock || null}
          task={currentBlockTask}
          onComplete={handleCompleteBlock}
        />
        <FocusSuggestion
          tasks={tasks}
          currentEnergyLevel={currentEnergy}
          onSelectTask={onTaskClick}
          onStartFocus={handleStartFocus}
        />
      </div>

      {/* Priority Tasks - with quick schedule on click */}
      <PriorityTaskList
        tasks={tasks}
        projects={projects}
        maxTasks={7}
        onToggle={handleToggle}
        onTaskClick={handleQuickSchedule}
        onViewAll={onViewAllTasks}
      />

      {/* Upcoming Time Blocks Preview */}
      {timeBlocks.filter(b => !b.isCompleted && b.startTime > now).length > 0 && (
        <Card className="border-border/60 bg-card/80 p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Blocks</h3>
          <div className="flex flex-wrap gap-2">
            {timeBlocks
              .filter(b => !b.isCompleted && b.startTime > now)
              .slice(0, 4)
              .map(block => {
                const task = block.taskId ? tasks.find(t => t.id === block.taskId) : null;
                return (
                  <Badge key={block.id} variant="secondary" className="gap-1.5 py-1.5">
                    {format(block.startTime, 'h:mm a')}
                    {task && <span className="text-muted-foreground">• {task.title}</span>}
                  </Badge>
                );
              })}
          </div>
        </Card>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => {
          loadData();
          setCreateDialogOpen(false);
        }}
        projects={projects}
        defaultScheduledDate={new Date()}
      />

      {/* Quick Schedule Dialog */}
      <QuickScheduleDialog
        open={!!quickScheduleTask}
        onOpenChange={(open) => !open && setQuickScheduleTask(null)}
        task={quickScheduleTask}
        onScheduled={loadData}
      />

      {/* Energy Settings Dialog */}
      <EnergySettings
        open={energySettingsOpen}
        onOpenChange={setEnergySettingsOpen}
      />
    </div>
  );
}
