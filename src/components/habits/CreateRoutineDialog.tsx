import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Clock, Sunrise, MapPin, ChevronRight } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReminderSettings, type ReminderSettingsData } from "./ReminderSettings";
import { SunriseSunsetPicker } from "./SunriseSunsetPicker";
import { LocationTriggerPicker } from "./LocationTriggerPicker";
import type { RoutineType, RepeatUnit, TriggerType } from "@/types/habits";

const DAYS = [
  { value: 0, label: "su" },
  { value: 1, label: "mo" },
  { value: 2, label: "tu" },
  { value: 3, label: "we" },
  { value: 4, label: "th" },
  { value: 5, label: "fr" },
  { value: 6, label: "sa" },
];

const TIME_OPTIONS = [
  "5:00am", "5:30am", "6:00am", "6:30am", "7:00am", "7:30am",
  "8:00am", "8:30am", "9:00am", "9:30am", "10:00am", "10:30am",
  "11:00am", "11:30am", "12:00pm", "12:30pm", "1:00pm", "1:30pm",
  "2:00pm", "2:30pm", "3:00pm", "3:30pm", "4:00pm", "4:30pm",
  "5:00pm", "5:30pm", "6:00pm", "6:30pm", "7:00pm", "7:30pm",
  "8:00pm", "8:30pm", "9:00pm", "9:30pm", "10:00pm", "10:30pm",
  "11:00pm", "11:30pm",
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  routineType: z.enum(["morning", "night", "custom"]),
  startTime: z.string().optional(),
  startDate: z.date().optional(),
  scheduleDays: z.array(z.number()),
  repeatInterval: z.number().min(1).max(12),
  repeatUnit: z.enum(["day", "week", "month"]),
  // Trigger
  triggerType: z.enum(["time", "sunrise", "sunset", "location"]),
  sunriseType: z.enum(["sunrise", "sunset"]),
  sunriseOffsetMinutes: z.number(),
  triggerLocationId: z.string().nullable(),
  // Reminder
  reminderEnabled: z.boolean(),
  reminderType: z.enum(["push", "alarm"]),
  reminderMinutesBefore: z.number(),
  reminderSound: z.string(),
  reminderVibrate: z.boolean(),
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
      startTime: "9:00am",
      startDate: new Date(),
      scheduleDays: [1, 2, 3, 4, 5],
      repeatInterval: 1,
      repeatUnit: "week",
      triggerType: "time",
      sunriseType: "sunrise",
      sunriseOffsetMinutes: 0,
      triggerLocationId: null,
      reminderEnabled: true,
      reminderType: "push",
      reminderMinutesBefore: 0,
      reminderSound: "default",
      reminderVibrate: true,
    },
  });

  const scheduleDays = form.watch("scheduleDays");
  const startDate = form.watch("startDate");
  const triggerType = form.watch("triggerType");
  const reminderSettings: ReminderSettingsData = {
    enabled: form.watch("reminderEnabled"),
    type: form.watch("reminderType"),
    minutesBefore: form.watch("reminderMinutesBefore"),
    sound: form.watch("reminderSound"),
    vibrate: form.watch("reminderVibrate"),
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    // Convert 12h time to 24h
    const convert12to24 = (time12: string) => {
      if (!time12) return undefined;
      const [time, modifier] = time12.split(/(am|pm)/i);
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier?.toLowerCase() === "pm" && hours !== 12) hours += 12;
      if (modifier?.toLowerCase() === "am" && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, "0")}:${(minutes || 0).toString().padStart(2, "0")}`;
    };

    const routine = await createRoutine({
      name: data.name,
      routineType: data.routineType as RoutineType,
      startTime: data.triggerType === "time" ? convert12to24(data.startTime || "") : undefined,
      scheduleDays: data.scheduleDays,
      repeatInterval: data.repeatInterval,
      repeatUnit: data.repeatUnit as RepeatUnit,
      triggerType: (data.triggerType === "sunrise" || data.triggerType === "sunset") 
        ? data.sunriseType 
        : data.triggerType as TriggerType,
      triggerLocationId: data.triggerLocationId ?? undefined,
      sunriseOffsetMinutes: data.sunriseOffsetMinutes,
      reminderEnabled: data.reminderEnabled,
      reminderType: data.reminderType,
      reminderMinutesBefore: data.reminderMinutesBefore,
      reminderSound: data.reminderSound,
      reminderVibrate: data.reminderVibrate,
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

  const formatRepeatLabel = () => {
    const unit = form.watch("repeatUnit");
    const date = startDate ? format(startDate, "yy.MM.dd") : "";
    if (unit === "week") return `Every week (${date}~)`;
    if (unit === "month") return `Every month (${date}~)`;
    return `Every day (${date}~)`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            {/* Header */}
            <div className="relative pt-4 pb-2 px-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Name Input */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <input
                        {...field}
                        placeholder="ex) Morning Routine"
                        className="w-full text-center text-xl font-semibold bg-transparent border-0 border-b-2 border-border focus:border-primary focus:outline-none py-3 placeholder:text-muted-foreground/50 transition-colors"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="px-4 pb-4 space-y-0">
            {/* Repeat Section */}
            <div className="bg-muted/50 rounded-2xl p-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Repeat</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      type="button"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {formatRepeatLabel()}
                      <ChevronRight className="h-4 w-4" />
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="repeatUnit"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Every day</SelectItem>
                              <SelectItem value="week">Every week</SelectItem>
                              <SelectItem value="month">Every month</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto rounded-lg border"
                          />
                        )}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Day Selector */}
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
                              "w-10 h-10 rounded-full text-sm font-medium transition-all",
                              isActive 
                                ? "bg-foreground text-background" 
                                : "bg-background border border-border text-muted-foreground hover:border-foreground/30"
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
            </div>

            {/* Starts at Section */}
            <div className="bg-muted/50 rounded-2xl p-4 mt-3">
              <span className="font-semibold block mb-3">Starts at</span>
              
              {/* Trigger Type Tabs */}
              <div className="bg-background rounded-xl p-1 flex mb-4">
                {[
                  { value: "time", icon: Clock, label: "Time" },
                  { value: "sunrise", icon: Sunrise, label: "Sun" },
                  { value: "location", icon: MapPin, label: "Location" },
                ].map((trigger) => {
                  const Icon = trigger.icon;
                  const isActive = triggerType === trigger.value || 
                    (triggerType === "sunset" && trigger.value === "sunrise");
                  return (
                    <button
                      key={trigger.value}
                      type="button"
                      className={cn(
                        "flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all",
                        isActive 
                          ? "bg-foreground text-background shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => form.setValue("triggerType", trigger.value as TriggerType)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{trigger.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Time Picker */}
              {triggerType === "time" && (
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-0 h-12 text-lg">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {/* Sunrise/Sunset Picker */}
              {(triggerType === "sunrise" || triggerType === "sunset") && (
                <SunriseSunsetPicker
                  type={form.watch("sunriseType")}
                  offsetMinutes={form.watch("sunriseOffsetMinutes")}
                  onTypeChange={(type) => {
                    form.setValue("sunriseType", type);
                    form.setValue("triggerType", type);
                  }}
                  onOffsetChange={(offset) => form.setValue("sunriseOffsetMinutes", offset)}
                />
              )}

              {/* Location Trigger Picker */}
              {triggerType === "location" && (
                <LocationTriggerPicker
                  selectedLocationId={form.watch("triggerLocationId")}
                  onLocationSelect={(id) => form.setValue("triggerLocationId", id)}
                />
              )}
            </div>

            {/* Reminder Section */}
            <div className="bg-muted/50 rounded-2xl p-4 mt-3">
              <ReminderSettings
                value={reminderSettings}
                onChange={(settings) => {
                  form.setValue("reminderEnabled", settings.enabled);
                  form.setValue("reminderType", settings.type);
                  form.setValue("reminderMinutesBefore", settings.minutesBefore);
                  form.setValue("reminderSound", settings.sound);
                  form.setValue("reminderVibrate", settings.vibrate);
                }}
              />
            </div>

            {/* Done Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl text-lg font-semibold mt-6"
              size="lg"
            >
              {loading ? "Creating..." : "Done"}
            </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
