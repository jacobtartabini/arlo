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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useHabitSystem } from "@/hooks/useHabitSystem";
import { toast } from "@/hooks/use-toast";
import type { RoutineWithHabits, HabitType, ScheduleType, Difficulty } from "@/types/habits";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const formSchema = z.object({
  title: z.string().min(1, "Name is required").max(50),
  habitType: z.enum(["check", "count", "duration"]),
  scheduleType: z.enum(["daily", "weekdays", "weekends", "custom"]),
  scheduleDays: z.array(z.number()).optional(),
  difficulty: z.enum(["normal", "hard"]),
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
  const { createHabit } = useHabitSystem();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      habitType: "check",
      scheduleType: "daily",
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      difficulty: "normal",
      routineId: undefined,
    },
  });

  const scheduleType = form.watch("scheduleType");

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Habit</DialogTitle>
          <DialogDescription>
            Add a new habit to track. Keep it simple and actionable.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habit name</FormLabel>
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
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="check" id="check" />
                        <Label htmlFor="check">Check-off</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="count" id="count" />
                        <Label htmlFor="count">Count</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="duration" id="duration" />
                        <Label htmlFor="duration">Duration</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
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
                        <SelectValue placeholder="Select schedule" />
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
                    <FormLabel>Select days</FormLabel>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map((day) => (
                        <label
                          key={day.value}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                        >
                          <Checkbox
                            checked={field.value?.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, day.value]);
                              } else {
                                field.onChange(current.filter((v) => v !== day.value));
                              }
                            }}
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
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
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="normal" id="normal" />
                        <Label htmlFor="normal">Normal (+10 XP)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hard" id="hard" />
                        <Label htmlFor="hard">Hard (+15 XP)</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Habit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
