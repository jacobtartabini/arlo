import * as React from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPublicBookingUrl } from "@/lib/calendar-data";

import { blockTypeLabels } from "../constants";
import type { CalendarBlock } from "../types";
import { formatTimeRange } from "../utils";

import {
  Clock,
  Info,
  Link as LinkIcon,
  MapPin,
  UserRound,
  X
} from "lucide-react";
import type { BookingSlot } from "@/lib/calendar-data";

export type EventDetailsPopoverProps = {
  block: CalendarBlock;
  target: HTMLElement;
  onClose: () => void;
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

export const EventDetailsPopover: React.FC<EventDetailsPopoverProps> = ({ block, target, onClose }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<PopoverPosition>(initialPosition);

  const updatePosition = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const rect = target.getBoundingClientRect();
    const margin = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(360, viewportWidth - margin * 2);
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
  const formattedDate = React.useMemo(() => format(eventDate, "EEEE, MMM d yyyy"), [eventDate]);
  const timeRange = block.allDay ? "All day" : formatTimeRange(block.startMinutes, block.endMinutes);
  const attendees = block.source === "event" && Array.isArray(block.meta?.attendees)
    ? (block.meta?.attendees as string[])
    : [];
  const slot = block.source === "booking" ? (block.meta as BookingSlot | undefined) : undefined;
  const description = block.source === "event" && block.meta?.description
    ? String(block.meta.description)
    : undefined;

  const inviteUrl = slot ? getPublicBookingUrl(slot) : undefined;

  return createPortal(
    (
      <>
        <div className="fixed inset-0 z-[199] bg-black/5 backdrop-blur-[1px]" onClick={onClose} />
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
            <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
              <div className="space-y-1">
                <Badge
                  variant="secondary"
                  className="bg-muted text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {blockTypeLabels[block.source]}
                </Badge>
                <p className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{block.title}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
                aria-label="Close event details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5 px-5 pb-5 text-sm text-muted-foreground">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{timeRange}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">{formattedDate}</p>
                  </div>
                </div>
                {block.subtitle && (
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{block.subtitle}</p>
                  </div>
                )}
                {block.source === "event" && block.meta?.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{String(block.meta.location)}</p>
                  </div>
                )}
              </div>

              {description && (
                <div className="rounded-2xl border border-border/80 bg-muted/60 p-4 text-sm text-muted-foreground">
                  {description}
                </div>
              )}

              {attendees.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/80">
                    <UserRound className="h-3.5 w-3.5" />
                    Attendees
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attendees.map(person => (
                      <span
                        key={person}
                        className="inline-flex items-center rounded-full border border-border/80 bg-background px-3 py-1 text-xs text-foreground"
                      >
                        {person}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {slot && (
                <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Booking details</p>
                  <p className="text-sm font-medium text-foreground">
                    {slot.available ? "Open for booking" : slot.bookedBy ? `Booked by ${slot.bookedBy}` : "Unavailable"}
                  </p>
                  {slot.description && <p className="text-sm">{slot.description}</p>}
                  {inviteUrl && (
                    <Button variant="outline" className="w-full justify-center gap-2" asChild>
                      <a href={inviteUrl} target="_blank" rel="noreferrer">
                        <LinkIcon className="h-4 w-4" />
                        View public link
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {block.source === "task" && (
                <div className="rounded-2xl border border-border/80 bg-muted/60 p-4 text-sm">
                  Focus session scheduled to keep the day on track.
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
