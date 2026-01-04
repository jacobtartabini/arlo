import { useState } from "react";
import { Bell, Volume2, Vibrate, Clock, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const SOUNDS = [
  { value: "default", label: "Default" },
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "gentle", label: "Gentle Wake" },
  { value: "energetic", label: "Energetic" },
  { value: "none", label: "Silent" },
];

const REMINDER_TIMES = [
  { value: 0, label: "At scheduled time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
];

export interface ReminderSettingsData {
  enabled: boolean;
  type: "push" | "alarm";
  minutesBefore: number;
  sound: string;
  vibrate: boolean;
}

interface ReminderSettingsProps {
  value: ReminderSettingsData;
  onChange: (settings: ReminderSettingsData) => void;
  compact?: boolean;
}

export function ReminderSettings({ value, onChange, compact = false }: ReminderSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const update = (partial: Partial<ReminderSettingsData>) => {
    onChange({ ...value, ...partial });
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Reminder</span>
          <Switch
            checked={value.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
        </div>

        {value.enabled && (
          <div className="bg-background rounded-xl p-1 flex">
            {(["push", "alarm"] as const).map((type) => {
              const isActive = value.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => update({ type })}
                >
                  {type}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Reminder</span>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) => update({ enabled })}
        />
      </div>

      {value.enabled && (
        <>
          {/* Type Selection */}
          <div className="bg-background rounded-xl p-1 flex">
            {(["push", "alarm"] as const).map((type) => {
              const isActive = value.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => update({ type })}
                >
                  {type === "push" ? "Push Notification" : "Alarm"}
                </button>
              );
            })}
          </div>

          {/* When to remind */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>When to remind</span>
            </div>
            <Select
              value={value.minutesBefore.toString()}
              onValueChange={(v) => update({ minutesBefore: parseInt(v) })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_TIMES.map((time) => (
                  <SelectItem key={time.value} value={time.value.toString()}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Advanced settings</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Sound */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  <span>Sound</span>
                </div>
                <Select
                  value={value.sound}
                  onValueChange={(sound) => update({ sound })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUNDS.map((sound) => (
                      <SelectItem key={sound.value} value={sound.value}>
                        {sound.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vibrate */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Vibrate className="h-4 w-4 text-muted-foreground" />
                  <span>Vibrate</span>
                </div>
                <Switch
                  checked={value.vibrate}
                  onCheckedChange={(vibrate) => update({ vibrate })}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
