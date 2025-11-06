import * as React from "react";
import { format, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import {
  DEFAULT_SELECTION_DURATION,
  DISPLAY_END_MINUTES,
  DISPLAY_START_MINUTES,
  HOUR_HEIGHT,
  HOURS_PER_DAY,
  MINUTE_STEP,
  STEPS_PER_HOUR
} from "../constants";
import type { CalendarBlock, CalendarDayBlocks, CalendarView } from "../types";
import {
  clampMinutes,
  computeBlockLayout,
  formatDisplayTimeRange,
  formatTimeRange,
  getContrastTextColor,
  hexToRgb,
  minutesToPx,
  minutesToTime,
  pxToMinutes
} from "../utils";

type CalendarTimelineProps = {
  view: CalendarView;
  focusBlocks: CalendarDayBlocks[];
  onCreateRequest: (day: Date, startMinutes: number, endMinutes: number) => void;
  onBlockSelect: (block: CalendarBlock, target: HTMLElement) => void;
};

type DragState = {
  day: Date;
  dayKey: string;
  anchorMinutes: number;
};

type SelectionState = {
  day: Date;
  dayKey: string;
  startMinutes: number;
  endMinutes: number;
};

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  view,
  focusBlocks,
  onCreateRequest,
  onBlockSelect
}) => {
  const [selection, setSelection] = React.useState<SelectionState | null>(null);
  const dragStateRef = React.useRef<DragState | null>(null);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    dayEntry: CalendarDayBlocks,
    dayKey: string
  ) => {
    if ((event.target as HTMLElement).closest("[data-calendar-block]")) {
      return;
    }

    if (event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const rawMinutes = clampMinutes(pxToMinutes(offsetY));
    const anchor = clampMinutes(Math.min(rawMinutes, DISPLAY_END_MINUTES - MINUTE_STEP));
    const startMinutes = anchor;
    const endMinutes = clampMinutes(anchor + DEFAULT_SELECTION_DURATION);
    const nextSelection: SelectionState = { day: dayEntry.day, dayKey, startMinutes, endMinutes };

    dragStateRef.current = { day: dayEntry.day, dayKey, anchorMinutes: anchor };
    setSelection(nextSelection);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    dayEntry: CalendarDayBlocks,
    dayKey: string
  ) => {
    if (!dragStateRef.current || dragStateRef.current.dayKey !== dayKey) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const rawMinutes = clampMinutes(pxToMinutes(offsetY));
    const anchor = dragStateRef.current.anchorMinutes;

    let startMinutes = Math.min(anchor, rawMinutes);
    let endMinutes = Math.max(anchor, rawMinutes);

    if (endMinutes - startMinutes < MINUTE_STEP) {
      if (rawMinutes >= anchor) {
        endMinutes = clampMinutes(anchor + MINUTE_STEP);
      } else {
        startMinutes = clampMinutes(anchor - MINUTE_STEP);
      }
    }

    const nextSelection: SelectionState = { day: dayEntry.day, dayKey, startMinutes, endMinutes };
    dragStateRef.current = { ...dragStateRef.current, anchorMinutes: anchor };
    setSelection(nextSelection);
  };

  const handlePointerEnd = (
    event: React.PointerEvent<HTMLDivElement>,
    dayEntry: CalendarDayBlocks,
    dayKey: string
  ) => {
    if (!dragStateRef.current || dragStateRef.current.dayKey !== dayKey) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const { anchorMinutes } = dragStateRef.current;
    const currentSelection = selection ?? {
      day: dayEntry.day,
      dayKey,
      startMinutes: anchorMinutes,
      endMinutes: clampMinutes(anchorMinutes + DEFAULT_SELECTION_DURATION)
    };

    dragStateRef.current = null;
    setSelection(null);

    onCreateRequest(
      dayEntry.day,
      Math.min(currentSelection.startMinutes, currentSelection.endMinutes),
      Math.max(currentSelection.startMinutes, currentSelection.endMinutes)
    );
  };

  const handlePointerCancel = () => {
    dragStateRef.current = null;
    setSelection(null);
  };

  return (
    <div className="relative h-full min-h-[640px] overflow-x-auto overflow-y-auto">
      <div className="flex min-h-full">
        <div className="sticky left-0 z-10 flex w-16 flex-col border-r bg-card text-right text-[11px] text-muted-foreground">
          {Array.from({ length: (HOURS_PER_DAY / 60) + 1 }).map((_, index) => {
            const minutes = DISPLAY_START_MINUTES + index * 60;
            return (
              <div key={minutes} className="h-[52px] px-2 pt-2">
                {minutes % 120 === 0 ? minutesToTime(minutes) : ""}
              </div>
            );
          })}
        </div>
        <div
          className={cn(
            "grid flex-1",
            view === "week" ? "min-w-[960px] grid-cols-7" : "min-w-[360px] grid-cols-1"
          )}
        >
          {focusBlocks.map(({ day, blocks }) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const layout = computeBlockLayout(blocks);
            const selectionForDay = selection && selection.dayKey === dayKey ? selection : null;

            return (
              <div key={day.toISOString()} className="relative border-r last:border-r-0">
                <div className="sticky top-0 z-10 flex h-20 flex-col justify-center border-b bg-card/95 px-4 py-3 backdrop-blur">
                  <div className="flex items-center justify-start">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{format(day, "EEE")}</p>
                      <p className={cn("text-xl font-semibold", isToday(day) && "text-primary")}>
                        {format(day, "d MMM")}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className="relative cursor-crosshair"
                  style={{ height: `${(HOURS_PER_DAY / 60) * HOUR_HEIGHT}px` }}
                  onPointerDown={event => handlePointerDown(event, { day, blocks }, dayKey)}
                  onPointerMove={event => handlePointerMove(event, { day, blocks }, dayKey)}
                  onPointerUp={event => handlePointerEnd(event, { day, blocks }, dayKey)}
                  onPointerCancel={handlePointerCancel}
                >
                  <div className="absolute inset-0">
                    {Array.from({ length: HOURS_PER_DAY / MINUTE_STEP + 1 }).map((_, index) => {
                      const top = (index * MINUTE_STEP * HOUR_HEIGHT) / 60;
                      const isHourMark = index % STEPS_PER_HOUR === 0;
                      return (
                        <div
                          key={index}
                          className={cn(
                            "absolute left-0 right-0 border-border/60",
                            isHourMark ? "border-t" : "border-t border-dashed opacity-60"
                          )}
                          style={{ top: `${top}px` }}
                        />
                      );
                    })}
                  </div>
                  <div className="absolute inset-x-3 inset-y-0 pb-6">
                    {selectionForDay && (() => {
                      const top = minutesToPx(selectionForDay.startMinutes);
                      const height = Math.max(32, minutesToPx(selectionForDay.endMinutes) - top);
                      return (
                        <div
                          className="pointer-events-none absolute left-1 right-1 rounded-lg border border-primary/60 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary shadow-sm"
                          style={{ top, height }}
                        >
                          {formatTimeRange(selectionForDay.startMinutes, selectionForDay.endMinutes)}
                        </div>
                      );
                    })()}
                    {blocks.map(block => {
                      const layoutInfo = layout.get(block.id);
                      const top = minutesToPx(block.startMinutes);
                      const height = Math.max(36, minutesToPx(block.endMinutes) - top);
                      const widthPercent = layoutInfo ? 100 / layoutInfo.columns : 100;
                      const leftPercent = layoutInfo ? layoutInfo.lane * widthPercent : 0;
                      const isTask = block.source === "task";
                      const rgb = hexToRgb(block.color);
                      const baseTextColor = isTask ? "#0f172a" : getContrastTextColor(block.color);
                      const subtleTextColor = isTask
                        ? "rgba(15, 23, 42, 0.65)"
                        : baseTextColor === "#ffffff"
                          ? "rgba(255, 255, 255, 0.8)"
                          : "rgba(15, 23, 42, 0.7)";
                      const backgroundColor = isTask && rgb
                        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`
                        : block.color;
                      const borderColor = isTask && rgb
                        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
                        : "transparent";
                      const timeLabel = block.allDay
                        ? "All day"
                        : formatDisplayTimeRange(block.startMinutes, block.endMinutes);

                      return (
                        <button
                          key={block.id}
                          type="button"
                          data-calendar-block
                          onPointerDown={event => event.stopPropagation()}
                          onClick={event => onBlockSelect(block, event.currentTarget)}
                          title={`${block.title} · ${formatTimeRange(block.startMinutes, block.endMinutes)}`}
                          className={cn(
                            "absolute flex h-full flex-col justify-between overflow-hidden rounded-2xl p-3 text-left text-sm shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            isTask && "border border-dashed"
                          )}
                          style={{
                            top,
                            height,
                            left: `calc(${leftPercent}% + 0.25rem)`,
                            width: `calc(${widthPercent}% - 0.5rem)`,
                            backgroundColor,
                            color: baseTextColor,
                            borderColor,
                            boxShadow: isTask
                              ? "0 10px 20px -15px rgba(15, 23, 42, 0.5)"
                              : "0 18px 40px -24px rgba(15, 23, 42, 0.65)"
                          }}
                        >
                          <div className="flex flex-col gap-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold leading-snug">{block.title}</p>
                            <p className="text-xs font-medium" style={{ color: subtleTextColor }}>
                              {timeLabel}
                            </p>
                            {block.subtitle && (
                              <p className="truncate text-xs" style={{ color: subtleTextColor }}>
                                {block.subtitle}
                              </p>
                            )}
                          </div>
                          {block.isAvailable && (
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                              Available
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
