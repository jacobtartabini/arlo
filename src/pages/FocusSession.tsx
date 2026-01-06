import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Pause, Play, SkipForward, ChevronRight, Timer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useTimeBlocksPersistence } from "@/hooks/useTimeBlocksPersistence";
import { addMinutes, differenceInSeconds, format } from "date-fns";
import type { Task, TimeBlock } from "@/types/productivity";

export default function FocusSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");
  const blockId = searchParams.get("blockId");
  const durationParam = searchParams.get("duration");

  const { fetchTasks, toggleTask } = useTasksPersistence();
  const { createTimeBlock, completeTimeBlock, fetchTimeBlocksForDate } = useTimeBlocksPersistence();

  const [task, setTask] = useState<Task | null>(null);
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [now, setNow] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);

  // Duration in minutes (default 25 min pomodoro)
  const duration = durationParam ? parseInt(durationParam) : 25;

  // Load task and time block
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch task if taskId provided
        if (taskId) {
          const tasks = await fetchTasks();
          const foundTask = tasks.find(t => t.id === taskId);
          setTask(foundTask || null);
        }

        // Fetch or create time block
        if (blockId) {
          const blocks = await fetchTimeBlocksForDate(new Date());
          const foundBlock = blocks.find(b => b.id === blockId);
          setTimeBlock(foundBlock || null);
        } else if (taskId) {
          // Create a new time block for this task
          const start = new Date();
          const end = addMinutes(start, duration);
          const newBlock = await createTimeBlock(start, end, {
            taskId,
            blockType: 'focus',
          });
          setTimeBlock(newBlock);
        } else {
          // Create a freeform focus block without task
          const start = new Date();
          const end = addMinutes(start, duration);
          const newBlock = await createTimeBlock(start, end, {
            blockType: 'focus',
          });
          setTimeBlock(newBlock);
        }
      } catch (err) {
        console.error('[FocusSession] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId, blockId, duration, fetchTasks, fetchTimeBlocksForDate, createTimeBlock]);

  // Timer tick
  useEffect(() => {
    if (!timeBlock || isPaused || showComplete) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [timeBlock, isPaused, showComplete]);

  // Check if session is complete
  useEffect(() => {
    if (timeBlock && now >= timeBlock.endTime && !showComplete) {
      setShowComplete(true);
    }
  }, [now, timeBlock, showComplete]);

  const handleComplete = useCallback(async () => {
    if (timeBlock) {
      await completeTimeBlock(timeBlock.id);
    }
    if (task) {
      await toggleTask(task.id, true);
    }
    navigate("/productivity");
  }, [timeBlock, task, completeTimeBlock, toggleTask, navigate]);

  const handleSkip = useCallback(async () => {
    if (timeBlock) {
      await completeTimeBlock(timeBlock.id);
    }
    navigate("/productivity");
  }, [timeBlock, completeTimeBlock, navigate]);

  const handleClose = useCallback(() => {
    navigate("/productivity");
  }, [navigate]);

  // Calculate timer values
  const totalSeconds = timeBlock 
    ? differenceInSeconds(timeBlock.endTime, timeBlock.startTime) 
    : duration * 60;
  const remainingSeconds = timeBlock
    ? Math.max(0, differenceInSeconds(timeBlock.endTime, now))
    : totalSeconds;
  const elapsedSeconds = totalSeconds - remainingSeconds;
  const progress = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;
  const isOvertime = remainingSeconds === 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-primary/20 flex items-center justify-center animate-pulse">
            <Timer className="h-10 w-10 text-primary" />
          </div>
          <p className="text-muted-foreground">Starting focus session...</p>
        </motion.div>
      </div>
    );
  }

  // Completion screen
  if (showComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-32 h-32 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Sparkles className="h-16 w-16 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Session Complete!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground mb-8 text-center max-w-sm"
        >
          {task ? `Great work on "${task.title}"!` : `You focused for ${duration} minutes. Great job!`}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4"
        >
          {task && !task.done && (
            <Button variant="outline" onClick={() => toggleTask(task.id, true).then(() => navigate("/productivity"))}>
              <Check className="h-4 w-4 mr-2" />
              Mark Task Complete
            </Button>
          )}
          <Button onClick={() => navigate("/productivity")}>
            <ChevronRight className="h-4 w-4 mr-2" />
            Back to Productivity
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-muted/30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between p-4 border-b border-border/40">
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("w-2 h-2 rounded-full", isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse")} />
          <span className="font-medium">{isPaused ? "Paused" : "Focus"}</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key="timer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            {/* Task Title */}
            {task && (
              <Badge variant="secondary" className="mb-6 text-sm">
                {task.title}
              </Badge>
            )}

            {/* Circular Timer */}
            <div 
              className="relative w-64 h-64 mx-auto mb-10 cursor-pointer group"
              onClick={() => setIsPaused(!isPaused)}
            >
              {/* Background circle */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={cn(
                    "text-primary",
                    isOvertime && "text-destructive"
                  )}
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                  initial={false}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100),
                  }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-5xl font-bold tabular-nums tracking-tight",
                  isOvertime && "text-destructive"
                )}>
                  {formatTime(remainingSeconds)}
                </span>
                <span className="text-sm text-muted-foreground mt-2">
                  {isOvertime ? "Overtime" : "remaining"}
                </span>
                
                {/* Hover hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-full">
                  {isPaused ? (
                    <Play className="h-12 w-12 text-primary" />
                  ) : (
                    <Pause className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <Pause className="h-6 w-6" />
                )}
              </Button>
              
              <Button
                size="icon"
                className="h-16 w-16 rounded-full shadow-lg"
                onClick={handleComplete}
              >
                <Check className="h-8 w-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={handleSkip}
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="relative p-4 border-t border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatTime(elapsedSeconds)} / {formatTime(totalSeconds)}
          </span>
        </div>
        
        {timeBlock && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Started at {format(timeBlock.startTime, 'h:mm a')}</span>
            <span>Ends at {format(timeBlock.endTime, 'h:mm a')}</span>
          </div>
        )}
      </footer>
    </motion.div>
  );
}
