import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Play, Pause, CheckCircle2, Timer } from "lucide-react";
import { format, differenceInMinutes, differenceInSeconds } from "date-fns";
import type { TimeBlock, Task } from "@/types/productivity";

interface CurrentTimeBlockProps {
  timeBlock: TimeBlock | null;
  task?: Task | null;
  onComplete?: (id: string) => void;
}

export function CurrentTimeBlock({ timeBlock, task, onComplete }: CurrentTimeBlockProps) {
  const [now, setNow] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!timeBlock || isPaused) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [timeBlock, isPaused]);

  if (!timeBlock) {
    return (
      <Card className="relative overflow-hidden border-border/60 bg-card/80 p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No Active Time Block</p>
            <p className="text-xs text-muted-foreground">Schedule a focus block to get started</p>
          </div>
        </div>
      </Card>
    );
  }

  const totalMinutes = differenceInMinutes(timeBlock.endTime, timeBlock.startTime);
  const elapsedMinutes = differenceInMinutes(now, timeBlock.startTime);
  const remainingSeconds = Math.max(0, differenceInSeconds(timeBlock.endTime, now));
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecs = remainingSeconds % 60;
  const progress = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));

  const isOvertime = now > timeBlock.endTime;
  const blockTypeLabel = timeBlock.blockType === 'focus' ? 'Focus' : timeBlock.blockType === 'break' ? 'Break' : 'Soft Focus';
  const blockTypeColor = timeBlock.blockType === 'focus' 
    ? 'bg-primary/10 text-primary' 
    : timeBlock.blockType === 'break' 
    ? 'bg-green-500/10 text-green-500' 
    : 'bg-orange-500/10 text-orange-500';

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 p-6">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${blockTypeColor}`}>
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{blockTypeLabel} Block</p>
                <Badge variant="secondary" className="text-xs">
                  {format(timeBlock.startTime, 'h:mm a')} – {format(timeBlock.endTime, 'h:mm a')}
                </Badge>
              </div>
              {task && (
                <p className="text-sm text-muted-foreground">{task.title}</p>
              )}
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-right">
            <p className={`text-2xl font-bold tabular-nums ${isOvertime ? 'text-destructive' : 'text-foreground'}`}>
              {isOvertime ? '+' : ''}{remainingMinutes}:{remainingSecs.toString().padStart(2, '0')}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOvertime ? 'overtime' : 'remaining'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={progress} 
          className="h-2" 
        />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {elapsedMinutes} of {totalMinutes} minutes elapsed
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 gap-1.5"
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onComplete?.(timeBlock.id)}
              className="h-8 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Complete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
