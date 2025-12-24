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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sun, Moon, Flame } from "lucide-react";
import { useHabitSystem } from "@/hooks/useHabitSystem";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { RoutineType } from "@/types/habits";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  routineType: z.enum(["morning", "night", "custom"]),
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
  const { createRoutine } = useHabitSystem();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      routineType: "morning",
      anchorCue: "",
      rewardDescription: "",
    },
  });

  const routineType = form.watch("routineType");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    const routine = await createRoutine({
      name: data.name,
      routineType: data.routineType as RoutineType,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Routine</DialogTitle>
          <DialogDescription>
            A routine is an ordered sequence of habits you perform together.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-3 gap-3"
                    >
                      <Label
                        htmlFor="morning"
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all",
                          routineType === "morning" 
                            ? "border-amber-500 bg-amber-500/5" 
                            : "hover:border-border/80"
                        )}
                      >
                        <RadioGroupItem value="morning" id="morning" className="sr-only" />
                        <Sun className={cn(
                          "h-6 w-6",
                          routineType === "morning" ? "text-amber-500" : "text-muted-foreground"
                        )} />
                        <span className="text-sm font-medium">Morning</span>
                      </Label>
                      
                      <Label
                        htmlFor="night"
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all",
                          routineType === "night" 
                            ? "border-indigo-500 bg-indigo-500/5" 
                            : "hover:border-border/80"
                        )}
                      >
                        <RadioGroupItem value="night" id="night" className="sr-only" />
                        <Moon className={cn(
                          "h-6 w-6",
                          routineType === "night" ? "text-indigo-500" : "text-muted-foreground"
                        )} />
                        <span className="text-sm font-medium">Night</span>
                      </Label>
                      
                      <Label
                        htmlFor="custom"
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all",
                          routineType === "custom" 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-border/80"
                        )}
                      >
                        <RadioGroupItem value="custom" id="custom" className="sr-only" />
                        <Flame className={cn(
                          "h-6 w-6",
                          routineType === "custom" ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="text-sm font-medium">Custom</span>
                      </Label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex gap-3 justify-end">
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
