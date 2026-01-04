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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon, Flame } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { RoutineType, RepeatUnit } from "@/types/habits";

const DAYS = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  routineType: z.enum(["morning", "night", "custom"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  scheduleDays: z.array(z.number()),
  repeatInterval: z.number().min(1).max(12),
  repeatUnit: z.enum(["day", "week", "month"]),
  anchorCue: z.string().max(100).optional(),
  rewardDescription: z.string().max(200).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateRoutineDialog({ open, onOpenChange, onCreated }: CreateRoutineDialogProps) {
  const { createRoutine } = useHabits();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      routineType: "morning",
      startTime: "",
      endTime: "",
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      repeatInterval: 1,
      repeatUnit: "day",
      anchorCue: "",
      rewardDescription: "",
    },
  });

  const routineType = form.watch("routineType");
  const scheduleDays = form.watch("scheduleDays");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    const routine = await createRoutine({
      name: data.name,
      routineType: data.routineType as RoutineType,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      scheduleDays: data.scheduleDays,
      repeatInterval: data.repeatInterval,
      repeatUnit: data.repeatUnit as RepeatUnit,
      anchorCue: data.anchorCue || undefined,
      rewardDescription: data.rewardDescription || undefined,
    });

    setLoading(false);

    if (routine) {
      toast({ title: "Routine created!", description: `"${routine.name}" is ready. Add habits to it.` });
      form.reset();
      onOpenChange(false);
      onCreated();
    } else {
      toast({ title: "Error", description: "Failed to create routine", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Routine</DialogTitle>
          <DialogDescription>
            A routine is an ordered sequence of habits you perform together.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Routine name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Morning Ritual, Wind Down" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="routineType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'morning', icon: Sun, label: 'Morning', color: 'amber' },
                        { value: 'night', icon: Moon, label: 'Night', color: 'indigo' },
                        { value: 'custom', icon: Flame, label: 'Custom', color: 'primary' },
                      ].map((type) => {
                        const Icon = type.icon;
                        const isSelected = routineType === type.value;
                        return (
                          <Label
                            key={type.value}
                            htmlFor={type.value}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all",
                              isSelected && type.color === 'amber' && "border-amber-500 bg-amber-500/5",
                              isSelected && type.color === 'indigo' && "border-indigo-500 bg-indigo-500/5",
                              isSelected && type.color === 'primary' && "border-primary bg-primary/5",
                              !isSelected && "hover:border-border/80"
                            )}
                          >
                            <input
                              type="radio"
                              id={type.value}
                              value={type.value}
                              checked={isSelected}
                              onChange={() => field.onChange(type.value)}
                              className="sr-only"
                            />
                            <Icon className={cn(
                              "h-6 w-6",
                              isSelected && type.color === 'amber' && "text-amber-500",
                              isSelected && type.color === 'indigo' && "text-indigo-500",
                              isSelected && type.color === 'primary' && "text-primary",
                              !isSelected && "text-muted-foreground"
                            )} />
                            <span className="text-sm font-medium">{type.label}</span>
                          </Label>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Window */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Schedule Days */}
            <FormField
              control={form.control}
              name="scheduleDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active days</FormLabel>
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
                </FormItem>
              )}
            />

            {/* Repeat Pattern */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="repeatInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat every</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={12}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="repeatUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>&nbsp;</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="day">Day(s)</SelectItem>
                        <SelectItem value="week">Week(s)</SelectItem>
                        <SelectItem value="month">Month(s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="anchorCue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anchor cue (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., After waking up, After brushing teeth" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    The trigger that starts this routine
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rewardDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Enjoy my morning coffee, Cozy reading time" 
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Something to look forward to after completing
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Routine"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
