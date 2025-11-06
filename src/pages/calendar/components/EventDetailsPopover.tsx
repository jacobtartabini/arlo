import * as React from "react";
import { createPortal } from "react-dom";
import { endOfDay, format, isSameDay, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPublicBookingUrl } from "@/lib/calendar-data";

import type { BookingSlot } from "@/lib/calendar-data";
import { blockTypeLabels } from "../constants";
import type { CalendarBlock } from "../types";
import { formatTimeRange } from "../utils";

import {
  Clock,
  Info,
  Link as LinkIcon,
  MapPin,
  Pencil,
  UserRound,
  X
} from "lucide-react";

export type EventDetailsPopoverProps = {
  block: CalendarBlock;
  target: HTMLElement;
  onClose: () => void;
  onEdit?: (block: CalendarBlock) => void;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  origin: "center top" | "center bottom" | "center center";
};

const initialPosition: PopoverPosition = {
  top: 0,
  left: 0,
  width: 320,
  origin: "center top"
};

export const EventDetailsPopover: React.FC<EventDetailsPopoverProps> = ({ block, target, onClose, onEdit }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<PopoverPosition>(initialPosition);

  const updatePosition = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const rect = target.getBoundingClientRect();
    const margin = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(392, viewportWidth - margin * 2);
    const cardHeight = containerRef.current?.offsetHeight ?? 0;

    let top = rect.bottom + window.scrollY + margin;
    let origin: PopoverPosition["origin"] = "center top";

    if (cardHeight && top + cardHeight > window.scrollY + viewportHeight - margin) {
      top = rect.top + window.scrollY - cardHeight - margin;
      origin = "center bottom";
    }

    if (top < window.scrollY + margin) {
      top = window.scrollY + margin;
      origin = "center center";
    }

    let left = rect.left + window.scrollX + rect.width / 2 - width / 2;
    const minLeft = window.scrollX + margin;
    const maxLeft = window.scrollX + viewportWidth - width - margin;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    setPosition({ top, left, width, origin });
  }, [target]);

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    const targetObserver = new ResizeObserver(handle);
    targetObserver.observe(target);
    let cardObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      cardObserver = new ResizeObserver(handle);
      cardObserver.observe(containerRef.current);
    }

    const raf = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
      targetObserver.disconnect();
      cardObserver?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, updatePosition]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      if (!document.body.contains(target)) {
        onClose();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [onClose, target]);

  const eventDate = React.useMemo(() => parseISO(`${block.date}T00:00:00`), [block.date]);
  const occurrenceStart = React.useMemo(() => {
    const value = typeof block.meta?.occurrenceStart === "string" ? parseISO(block.meta.occurrenceStart as string) : null;
    if (value && !Number.isNaN(value.getTime())) {
      return value;
    }
    return eventDate;
  }, [block.meta?.occurrenceStart, eventDate]);

  const occurrenceEnd = React.useMemo(() => {
    const value = typeof block.meta?.occurrenceEnd === "string" ? parseISO(block.meta.occurrenceEnd as string) : null;
    if (value && !Number.isNaN(value.getTime())) {
      return value;
    }
    return block.allDay ? endOfDay(eventDate) : eventDate;
  }, [block.allDay, block.meta?.occurrenceEnd, eventDate]);

  const formattedDate = React.useMemo(() => {
    if (!occurrenceStart || !occurrenceEnd) {
      return format(eventDate, "EEEE, MMM d yyyy");
    }

    return isSameDay(occurrenceStart, occurrenceEnd)
      ? format(occurrenceStart, "EEEE, MMM d yyyy")
      : `${format(occurrenceStart, "EEE, MMM d")} – ${format(occurrenceEnd, "EEE, MMM d yyyy")}`;
  }, [eventDate, occurrenceEnd, occurrenceStart]);

  const timeRange = React.useMemo(() => {
    if (!occurrenceStart || !occurrenceEnd) {
      return block.allDay ? "All day" : formatTimeRange(block.startMinutes, block.endMinutes);
    }

    if (block.allDay) {
      return isSameDay(occurrenceStart, occurrenceEnd)
        ? "All day"
        : `${format(occurrenceStart, "MMM d")} – ${format(occurrenceEnd, "MMM d")} · All day`;
    }

    return isSameDay(occurrenceStart, occurrenceEnd)
      ? `${format(occurrenceStart, "p")} – ${format(occurrenceEnd, "p")}`
      : `${format(occurrenceStart, "MMM d · p")} – ${format(occurrenceEnd, "MMM d · p")}`;
  }, [block.allDay, block.endMinutes, block.startMinutes, occurrenceEnd, occurrenceStart]);
  const attendees = block.source === "event" && Array.isArray(block.meta?.attendees)
    ? (block.meta?.attendees as string[])
    : [];
  const slot = block.source === "booking" ? (block.meta as BookingSlot | undefined) : undefined;
  const description = block.source === "event" && block.meta?.description
    ? String(block.meta.description)
    : undefined;

  const inviteUrl = slot ? getPublicBookingUrl(slot) : undefined;

  const handleEditClick = () => {
    if (!onEdit) return;
    onEdit(block);
    onClose();
  };

  return createPortal(
    (
      <>
        <div className="fixed inset-0 z-[199] bg-black/10 backdrop-blur-[1px]" onClick={onClose} />
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed z-[200] max-w-full overflow-hidden rounded-3xl border border-border bg-popover text-foreground shadow-2xl transition-transform",
            "ring-1 ring-border/40",
            "sm:rounded-[28px]"
          )}
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            transformOrigin: position.origin
          }}
        >
          <div className="h-1 w-full" style={{ backgroundColor: block.color ?? "#2563eb" }} />
          <div className="flex max-h-[calc(100vh-3rem)] flex-col overflow-auto">
            <div className="px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-flex h-3.5 w-3.5 flex-shrink-0 rounded-full shadow-inner"
                    style={{ backgroundColor: block.color ?? "#2563eb" }}
                  />
                  <div className="space-y-1">
                    <Badge
                      variant="secondary"
                      className="bg-muted text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {blockTypeLabels[block.source]}
                    </Badge>
                    <h2 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{block.title}</h2>
                    {block.subtitle && (
                      <p className="text-sm text-muted-foreground">{block.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onEdit && block.source !== "task" && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleEditClick}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
                    aria-label="Close event details"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-6 px-5 pb-6 text-sm text-muted-foreground">
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{timeRange}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{formattedDate}</p>
                  </div>
                </div>
                {block.source === "event" && block.meta?.location && (
                  <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{String(block.meta.location)}</p>
                      <p className="text-xs text-muted-foreground/80">Location</p>
                    </div>
                  </div>
                )}
                {block.subtitle && (
                  <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                      <Info className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-snug text-muted-foreground">{block.subtitle}</p>
                  </div>
                )}
              </div>

              {description && (
                <div className="space-y-2 rounded-2xl border border-border/80 bg-background/70 p-4 text-sm leading-relaxed text-muted-foreground">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Description</p>
                  <p className="whitespace-pre-wrap text-foreground/80">{description}</p>
                </div>
              )}

              {attendees.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/70">
                    <UserRound className="h-3.5 w-3.5" />
                    Guests
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attendees.map(person => (
                      <span
                        key={person}
                        className="inline-flex items-center rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {person}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {slot && (
                <div className="space-y-3 rounded-2xl border border-border/80 bg-background/70 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground/70">
                    <span>Booking details</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        slot.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                      )}
                    >
                      {slot.available ? "Open" : slot.bookedBy ? "Booked" : "Closed"}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">
                      {slot.available ? "Accepting bookings" : slot.bookedBy ? `Booked by ${slot.bookedBy}` : "Not available"}
                    </p>
                    {slot.description && <p>{slot.description}</p>}
                  </div>
                  {inviteUrl && (
                    <Button variant="outline" className="w-full justify-center gap-2" asChild>
                      <a href={inviteUrl} target="_blank" rel="noreferrer">
                        <LinkIcon className="h-4 w-4" />
                        Open booking link
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {block.source === "task" && (
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                  This focus block keeps the day on track. Drag to adjust the session or convert it into an event.
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    ),
    document.body
  );
};

