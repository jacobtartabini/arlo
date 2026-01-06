import { useState, useEffect } from "react";
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
import { CalendarIcon, Zap, BatteryMedium, BatteryLow, Trash2, Timer } from "lucide-react";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task, EnergyLevel, Project } from "@/types/productivity";

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
  timeEstimateMinutes: z.number().min(1).max(480).optional().nullable(),
  dueDate: z.date().optional().nullable(),
  scheduledDate: z.date().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects?: Project[];
  onUpdated?: () => void;
  onDeleted?: () => void;
  onStartFocus?: (task: Task) => void;
}

export function EditTaskDialog({ 
  task,
  open, 
  onOpenChange, 
  projects = [],
  onUpdated,
  onDeleted,
  onStartFocus,
}: EditTaskDialogProps) {
  const { updateTask, deleteTask } = useTasksPersistence();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: 3,
      energyLevel: "medium",
      timeEstimateMinutes: undefined,
      dueDate: undefined,
      scheduledDate: undefined,
      projectId: undefined,
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        energyLevel: (task.energyLevel as EnergyLevel) || "medium",
        timeEstimateMinutes: task.timeEstimateMinutes || undefined,
        dueDate: task.dueDate || undefined,
        scheduledDate: task.scheduledDate || undefined,
        projectId: task.projectId || undefined,
      });
      setDeleteConfirm(false);
    }
  }, [task, open, form]);

  const selectedPriority = form.watch("priority");
  const selectedEnergy = form.watch("energyLevel");

  const onSubmit = async (data: FormData) => {
    if (!task) return;
    
    setLoading(true);
    
    const success = await updateTask(task.id, {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority,
      energyLevel: data.energyLevel,
      timeEstimateMinutes: data.timeEstimateMinutes || undefined,
      dueDate: data.dueDate || undefined,
      scheduledDate: data.scheduledDate || undefined,
      projectId: data.projectId || undefined,
    });

    setLoading(false);

    if (success) {
      toast({ title: "Task updated!" });
      onOpenChange(false);
      onUpdated?.();
    } else {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setLoading(true);
    const success = await deleteTask(task.id);
    setLoading(false);

    if (success) {
      toast({ title: "Task deleted" });
      onOpenChange(false);
      onDeleted?.();
    } else {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    }
  };

  const handleStartFocus = () => {
    if (task) {
      onOpenChange(false);
      onStartFocus?.(task);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) setDeleteConfirm(false);
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and settings.
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
                      value={field.value || ""}
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
                        htmlFor={`edit-priority-${priority.value}`}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all text-center text-xs",
                          selectedPriority === priority.value 
                            ? priority.className
                            : "border-border hover:border-border/80"
                        )}
                      >
                        <input
                          type="radio"
                          id={`edit-priority-${priority.value}`}
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
                          htmlFor={`edit-energy-${level.value}`}
                          className={cn(
                            "flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                            selectedEnergy === level.value 
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-border/80"
                          )}
                        >
                          <input
                            type="radio"
                            id={`edit-energy-${level.value}`}
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

            {/* Project selector */}
            {projects.length > 0 && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
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
                          onChange={() => field.onChange(null)}
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
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
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
                            {field.value ? format(field.value, "MMM d") : "Not set"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
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
                  <FormLabel>Due Date</FormLabel>
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
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-3 justify-between pt-2">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={deleteConfirm ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deleteConfirm ? "Confirm Delete" : "Delete"}
                </Button>
                
                {onStartFocus && (
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={handleStartFocus}
                  >
                    <Timer className="h-4 w-4 mr-1" />
                    Focus
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
