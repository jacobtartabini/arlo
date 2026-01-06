import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Clock, Play, Calendar, Timer } from "lucide-react";
import { format, addMinutes, setHours, setMinutes, startOfHour } from "date-fns";
import { useTimeBlocksPersistence } from "@/hooks/useTimeBlocksPersistence";
import { toast } from "@/hooks/use-toast";
import type { Task, BlockType } from "@/types/productivity";
import { cn } from "@/lib/utils";

interface QuickScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onScheduled?: () => void;
}

const DURATION_PRESETS = [15, 25, 30, 45, 60, 90, 120];
const BLOCK_TYPES: { value: BlockType; label: string; color: string }[] = [
  { value: 'focus', label: 'Deep Focus', color: 'bg-primary/10 text-primary border-primary' },
  { value: 'soft', label: 'Soft Focus', color: 'bg-orange-500/10 text-orange-500 border-orange-500' },
];

function getNextTimeSlots(): Date[] {
  const now = new Date();
  const slots: Date[] = [];
  
  // Start from next 15-min boundary
  let current = startOfHour(now);
  while (current <= now) {
    current = addMinutes(current, 15);
  }
  
  // Generate slots for the next 4 hours
  for (let i = 0; i < 16; i++) {
    slots.push(current);
    current = addMinutes(current, 15);
  }
  
  return slots;
}

export function QuickScheduleDialog({ 
  open, 
  onOpenChange, 
  task,
  onScheduled,
}: QuickScheduleDialogProps) {
  const { createTimeBlock } = useTimeBlocksPersistence();
  
  const [duration, setDuration] = useState(task?.timeEstimateMinutes || 30);
  const [blockType, setBlockType] = useState<BlockType>('focus');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const timeSlots = getNextTimeSlots();

  const handleStartNow = async () => {
    if (!task) return;
    
    setLoading(true);
    const start = new Date();
    const end = addMinutes(start, duration);
    
    const block = await createTimeBlock(start, end, {
      taskId: task.id,
      blockType,
    });
    
    setLoading(false);
    
    if (block) {
      toast({ title: "Focus block started!", description: `${duration} minutes for "${task.title}"` });
      onOpenChange(false);
      onScheduled?.();
    } else {
      toast({ title: "Error", description: "Failed to create time block", variant: "destructive" });
    }
  };

  const handleSchedule = async () => {
    if (!task || !startTime) return;
    
    setLoading(true);
    const end = addMinutes(startTime, duration);
    
    const block = await createTimeBlock(startTime, end, {
      taskId: task.id,
      blockType,
    });
    
    setLoading(false);
    
    if (block) {
      toast({ 
        title: "Focus block scheduled!", 
        description: `${format(startTime, 'h:mm a')} - ${format(end, 'h:mm a')} for "${task.title}"` 
      });
      onOpenChange(false);
      onScheduled?.();
    } else {
      toast({ title: "Error", description: "Failed to schedule time block", variant: "destructive" });
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Quick Schedule
          </DialogTitle>
          <DialogDescription>
            Create a focus block for <span className="font-medium text-foreground">"{task.title}"</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Block Type Selection */}
          <div className="space-y-2">
            <Label>Block Type</Label>
            <div className="flex gap-2">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setBlockType(type.value)}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                    blockType === type.value ? type.color : "border-border bg-background hover:bg-muted/50"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {duration} min
              </Badge>
            </div>
            
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={duration === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDuration(preset)}
                  className="h-8"
                >
                  {preset}m
                </Button>
              ))}
            </div>
            
            {/* Custom slider */}
            <Slider
              value={[duration]}
              onValueChange={([val]) => setDuration(val)}
              min={5}
              max={180}
              step={5}
              className="py-2"
            />
          </div>

          {/* Start Time Selection */}
          <div className="space-y-2">
            <Label>Start Time</Label>
            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {timeSlots.map((slot, i) => (
                <Button
                  key={i}
                  variant={startTime?.getTime() === slot.getTime() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStartTime(slot)}
                  className="h-8 text-xs"
                >
                  {format(slot, 'h:mm a')}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleStartNow}
              disabled={loading}
              className="flex-1 gap-2"
              variant="default"
            >
              <Play className="h-4 w-4" />
              Start Now
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={loading || !startTime}
              className="flex-1 gap-2"
              variant="secondary"
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
