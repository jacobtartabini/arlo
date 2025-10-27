import * as React from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { isAfter } from "date-fns";
import { BadgeCheck, Calendar as CalendarIcon, CheckCircle2, Clock, Mail, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  setStoredEvents
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
    [handle]
  );

  const [bookings, setBookings] = React.useState<BookingSlot[]>(() => getStoredBookings());
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({ name: "", email: "", note: "" });
  const [confirmedSlot, setConfirmedSlot] = React.useState<BookingSlot | null>(null);
  const [status, setStatus] = React.useState<"idle" | "success">("idle");

  const bookingLink = React.useMemo(() => getPublicBookingUrl(handle), [handle]);
  const timeZone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const availableSlots = React.useMemo(() => {
    const now = new Date();
    return bookings
      .filter(slot => slot.available && isAfter(getSlotEnd(slot), now))
      .sort((a, b) => getSlotStart(a).getTime() - getSlotStart(b).getTime());
  }, [bookings]);

  const selectedSlot = React.useMemo(
    () => bookings.find(slot => slot.id === selectedSlotId && slot.available) ?? null,
    [bookings, selectedSlotId]
  );

  const canSubmit = Boolean(selectedSlot && formState.name.trim() && formState.email.trim());

  const resetForm = () => {
    setFormState({ name: "", email: "", note: "" });
    setSelectedSlotId(null);
  };

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
            title: bookingTitle
          }
        : slot
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
      attendees: formState.email.trim() ? [formState.email.trim()] : undefined
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
  };

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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16">
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

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Card className="border bg-background/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Available slots</span>
                <Badge variant="outline" className="gap-1 text-xs">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Live sync
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
                All times shown in {timeZone}. Slots refresh automatically when Arlo updates the private calendar.
              </div>
              {availableSlots.length ? (
                <div className="space-y-2">
                  {availableSlots.map(slot => {
                    const isSelected = slot.id === selectedSlotId;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={cn(
                          "w-full rounded-xl border px-4 py-3 text-left transition",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary-foreground"
                            : "border-transparent bg-background hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{formatSlotLabel(slot)}</p>
                            <p className="text-xs text-muted-foreground">{getDurationMinutes(slot)} minute meeting</p>
                          </div>
                          <Badge variant={isSelected ? "default" : "outline"} className="text-xs">
                            Select
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                  All public availability has been claimed. Check back soon or contact {displayName.split(" ")[0]} directly.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border bg-background/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Share your details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSlot ? (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="rounded-lg border bg-muted/10 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected slot</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatSlotLabel(selectedSlot)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{timeZone} timezone · {getDurationMinutes(selectedSlot)} minutes</p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Your name
                    </label>
                    <Input
                      placeholder="Jane Smith"
                      value={formState.name}
                      onChange={event => setFormState(prev => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      Email for invites
                    </label>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      value={formState.email}
                      onChange={event => setFormState(prev => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Context (optional)
                    </label>
                    <Textarea
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
                  Select an available slot to continue. Your booking isn’t confirmed until you finish the form.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicBookingPage;
