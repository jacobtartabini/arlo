import * as React from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { format, isAfter } from "date-fns";
import { BadgeCheck, Calendar as CalendarIcon, CheckCircle2, Clock, Mail, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarScheduler } from "@/components/ui/calendar-scheduler";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOKING_STORAGE_KEY,
  BookingSlot,
  CalendarEvent,
  buildBookingTitle,
  formatSlotLabel,
  getPublicBookingUrl,
  getStoredBookings,
  getStoredEvents,
  setStoredBookings,
  setStoredEvents,
} from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

function getSlotStart(slot: BookingSlot) {
  return new Date(`${slot.date}T${slot.startTime}:00`);
}

function getSlotEnd(slot: BookingSlot) {
  return new Date(`${slot.date}T${slot.endTime}:00`);
}

function getDurationMinutes(slot: BookingSlot) {
  const start = getSlotStart(slot).getTime();
  const end = getSlotEnd(slot).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

function getSlotTimeRange(slot: BookingSlot) {
  return `${format(getSlotStart(slot), "h:mm a")} – ${format(getSlotEnd(slot), "h:mm a")}`;
}

const DEFAULT_HANDLE = "jacob";

const PublicBookingPage = () => {
  const params = useParams();
  const handle = (params.handle ?? DEFAULT_HANDLE).toLowerCase();
  const displayName = React.useMemo(
    () =>
      handle
        .split("-")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "Jacob Tartabini",
    [handle],
  );

  const [bookings, setBookings] = React.useState<BookingSlot[]>(() => getStoredBookings());
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({ name: "", email: "", note: "" });
  const [confirmedSlot, setConfirmedSlot] = React.useState<BookingSlot | null>(null);
  const [status, setStatus] = React.useState<"idle" | "success">("idle");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>();

  const bookingLink = React.useMemo(() => getPublicBookingUrl(handle), [handle]);
  const timeZone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const availableSlots = React.useMemo(() => {
    const now = new Date();
    return bookings
      .filter(slot => slot.available && isAfter(getSlotEnd(slot), now))
      .sort((a, b) => getSlotStart(a).getTime() - getSlotStart(b).getTime());
  }, [bookings]);

  const availableSlotsByDate = React.useMemo(() => {
    const grouped = new Map<string, BookingSlot[]>();
    for (const slot of availableSlots) {
      const slotsForDate = grouped.get(slot.date) ?? [];
      slotsForDate.push(slot);
      grouped.set(slot.date, slotsForDate);
    }
    for (const slots of grouped.values()) {
      slots.sort((a, b) => getSlotStart(a).getTime() - getSlotStart(b).getTime());
    }
    return grouped;
  }, [availableSlots]);

  const firstAvailableDate = React.useMemo(() => {
    if (!availableSlots.length) return undefined;
    const first = availableSlots[0];
    return new Date(`${first.date}T00:00:00`);
  }, [availableSlots]);

  const slotsForSelectedDate = React.useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return availableSlotsByDate.get(key) ?? [];
  }, [availableSlotsByDate, selectedDate]);

  const timeOptions = React.useMemo(
    () => slotsForSelectedDate.map(slot => ({ id: slot.id, label: getSlotTimeRange(slot) })),
    [slotsForSelectedDate],
  );

  const timeSlots = React.useMemo(() => timeOptions.map(option => option.label), [timeOptions]);

  const previewSlot = React.useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    const key = format(selectedDate, "yyyy-MM-dd");
    const slots = availableSlotsByDate.get(key) ?? [];
    return slots.find(slot => getSlotTimeRange(slot) === selectedTime) ?? null;
  }, [availableSlotsByDate, selectedDate, selectedTime]);

  const selectedSlot = React.useMemo(
    () => bookings.find(slot => slot.id === selectedSlotId && slot.available) ?? null,
    [bookings, selectedSlotId],
  );

  const selectionSummary = selectedSlot ?? previewSlot;

  const canSubmit = Boolean(selectedSlot && formState.name.trim() && formState.email.trim());

  const resetForm = React.useCallback(() => {
    setFormState({ name: "", email: "", note: "" });
    setSelectedSlotId(null);
    setSelectedTime(undefined);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlot) return;

    const eventTitleBase = buildBookingTitle(formState.name || "Guest");
    const bookingTitle = formState.note.trim() ? formState.note.trim() : `${eventTitleBase} · Session`;

    const updatedBookings = bookings.map(slot =>
      slot.id === selectedSlot.id
        ? {
            ...slot,
            available: false,
            bookedBy: formState.email.trim() || formState.name.trim() || "guest",
            title: bookingTitle,
          }
        : slot,
    );

    const newEvent: CalendarEvent = {
      id: `public-booking-${selectedSlot.id}-${Date.now()}`,
      title: `Meeting with ${eventTitleBase}`,
      description: formState.note.trim() || undefined,
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      category: "meeting",
      color: "#2563eb",
      attendees: formState.email.trim() ? [formState.email.trim()] : undefined,
    };

    const existingEvents = getStoredEvents();

    setStoredBookings(updatedBookings);
    setStoredEvents([...existingEvents, newEvent]);

    setBookings(updatedBookings);
    setConfirmedSlot(selectedSlot);
    setStatus("success");
  };

  const handleBookAnother = () => {
    setStatus("idle");
    setConfirmedSlot(null);
    resetForm();
    setBookings(getStoredBookings());
    setSelectedDate(firstAvailableDate);
  };

  const handleSchedulerDateChange = (value?: Date) => {
    setSelectedDate(value ?? undefined);
    setSelectedTime(undefined);
    setSelectedSlotId(null);
  };

  const handleSchedulerTimeChange = (value?: string) => {
    setSelectedTime(value ?? undefined);
    if (!value) {
      setSelectedSlotId(null);
    }
  };

  const handleSchedulerConfirm = React.useCallback(
    (value: { date?: Date; time?: string }) => {
      if (!value.date || !value.time) {
        setSelectedSlotId(null);
        return;
      }
      const key = format(value.date, "yyyy-MM-dd");
      const slots = availableSlotsByDate.get(key) ?? [];
      const match = slots.find(slot => getSlotTimeRange(slot) === value.time);
      if (match) {
        setSelectedDate(value.date);
        setSelectedTime(value.time);
        setSelectedSlotId(match.id);
      }
    },
    [availableSlotsByDate],
  );

  React.useEffect(() => {
    setBookings(getStoredBookings());
  }, []);

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BOOKING_STORAGE_KEY) {
        setBookings(getStoredBookings());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  React.useEffect(() => {
    if (!availableSlots.length) {
      setSelectedSlotId(null);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      return;
    }

    if (!selectedDate && firstAvailableDate) {
      setSelectedDate(firstAvailableDate);
      return;
    }

    if (selectedDate) {
      const key = format(selectedDate, "yyyy-MM-dd");
      if (!availableSlotsByDate.has(key) && firstAvailableDate) {
        if (selectedDate.getTime() !== firstAvailableDate.getTime()) {
          setSelectedDate(firstAvailableDate);
        }
        setSelectedSlotId(null);
        setSelectedTime(undefined);
      }
    }
  }, [availableSlots.length, availableSlotsByDate, firstAvailableDate, selectedDate]);

  React.useEffect(() => {
    if (selectedSlotId) {
      const slot = bookings.find(item => item.id === selectedSlotId && item.available);
      if (!slot) {
        setSelectedSlotId(null);
      }
    }
  }, [bookings, selectedSlotId]);

  const disabledDays = React.useMemo(() => {
    if (!availableSlotsByDate.size) {
      return undefined;
    }
    return (date: Date) => {
      const key = format(date, "yyyy-MM-dd");
      return !availableSlotsByDate.has(key);
    };
  }, [availableSlotsByDate]);

  if (status === "success" && confirmedSlot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16">
          <header className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Booking confirmed
            </div>
            <h1 className="text-3xl font-semibold text-foreground">You’re on the calendar</h1>
            <p className="text-sm text-muted-foreground">
              We’ve reserved {formatSlotLabel(confirmedSlot)} in {displayName}’s schedule and notified the Arlo workspace.
            </p>
          </header>
          <Card className="border bg-background/60 backdrop-blur">
            <CardContent className="space-y-6 p-6">
              <div className="rounded-xl border bg-muted/10 p-4 text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session details</p>
                <p className="mt-2 text-base font-semibold text-foreground">{formatSlotLabel(confirmedSlot)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{timeZone} timezone</p>
                {formState.note.trim() && (
                  <p className="mt-3 text-sm text-muted-foreground">{formState.note.trim()}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild className="gap-2">
                  <RouterLink to="/calendar">
                    <CalendarIcon className="h-4 w-4" />
                    Open Arlo calendar
                  </RouterLink>
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleBookAnother}>
                  Book another time
                </Button>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">
            Want to share this page? Use <a className="font-medium text-primary" href={bookingLink}>{bookingLink}</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <CalendarIcon className="h-4 w-4" />
            Book time with {displayName}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Choose a moment that works for you
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Availability syncs directly with Arlo’s private calendar. Once you confirm a slot it’s removed from everyone else’s booking view in real time.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden border bg-background/60 backdrop-blur">
              <div className="relative h-36 w-full overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
                  alt="Team workspace"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80"
                      alt={`${displayName} portrait`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hosted by</p>
                    <p className="text-lg font-semibold text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">Founder &amp; AI Strategy at Arlo</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs text-primary">
                    Product leadership
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Virtual or in-person
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {timeZone}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  “I love meeting founders, builders, and operators who are exploring command center workflows. Bring your ideas, prototypes, or just curiosity—we’ll shape something remarkable together.”
                </p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <p>
                    Share this page:{" "}
                    <a className="font-medium text-primary underline" href={bookingLink}>
                      {bookingLink}
                    </a>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Live updates reflect Arlo’s internal calendar.
                  </p>
                </div>
              </CardHeader>
            </Card>

            <Card className="border bg-background/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Share your details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectionSummary ? (
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div
                      className={cn(
                        "rounded-xl border bg-muted/10 p-4",
                        selectedSlot ? "border-primary/30" : "border-dashed border-muted-foreground/30",
                      )}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {selectedSlot ? "Confirmed slot" : "Selected slot"}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">{formatSlotLabel(selectionSummary)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timeZone} timezone · {getDurationMinutes(selectionSummary)} minutes
                      </p>
                      {!selectedSlot && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Press <span className="font-medium text-foreground">Confirm</span> on the scheduler to lock this time before submitting.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="booking-name" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        Your name
                      </Label>
                      <Input
                        id="booking-name"
                        placeholder="Jane Smith"
                        value={formState.name}
                        onChange={event => setFormState(prev => ({ ...prev, name: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="booking-email" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        Email for invites
                      </Label>
                      <Input
                        id="booking-email"
                        type="email"
                        placeholder="jane@example.com"
                        value={formState.email}
                        onChange={event => setFormState(prev => ({ ...prev, email: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="booking-note" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Context (optional)
                      </Label>
                      <Textarea
                        id="booking-note"
                        rows={4}
                        placeholder="Share goals for the meeting or links we should review."
                        value={formState.note}
                        onChange={event => setFormState(prev => ({ ...prev, note: event.target.value }))}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!canSubmit}>
                      Reserve this time
                    </Button>
                  </form>
                ) : (
                  <div className="rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                    Select an available date and time from the scheduler to continue.
                  </div>
                )}
              </CardContent>
              {selectionSummary && (
                <CardFooter className="flex flex-col gap-2 text-xs text-muted-foreground">
                  <p>
                    Need a different time? Reset the scheduler to explore other dates, and once confirmed we’ll automatically update availability for everyone else.
                  </p>
                </CardFooter>
              )}
            </Card>
          </div>

          <div className="flex justify-center">
            <CalendarScheduler
              className="mx-auto"
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              timeSlots={timeSlots}
              disabled={disabledDays}
              onDateChange={handleSchedulerDateChange}
              onTimeChange={handleSchedulerTimeChange}
              onConfirm={handleSchedulerConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicBookingPage;
