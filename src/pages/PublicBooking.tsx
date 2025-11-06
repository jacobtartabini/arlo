import * as React from "react";
import { useParams } from "react-router-dom";
import { format, isAfter } from "date-fns";

import { CalendarScheduler } from "@/components/ui/calendar-scheduler";
import { formatSlotLabel, getStoredBookings, setStoredBookings } from "@/lib/calendar-data";
import type { BookingSlot } from "@/lib/calendar-data";

function getSlotStart(slot: BookingSlot) {
  return new Date(`${slot.date}T${slot.startTime}:00`);
}

function getSlotEnd(slot: BookingSlot) {
  return new Date(`${slot.date}T${slot.endTime}:00`);
}

function getSlotTimeRange(slot: BookingSlot) {
  return `${format(getSlotStart(slot), "h:mm a")} – ${format(getSlotEnd(slot), "h:mm a")}`;
}

function getSlotTimeRange(slot: BookingSlot) {
  return `${format(getSlotStart(slot), "h:mm a")} – ${format(getSlotEnd(slot), "h:mm a")}`;
}

const DEFAULT_HANDLE = "jacob";

const PublicBookingPage = () => {
  const params = useParams();
  const handle = (params.handle ?? DEFAULT_HANDLE).toLowerCase();

  const [bookings, setBookings] = React.useState<BookingSlot[]>(() => getStoredBookings());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>();
  const [lastBookedSlot, setLastBookedSlot] = React.useState<BookingSlot | null>(null);

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

  const timeSlots = React.useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    const slots = availableSlotsByDate.get(key) ?? [];
    return slots.map(getSlotTimeRange);
  }, [availableSlotsByDate, selectedDate]);

  React.useEffect(() => {
    if (!availableSlots.length) {
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
        setSelectedDate(firstAvailableDate);
        setSelectedTime(undefined);
      }
    }
  }, [availableSlots, availableSlotsByDate, firstAvailableDate, selectedDate]);

  const disabledDays = React.useMemo(() => {
    if (!availableSlotsByDate.size) {
      return undefined;
    }
    return (date: Date) => {
      const key = format(date, "yyyy-MM-dd");
      return !availableSlotsByDate.has(key);
    };
  }, [availableSlotsByDate]);

  const handleDateChange = (value?: Date) => {
    setSelectedDate(value ?? undefined);
    setSelectedTime(undefined);
    setLastBookedSlot(null);
  };

  const handleTimeChange = (value?: string) => {
    setSelectedTime(value ?? undefined);
    setLastBookedSlot(null);
  };

  const handleConfirm = (value: { date?: Date; time?: string }) => {
    if (!value.date || !value.time) return;
    const key = format(value.date, "yyyy-MM-dd");
    const slots = availableSlotsByDate.get(key) ?? [];
    const match = slots.find(slot => getSlotTimeRange(slot) === value.time);
    if (!match) return;

    const updatedBookings = bookings.map(slot =>
      slot.id === match.id
        ? {
            ...slot,
            available: false,
            bookedBy: handle,
          }
        : slot,
    );

    setStoredBookings(updatedBookings);
    setBookings(updatedBookings);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setLastBookedSlot(match);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-16">
      <div className="flex w-full max-w-4xl flex-col items-center gap-6">
        <CalendarScheduler
          className="w-full"
          timeSlots={timeSlots}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          disabled={disabledDays}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onConfirm={handleConfirm}
        />
        <div className="text-center text-sm text-muted-foreground">
          {lastBookedSlot ? (
            <span>Meeting confirmed for {formatSlotLabel(lastBookedSlot)}.</span>
          ) : (
            <span>All times are shown in {timeZone}.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicBookingPage;
