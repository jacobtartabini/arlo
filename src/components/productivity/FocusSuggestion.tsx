import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Battery, BatteryLow, Clock, ArrowRight } from "lucide-react";
import type { Task, EnergyLevel } from "@/types/productivity";

interface FocusSuggestionProps {
  tasks: Task[];
  currentEnergyLevel?: EnergyLevel;
  availableMinutes?: number;
  onSelectTask?: (task: Task) => void;
  onStartFocus?: (task: Task) => void;
}

const ENERGY_CONFIG: Record<EnergyLevel, { icon: typeof Zap; label: string; color: string }> = {
  high: { icon: Zap, label: 'High Energy', color: 'text-yellow-500' },
  medium: { icon: Battery, label: 'Medium Energy', color: 'text-blue-500' },
  low: { icon: BatteryLow, label: 'Low Energy', color: 'text-muted-foreground' },
};

function getTimeOfDayEnergy(): EnergyLevel {
  const hour = new Date().getHours();
  // Morning (6-11): High energy
  if (hour >= 6 && hour < 11) return 'high';
  // Late morning/early afternoon (11-14): Medium
  if (hour >= 11 && hour < 14) return 'medium';
  // Afternoon (14-17): Low (post-lunch dip)
  if (hour >= 14 && hour < 17) return 'low';
  // Late afternoon/evening (17-21): Medium
  if (hour >= 17 && hour < 21) return 'medium';
  // Night: Low
  return 'low';
}

export function FocusSuggestion({
  tasks,
  currentEnergyLevel,
  availableMinutes = 60,
  onSelectTask,
  onStartFocus,
}: FocusSuggestionProps) {
  const suggestedTask = useMemo(() => {
    const incompleteTasks = tasks.filter(t => !t.done);
    if (incompleteTasks.length === 0) return null;

    const energy = currentEnergyLevel || getTimeOfDayEnergy();
    
    // Score tasks based on multiple factors
    const scoredTasks = incompleteTasks.map(task => {
      let score = 0;
      
      // Priority weight (higher priority = higher score)
      score += task.priority * 20;
      
      // Energy match (matching energy level = bonus)
      if (task.energyLevel === energy) {
        score += 30;
      } else if (
        (energy === 'high' && task.energyLevel === 'medium') ||
        (energy === 'medium' && task.energyLevel === 'low')
      ) {
        score += 15; // Slightly lower energy is okay
      }
      
      // Time fit (task fits in available time = bonus)
      if (task.timeEstimateMinutes && task.timeEstimateMinutes <= availableMinutes) {
        score += 25;
        // Bonus for tasks that fit well (not too short)
        if (task.timeEstimateMinutes >= availableMinutes * 0.5) {
          score += 10;
        }
      }
      
      // Due date urgency
      if (task.dueDate) {
        const daysUntilDue = Math.ceil(
          (task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDue <= 1) score += 50;
        else if (daysUntilDue <= 3) score += 25;
        else if (daysUntilDue <= 7) score += 10;
      }
      
      // Scheduled for today
      if (task.scheduledDate) {
        const today = new Date().toDateString();
        if (task.scheduledDate.toDateString() === today) {
          score += 40;
        }
      }
      
      return { task, score };
    });
    
    // Sort by score and return the best
    scoredTasks.sort((a, b) => b.score - a.score);
    return scoredTasks[0]?.task || null;
  }, [tasks, currentEnergyLevel, availableMinutes]);

  const currentEnergy = currentEnergyLevel || getTimeOfDayEnergy();
  const EnergyIcon = ENERGY_CONFIG[currentEnergy].icon;

  if (!suggestedTask) {
    return (
      <Card className="relative overflow-hidden border-border/60 bg-card/80 p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">All Caught Up!</p>
            <p className="text-xs text-muted-foreground">No tasks to suggest right now</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-primary/5 via-card/80 to-card/80 p-6">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-40" aria-hidden>
        <div className="absolute -left-8 top-4 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Suggested Focus</span>
          <Badge variant="outline" className="ml-auto gap-1 text-xs">
            <EnergyIcon className={`h-3 w-3 ${ENERGY_CONFIG[currentEnergy].color}`} />
            {ENERGY_CONFIG[currentEnergy].label}
          </Badge>
        </div>

        {/* Task Info */}
        <div className="space-y-2">
          <h3 
            className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
            onClick={() => onSelectTask?.(suggestedTask)}
          >
            {suggestedTask.title}
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {suggestedTask.timeEstimateMinutes && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {suggestedTask.timeEstimateMinutes} min
              </Badge>
            )}
            {suggestedTask.priority > 0 && (
              <Badge variant="secondary" className="text-xs">
                Priority {suggestedTask.priority}
              </Badge>
            )}
            {suggestedTask.dueDate && (
              <Badge 
                variant={
                  suggestedTask.dueDate.getTime() - Date.now() < 86400000 
                    ? "destructive" 
                    : "secondary"
                } 
                className="text-xs"
              >
                Due {suggestedTask.dueDate.toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>

        {/* Action */}
        <Button 
          className="w-full gap-2" 
          onClick={() => onStartFocus?.(suggestedTask)}
        >
          Start Focus Session
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
