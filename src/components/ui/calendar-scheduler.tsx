"use client";

import * as React from "react";
import { format } from "date-fns";

import type { CalendarProps } from "@/components/ui/calendar";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CalendarSchedulerProps {
  className?: string;
  timeSlots?: string[];
  selectedDate?: Date;
  selectedTime?: string;
  disabled?: CalendarProps["disabled"];
  onDateChange?: (value: Date | undefined) => void;
  onTimeChange?: (value: string | undefined) => void;
  onConfirm?: (value: { date?: Date; time?: string }) => void;
}

function CalendarScheduler(props: CalendarSchedulerProps) {
  const {
    className,
    timeSlots = [
      "08:00 AM",
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "01:00 PM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
      "05:00 PM",
    ],
    selectedDate,
    selectedTime,
    disabled,
    onDateChange,
    onTimeChange,
    onConfirm,
  } = props;

  const isDateControlled = Object.prototype.hasOwnProperty.call(props, "selectedDate");
  const isTimeControlled = Object.prototype.hasOwnProperty.call(props, "selectedTime");

  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() => {
    if (isDateControlled) {
      return selectedDate;
    }
    return new Date();
  });
  const [internalTime, setInternalTime] = React.useState<string | undefined>(() => {
    if (isTimeControlled) {
      return selectedTime;
    }
    return undefined;
  });

  const date = isDateControlled ? selectedDate : internalDate;
  const time = isTimeControlled ? selectedTime : internalTime;

  React.useEffect(() => {
    if (isDateControlled) {
      setInternalDate(selectedDate);
    }
  }, [isDateControlled, selectedDate]);

  React.useEffect(() => {
    if (isTimeControlled) {
      setInternalTime(selectedTime);
    }
  }, [isTimeControlled, selectedTime]);

  React.useEffect(() => {
    if (time && !timeSlots.includes(time)) {
      if (!isTimeControlled) {
        setInternalTime(undefined);
      }
      onTimeChange?.(undefined);
    }
  }, [time, timeSlots, isTimeControlled, onTimeChange]);

  const handleDateSelect = (next?: Date) => {
    if (!isDateControlled) {
      setInternalDate(next);
    }
    if (!isTimeControlled) {
      setInternalTime(undefined);
    }
    onDateChange?.(next);
    if (time) {
      onTimeChange?.(undefined);
    }
  };

  const handleTimeSelect = (slot: string) => {
    if (!isTimeControlled) {
      setInternalTime(slot);
    }
    onTimeChange?.(slot);
  };

  const handleReset = () => {
    if (!isDateControlled) {
      setInternalDate(undefined);
    }
    if (!isTimeControlled) {
      setInternalTime(undefined);
    }
    onDateChange?.(undefined);
    onTimeChange?.(undefined);
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <Card className="w-full max-w-[620px] rounded-3xl border border-border/60 bg-card/95 shadow-lg shadow-black/5">
        <CardHeader className="gap-1 border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">Schedule a Meeting</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 p-6 pt-6 lg:flex-row">
          <div className="flex-1 rounded-2xl border border-border/60 bg-background/70 p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={disabled}
            />
          </div>
          <div className="flex-1 max-h-[320px] overflow-y-auto rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Pick a time</p>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map(slot => (
                <Button
                  key={slot}
                  variant={time === slot ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-full rounded-full text-xs font-medium",
                    time === slot
                      ? "shadow-sm shadow-primary/20"
                      : "border-border/60 bg-card/60 text-foreground"
                  )}
                  onClick={() => handleTimeSelect(slot)}
                  disabled={!date}
                >
                  {slot}
                </Button>
              ))}
              {!timeSlots.length && (
                <div className="col-span-2 flex h-[140px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/60 text-sm text-muted-foreground">
                  {date ? `No times available for ${format(date, "MMMM d")}.` : "Select a date to view times."}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between px-6 pb-6 pt-0">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={handleReset}>
            Reset
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => onConfirm?.({ date, time })}
            disabled={!date || !time}
          >
            Confirm
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export { CalendarScheduler };
