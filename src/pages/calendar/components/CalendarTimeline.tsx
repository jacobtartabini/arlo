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
  formatHourLabel,
  formatTimeRange,
  getContrastTextColor,
  hexToRgb,
  minutesToPx,
  pxToMinutes
} from "../utils";

type CalendarTimelineProps = {
  view: CalendarView;
  focusBlocks: CalendarDayBlocks[];
  onCreateRequest: (day: Date, startMinutes: number, endMinutes: number) => void;
  onBlockSelect: (block: CalendarBlock, target: HTMLElement) => void;
  onBlockMove: (block: CalendarBlock, day: Date, startMinutes: number, endMinutes: number) => void;
};

type SelectionDragState = {
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

type BlockDragState = {
  block: CalendarBlock;
  originDay: Date;
  originDayKey: string;
  dayKey: string;
  pointerId: number;
  offsetWithinBlock: number;
  duration: number;
  initialClientX: number;
  initialClientY: number;
  isDragging: boolean;
};

type DragPreviewState = {
  block: CalendarBlock;
  day: Date;
  dayKey: string;
  originDayKey: string;
  startMinutes: number;
  endMinutes: number;
};

const DAY_HEADER_HEIGHT = 80;
const TIMELINE_HEIGHT = (HOURS_PER_DAY / 60) * HOUR_HEIGHT;
const TOTAL_TIMELINE_HEIGHT = TIMELINE_HEIGHT + DAY_HEADER_HEIGHT;

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  view,
  focusBlocks,
  onCreateRequest,
  onBlockSelect,
  onBlockMove
}) => {
  const [selection, setSelection] = React.useState<SelectionState | null>(null);
  const selectionDragRef = React.useRef<SelectionDragState | null>(null);
  const blockDragRef = React.useRef<BlockDragState | null>(null);
  const [blockPreview, setBlockPreview] = React.useState<DragPreviewState | null>(null);
  const blockPreviewRef = React.useRef<DragPreviewState | null>(null);
  const suppressClickRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    blockPreviewRef.current = blockPreview;
  }, [blockPreview]);

  const dayLookup = React.useMemo(
    () => new Map(focusBlocks.map(({ day }) => [format(day, "yyyy-MM-dd"), day])),
    [focusBlocks]
  );

  const blockContainerRefs = React.useRef(new Map<string, HTMLDivElement | null>());
  const dayColumnRefs = React.useRef(new Map<string, HTMLDivElement | null>());

  const setBlockContainerRef = React.useCallback((dayKey: string, node: HTMLDivElement | null) => {
    const map = blockContainerRefs.current;
    if (node) {
      map.set(dayKey, node);
    } else {
      map.delete(dayKey);
    }
  }, []);

  const setDayColumnRef = React.useCallback((dayKey: string, node: HTMLDivElement | null) => {
    const map = dayColumnRefs.current;
    if (node) {
      map.set(dayKey, node);
    } else {
      map.delete(dayKey);
    }
  }, []);

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

    selectionDragRef.current = { day: dayEntry.day, dayKey, anchorMinutes: anchor };
    setSelection(nextSelection);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    dayEntry: CalendarDayBlocks,
    dayKey: string
  ) => {
    if (!selectionDragRef.current || selectionDragRef.current.dayKey !== dayKey) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const rawMinutes = clampMinutes(pxToMinutes(offsetY));
    const anchor = selectionDragRef.current.anchorMinutes;

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
    selectionDragRef.current = { ...selectionDragRef.current, anchorMinutes: anchor };
    setSelection(nextSelection);
  };

  const handlePointerEnd = (
    event: React.PointerEvent<HTMLDivElement>,
    dayEntry: CalendarDayBlocks,
    dayKey: string
  ) => {
    if (!selectionDragRef.current || selectionDragRef.current.dayKey !== dayKey) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const { anchorMinutes } = selectionDragRef.current;
    const currentSelection = selection ?? {
      day: dayEntry.day,
      dayKey,
      startMinutes: anchorMinutes,
      endMinutes: clampMinutes(anchorMinutes + DEFAULT_SELECTION_DURATION)
    };

    selectionDragRef.current = null;
    setSelection(null);

    onCreateRequest(
      dayEntry.day,
      Math.min(currentSelection.startMinutes, currentSelection.endMinutes),
      Math.max(currentSelection.startMinutes, currentSelection.endMinutes)
    );
  };

  const handlePointerCancel = () => {
    selectionDragRef.current = null;
    setSelection(null);
  };

  const getTargetDayKey = (clientX: number) => {
    for (const [key, node] of dayColumnRefs.current.entries()) {
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return key;
      }
    }
    return null;
  };

  const handleBlockPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    block: CalendarBlock,
    dayEntry: CalendarDayBlocks,
    dayKey: string
  ) => {
    if (block.source === "task" || event.button !== 0) {
      return;
    }

    const container = blockContainerRefs.current.get(dayKey);
    if (!container) return;

    event.stopPropagation();
    event.preventDefault();

    const rect = container.getBoundingClientRect();
    const pointerY = event.clientY - rect.top;
    const blockTop = minutesToPx(block.startMinutes);
    const offsetWithinBlock = pointerY - blockTop;

    event.currentTarget.setPointerCapture(event.pointerId);

    blockDragRef.current = {
      block,
      originDay: dayEntry.day,
      originDayKey: dayKey,
      dayKey,
      pointerId: event.pointerId,
      offsetWithinBlock,
      duration: block.endMinutes - block.startMinutes,
      initialClientX: event.clientX,
      initialClientY: event.clientY,
      isDragging: false
    };
  };

  const handleBlockPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    block: CalendarBlock
  ) => {
    const drag = blockDragRef.current;
    if (!drag || drag.block.id !== block.id) return;

    const targetDayKey = getTargetDayKey(event.clientX) ?? drag.dayKey;
    const container = blockContainerRefs.current.get(targetDayKey);
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointerY = event.clientY - rect.top;
    const offset = pointerY - drag.offsetWithinBlock;
    let minutes = clampMinutes(pxToMinutes(offset));
    minutes = Math.min(minutes, DISPLAY_END_MINUTES - drag.duration);
    const startMinutes = clampMinutes(minutes);
    const endMinutes = clampMinutes(startMinutes + drag.duration);

    const diffX = Math.abs(event.clientX - drag.initialClientX);
    const diffY = Math.abs(event.clientY - drag.initialClientY);
    const hasMoved = diffX > 4 || diffY > 4;

    if (!drag.isDragging && !hasMoved) {
      return;
    }

    const day = dayLookup.get(targetDayKey) ?? drag.originDay;

    blockDragRef.current = {
      ...drag,
      isDragging: true,
      dayKey: targetDayKey
    };

    setBlockPreview(prev => {
      if (
        prev &&
        prev.block.id === block.id &&
        prev.dayKey === targetDayKey &&
        prev.startMinutes === startMinutes &&
        prev.endMinutes === endMinutes
      ) {
        return prev;
      }

      return {
        block,
        day,
        dayKey: targetDayKey,
        originDayKey: drag.originDayKey,
        startMinutes,
        endMinutes
      };
    });
  };

  const handleBlockPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
    block: CalendarBlock
  ) => {
    const drag = blockDragRef.current;
    if (!drag || drag.block.id !== block.id) return;

    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);

    const preview = blockPreviewRef.current;
    if (drag.isDragging && preview) {
      const movedDay = preview.dayKey !== drag.originDayKey;
      const movedTime =
        preview.startMinutes !== drag.block.startMinutes || preview.endMinutes !== drag.block.endMinutes;

      if (movedDay || movedTime) {
        suppressClickRef.current = block.id;
        onBlockMove(block, preview.day, preview.startMinutes, preview.endMinutes);
      }
    }

    blockDragRef.current = null;
    setBlockPreview(null);
  };

  const handleBlockPointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>,
    block: CalendarBlock
  ) => {
    const drag = blockDragRef.current;
    if (!drag || drag.block.id !== block.id) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    blockDragRef.current = null;
    setBlockPreview(null);
  };

  const handleBlockClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    block: CalendarBlock
  ) => {
    if (suppressClickRef.current === block.id) {
      suppressClickRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onBlockSelect(block, event.currentTarget);
  };

  return (
    <div className="relative h-full min-h-[640px] overflow-x-auto overflow-y-auto">
      <div className="flex min-h-full">
        <div
          className="sticky left-0 z-10 flex w-20 flex-col border-r bg-card text-right text-[11px] text-muted-foreground"
          style={{ height: `${TOTAL_TIMELINE_HEIGHT}px` }}
        >
          <div
            className="h-20 border-b border-border/60 bg-card"
            aria-hidden="true"
            style={{ height: `${DAY_HEADER_HEIGHT}px` }}
          />
          <div className="relative flex-1" style={{ height: `${TIMELINE_HEIGHT}px` }}>
            {Array.from({ length: (HOURS_PER_DAY / 60) + 1 }).map((_, index) => {
              const minutes = DISPLAY_START_MINUTES + index * 60;
              if (minutes % 120 !== 0) {
                return null;
              }

              const top = minutesToPx(minutes);
              const isFirstMarker = minutes === DISPLAY_START_MINUTES;

              return (
                <div
                  key={minutes}
                  className={cn(
                    "absolute right-3 font-medium",
                    isFirstMarker ? "translate-y-1" : "-translate-y-1/2"
                  )}
                  style={{ top: `${top}px` }}
                >
                  {formatHourLabel(minutes)}
                </div>
              );
            })}
          </div>
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
              <div
                key={day.toISOString()}
                className="relative border-r last:border-r-0"
                ref={node => setDayColumnRef(dayKey, node)}
              >
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
                  <div
                    className="absolute inset-x-3 inset-y-0 pb-6"
                    ref={node => setBlockContainerRef(dayKey, node)}
                  >
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

                      const previewForBlock = blockPreview && blockPreview.block.id === block.id ? blockPreview : null;
                      const dragState = blockDragRef.current;
                      const isDragging = dragState?.block.id === block.id && dragState.isDragging;

                      return (
                        <button
                          key={block.id}
                          type="button"
                          data-calendar-block
                          onPointerDown={event => handleBlockPointerDown(event, block, { day, blocks }, dayKey)}
                          onPointerMove={event => handleBlockPointerMove(event, block)}
                          onPointerUp={event => handleBlockPointerUp(event, block)}
                          onPointerCancel={event => handleBlockPointerCancel(event, block)}
                          onClick={event => handleBlockClick(event, block)}
                          title={`${block.title} · ${block.allDay ? "All day" : formatTimeRange(block.startMinutes, block.endMinutes)}`}
                          className={cn(
                            "absolute flex h-full flex-col justify-between overflow-hidden rounded-2xl p-3 text-left text-sm shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            "cursor-grab active:cursor-grabbing",
                            isTask && "border border-dashed"
                          )}
                          style={{
                            top: previewForBlock && previewForBlock.dayKey === dayKey
                              ? minutesToPx(previewForBlock.startMinutes)
                              : top,
                            height: previewForBlock && previewForBlock.dayKey === dayKey
                              ? Math.max(36, minutesToPx(previewForBlock.endMinutes) - minutesToPx(previewForBlock.startMinutes))
                              : height,
                            left: `calc(${leftPercent}% + 0.25rem)`,
                            width: `calc(${widthPercent}% - 0.5rem)`,
                            backgroundColor,
                            color: baseTextColor,
                            borderColor,
                            boxShadow: isTask
                              ? "0 10px 20px -15px rgba(15, 23, 42, 0.5)"
                              : "0 18px 40px -24px rgba(15, 23, 42, 0.65)",
                            opacity:
                              previewForBlock && previewForBlock.dayKey !== dayKey
                                ? 0.35
                                : isDragging
                                  ? 0.75
                                  : 1
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
                    {blockPreview &&
                      blockPreview.dayKey === dayKey &&
                      blockPreview.dayKey !== blockPreview.originDayKey && (() => {
                        const previewBlock = blockPreview.block;
                        const previewTop = minutesToPx(blockPreview.startMinutes);
                        const previewHeight = Math.max(
                          36,
                          minutesToPx(blockPreview.endMinutes) - minutesToPx(blockPreview.startMinutes)
                        );
                        const previewTextColor = previewBlock.source === "task"
                          ? "#0f172a"
                          : getContrastTextColor(previewBlock.color);
                        const previewSubtle = previewTextColor === "#ffffff"
                          ? "rgba(255, 255, 255, 0.8)"
                          : "rgba(15, 23, 42, 0.72)";

                        return (
                          <div
                            key="block-preview"
                            className="pointer-events-none absolute left-[0.25rem] right-[0.25rem] flex flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-primary/10 p-3 text-left text-sm shadow-lg"
                            style={{
                              top: previewTop,
                              height: previewHeight,
                              color: previewTextColor,
                              backgroundColor: previewBlock.color,
                              opacity: 0.9
                            }}
                          >
                            <div className="flex flex-col gap-1 overflow-hidden">
                              <p className="truncate text-sm font-semibold leading-snug">{previewBlock.title}</p>
                              {!previewBlock.allDay && (
                                <p className="text-xs font-medium" style={{ color: previewSubtle }}>
                                  {formatDisplayTimeRange(blockPreview.startMinutes, blockPreview.endMinutes)}
                                </p>
                              )}
                              {previewBlock.subtitle && (
                                <p className="truncate text-xs" style={{ color: previewSubtle }}>
                                  {previewBlock.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
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

