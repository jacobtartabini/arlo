import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { RoutineWithHabits, HabitType, ScheduleType, Difficulty } from "@/types/habits";

const DAYS = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
];

const DIFFICULTIES: { value: Difficulty; label: string; xp: number }[] = [
  { value: 'trivial', label: 'Trivial', xp: 5 },
  { value: 'easy', label: 'Easy', xp: 10 },
  { value: 'medium', label: 'Medium', xp: 15 },
  { value: 'hard', label: 'Hard', xp: 25 },
];

const formSchema = z.object({
  title: z.string().min(1, "Name is required").max(50),
  habitType: z.enum(["check", "count", "duration"]),
  durationMinutes: z.number().min(1).max(120).optional(),
  scheduleType: z.enum(["daily", "weekdays", "weekends", "custom"]),
  scheduleDays: z.array(z.number()).optional(),
  difficulty: z.enum(["trivial", "easy", "medium", "hard"]),
  routineId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routines: RoutineWithHabits[];
  onCreated: () => void;
}

export function CreateHabitDialog({ open, onOpenChange, routines, onCreated }: CreateHabitDialogProps) {
  const { createHabit } = useHabits();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      habitType: "check",
      durationMinutes: undefined,
      scheduleType: "daily",
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      difficulty: "medium",
      routineId: undefined,
    },
  });

  const scheduleType = form.watch("scheduleType");
  const habitType = form.watch("habitType");
  const difficulty = form.watch("difficulty");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    let scheduleDays = [0, 1, 2, 3, 4, 5, 6];
    if (data.scheduleType === "weekdays") {
      scheduleDays = [1, 2, 3, 4, 5];
    } else if (data.scheduleType === "weekends") {
      scheduleDays = [0, 6];
    } else if (data.scheduleType === "custom" && data.scheduleDays) {
      scheduleDays = data.scheduleDays;
    }

    const habit = await createHabit({
      title: data.title,
      habitType: data.habitType as HabitType,
      durationMinutes: data.habitType === 'duration' ? data.durationMinutes : undefined,
      scheduleType: data.scheduleType as ScheduleType,
      scheduleDays,
      difficulty: data.difficulty as Difficulty,
      routineId: data.routineId === "none" ? undefined : data.routineId,
    });

    setLoading(false);

    if (habit) {
      toast({ title: "Habit created!", description: `"${habit.title}" is ready to track.` });
      form.reset();
      onOpenChange(false);
      onCreated();
    } else {
      toast({ title: "Error", description: "Failed to create habit", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Habit</DialogTitle>
          <DialogDescription>
            Add a habit to track. Keep it simple and actionable.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Drink water, Meditate, Read" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="habitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="check">Check-off</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="duration">Timed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {habitType === "duration" && (
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={120}
                        placeholder="e.g., 5, 10, 30"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Timer will count down during focus mode</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {DIFFICULTIES.map((diff) => (
                      <Label
                        key={diff.value}
                        htmlFor={diff.value}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border cursor-pointer transition-all text-center",
                          difficulty === diff.value 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-border/80"
                        )}
                      >
                        <input
                          type="radio"
                          id={diff.value}
                          value={diff.value}
                          checked={field.value === diff.value}
                          onChange={() => field.onChange(diff.value)}
                          className="sr-only"
                        />
                        <Sparkles className={cn(
                          "h-4 w-4",
                          difficulty === diff.value ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="text-xs font-medium">{diff.label}</span>
                        <span className="text-[10px] text-muted-foreground">+{diff.xp} XP</span>
                      </Label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Every day</SelectItem>
                      <SelectItem value="weekdays">Weekdays only</SelectItem>
                      <SelectItem value="weekends">Weekends only</SelectItem>
                      <SelectItem value="custom">Custom days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {scheduleType === "custom" && (
              <FormField
                control={form.control}
                name="scheduleDays"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2 justify-center">
                      {DAYS.map((day) => {
                        const isActive = field.value?.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            className={cn(
                              "w-9 h-9 rounded-full text-sm font-medium transition-all",
                              isActive 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted hover:bg-muted/80"
                            )}
                            onClick={() => {
                              const current = field.value || [];
                              if (isActive) {
                                field.onChange(current.filter((v) => v !== day.value));
                              } else {
                                field.onChange([...current, day.value]);
                              }
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {routines.length > 0 && (
              <FormField
                control={form.control}
                name="routineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add to routine (optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Standalone habit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Standalone habit</SelectItem>
                        {routines.map((routine) => (
                          <SelectItem key={routine.id} value={routine.id}>
                            {routine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
