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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Zap, BatteryMedium, BatteryLow } from "lucide-react";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EnergyLevel } from "@/types/productivity";

const PRIORITIES = [
  { value: 1, label: "P1 - Critical", className: "border-red-500 bg-red-500/10 text-red-600" },
  { value: 2, label: "P2 - High", className: "border-orange-500 bg-orange-500/10 text-orange-600" },
  { value: 3, label: "P3 - Medium", className: "border-blue-500 bg-blue-500/10 text-blue-600" },
  { value: 4, label: "P4 - Low", className: "border-border bg-muted text-muted-foreground" },
];

const ENERGY_LEVELS: { value: EnergyLevel; label: string; icon: React.ElementType }[] = [
  { value: "high", label: "High Focus", icon: Zap },
  { value: "medium", label: "Medium", icon: BatteryMedium },
  { value: "low", label: "Low Energy", icon: BatteryLow },
];

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  priority: z.number().min(1).max(4),
  energyLevel: z.enum(["low", "medium", "high"]),
  timeEstimateMinutes: z.number().min(1).max(480).optional(),
  dueDate: z.date().optional(),
  scheduledDate: z.date().optional(),
  projectId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  projectColor?: string;
  projects?: Project[];
  defaultScheduledDate?: Date;
  onCreated: () => void;
}

export function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  projectId,
  projectColor = "#6366f1",
  projects = [],
  defaultScheduledDate,
  onCreated,
}: CreateTaskDialogProps) {
  const { createTask } = useTasksPersistence();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: 3,
      energyLevel: "medium",
      timeEstimateMinutes: undefined,
      dueDate: undefined,
      scheduledDate: defaultScheduledDate,
      projectId: projectId,
    },
  });

  const selectedPriority = form.watch("priority");
  const selectedEnergy = form.watch("energyLevel");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    const task = await createTask(data.title, {
      projectId: data.projectId || projectId,
      description: data.description,
      priority: data.priority,
      energyLevel: data.energyLevel,
      timeEstimateMinutes: data.timeEstimateMinutes,
      dueDate: data.dueDate,
      scheduledDate: data.scheduledDate,
    });

    setLoading(false);

    if (task) {
      toast({ title: "Task created!", description: `"${task.title}" added.` });
      form.reset();
      onOpenChange(false);
      onCreated();
    } else {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            Add a task to track. Be specific and actionable.
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
                    <Input placeholder="What needs to be done?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add details or context..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITIES.map((priority) => (
                      <Label
                        key={priority.value}
                        htmlFor={`priority-${priority.value}`}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all text-center text-xs",
                          selectedPriority === priority.value 
                            ? priority.className
                            : "border-border hover:border-border/80"
                        )}
                      >
                        <input
                          type="radio"
                          id={`priority-${priority.value}`}
                          value={priority.value}
                          checked={field.value === priority.value}
                          onChange={() => field.onChange(priority.value)}
                          className="sr-only"
                        />
                        <span className="font-medium">P{priority.value}</span>
                      </Label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="energyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Required</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {ENERGY_LEVELS.map((level) => {
                      const IconComponent = level.icon;
                      return (
                        <Label
                          key={level.value}
                          htmlFor={`energy-${level.value}`}
                          className={cn(
                            "flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                            selectedEnergy === level.value 
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-border/80"
                          )}
                        >
                          <input
                            type="radio"
                            id={`energy-${level.value}`}
                            value={level.value}
                            checked={field.value === level.value}
                            onChange={() => field.onChange(level.value)}
                            className="sr-only"
                          />
                          <IconComponent className="h-4 w-4" />
                          <span>{level.label}</span>
                        </Label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project selector - only show if projects available and no fixed projectId */}
            {projects.length > 0 && !projectId && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project (optional)</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      <Label
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm",
                          !field.value 
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-border/80"
                        )}
                      >
                        <input
                          type="radio"
                          checked={!field.value}
                          onChange={() => field.onChange(undefined)}
                          className="sr-only"
                        />
                        <span>No Project</span>
                      </Label>
                      {projects.map((project) => (
                        <Label
                          key={project.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm",
                            field.value === project.id 
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-border/80"
                          )}
                          style={field.value === project.id ? { borderColor: project.color, color: project.color } : {}}
                        >
                          <input
                            type="radio"
                            checked={field.value === project.id}
                            onChange={() => field.onChange(project.id)}
                            className="sr-only"
                          />
                          <span>{project.icon}</span>
                          <span>{project.name}</span>
                        </Label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeEstimateMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Estimate (min)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        max={480}
                        placeholder="e.g., 30"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "MMM d") : "Today"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal w-full",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "No deadline"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                style={{ backgroundColor: projectColor }}
              >
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
