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

function CalendarScheduler({
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
}: CalendarSchedulerProps) {
  const isDateControlled = selectedDate !== undefined;
  const isTimeControlled = selectedTime !== undefined;

  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() => selectedDate ?? new Date());
  const [internalTime, setInternalTime] = React.useState<string | undefined>(() => selectedTime);

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
    <div className={cn("flex w-full flex-col items-center", className)}>
      <Card className="w-full max-w-[600px] border-none bg-background shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Schedule a Meeting</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1 rounded-md border p-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={disabled}
              className="rounded-md"
            />
          </div>
          <div className="flex-1 max-h-[320px] overflow-y-auto rounded-md border p-2">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Pick a time</p>
            {timeSlots.length ? (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map(slot => (
                  <Button
                    key={slot}
                    variant={time === slot ? "default" : "outline"}
                    size="sm"
                    className={cn("w-full", time === slot && "ring-2 ring-primary")}
                    onClick={() => handleTimeSelect(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex h-[180px] w-full items-center justify-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
                No times available for {date ? format(date, "MMMM d") : "this day"}.
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm?.({ date, time })}
            disabled={!date || !time}
          >
            Confirm
          </Button>
        </CardFooter>
      </Card>
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Minimal design • made by{" "}
        <a href="https://www.ruixen.com" target="_blank" rel="noreferrer" className="underline">
          ruixen.com
        </a>
      </div>
    </div>
  );
}

export { CalendarScheduler };
