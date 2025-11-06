import * as React from "react";
import { format, isSameMonth, isToday } from "date-fns";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CalendarMiniMonthProps = {
  selectedDate: Date;
  days: Date[];
  monthOptions: { value: string; label: string }[];
  yearOptions: { value: string; label: string }[];
  weekdayLabels: string[];
  onSelectDate: (date: Date) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onStepMonth: (delta: number) => void;
};

export const CalendarMiniMonth: React.FC<CalendarMiniMonthProps> = ({
  selectedDate,
  days,
  monthOptions,
  yearOptions,
  weekdayLabels,
  onSelectDate,
  onMonthChange,
  onYearChange,
  onStepMonth
}) => (
  <div className="rounded-2xl border bg-card p-5 shadow-sm">
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(selectedDate.getMonth())} onValueChange={onMonthChange}>
        <SelectTrigger className="h-9 min-w-[128px] justify-between rounded-xl border-border/60 text-sm">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(selectedDate.getFullYear())} onValueChange={onYearChange}>
        <SelectTrigger className="h-9 min-w-[88px] justify-between rounded-xl border-border/60 text-sm">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => onStepMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => onStepMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
      {weekdayLabels.map(day => (
        <span key={day}>{day}</span>
      ))}
    </div>
    <div className="mt-2 grid grid-cols-7 gap-1">
      {days.map(day => {
        const isCurrentMonth = isSameMonth(day, selectedDate);
        const isCurrentDay = isToday(day);
        const isSelectedDay = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
        return (
          <Button
            key={day.toISOString()}
            variant="ghost"
            size="sm"
            onClick={() => onSelectDate(day)}
            className={cn(
              "flex h-8 items-center justify-center rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              !isCurrentMonth && "text-muted-foreground/60",
              isSelectedDay && "bg-primary text-primary-foreground",
              !isSelectedDay && isCurrentDay && "border border-primary text-primary",
              !isSelectedDay && !isCurrentDay && "hover:bg-muted"
            )}
          >
            {format(day, "d")}
          </Button>
        );
      })}
    </div>
  </div>
);
