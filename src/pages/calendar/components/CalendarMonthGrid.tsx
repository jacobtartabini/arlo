import * as React from "react";
import { format, isSameMonth, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import type { BookingSlot, CalendarEvent } from "@/lib/calendar-data";
import { buildBlocks, formatDisplayTime } from "../utils";

export type CalendarMonthGridProps = {
  days: Date[];
  selectedDate: Date;
  events: CalendarEvent[];
  bookings: BookingSlot[];
  onSelectDate: (date: Date) => void;
};

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  days,
  selectedDate,
  events,
  bookings,
  onSelectDate
}) => (
  <div className="h-full min-h-[640px] overflow-auto">
    <div className="grid min-h-full grid-cols-7 border-l border-t">
      {days.map(day => {
        const dayBlocks = buildBlocks(events, bookings, day);
        const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDate(day)}
            className={cn(
              "flex min-h-[120px] flex-col border-b border-r px-3 pb-3 pt-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              !isSameMonth(day, selectedDate) && "bg-muted/60 text-muted-foreground",
              isSelected && "bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              {dayBlocks.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{dayBlocks.length}</span>
              )}
            </div>
            <div className="mt-2 space-y-0.5">
              {dayBlocks.slice(0, 3).map(block => (
                <div
                  key={block.id}
                  className="flex items-center gap-1 rounded-sm bg-muted/50 px-1.5 py-0.5 text-[11px]"
                  style={{ borderLeft: `2px solid ${block.color}` }}
                >
                  <span className="truncate font-medium">{block.title}</span>
                  {block.eventSource && block.eventSource !== "arlo" && (
                    <span
                      className={cn(
                        "flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold",
                        block.eventSource === "google" && "bg-blue-500/30 text-blue-700 dark:text-blue-300",
                        block.eventSource === "outlook_ics" && "bg-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                      )}
                    >
                      {block.eventSource === "google" ? "G" : "O"}
                    </span>
                  )}
                  <span className="ml-auto truncate text-[10px] text-muted-foreground">
                    {block.allDay ? "All day" : formatDisplayTime(block.startMinutes)}
                  </span>
                </div>
              ))}
              {dayBlocks.length > 3 && (
                <span className="block text-xs text-muted-foreground">+{dayBlocks.length - 3} more</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
