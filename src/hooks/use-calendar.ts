import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarEvent, BookingSlot, EventRecurrence } from "@/lib/calendar-data";

interface DbCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string | null;
  location: string | null;
  category: string;
  color: string | null;
  is_all_day: boolean;
  recurrence: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface DbBookingSlot {
  id: string;
  user_id: string;
  title: string;
  duration_minutes: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  enabled: boolean;
  description: string | null;
  created_at: string;
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error);
      } else {
        const mappedEvents: CalendarEvent[] = ((data as DbCalendarEvent[]) || []).map((e) => {
          const startDate = new Date(e.start_time);
          const endDate = new Date(e.end_time);
          
          return {
            id: e.id,
            title: e.title,
            description: e.description ?? undefined,
            startTime: startDate.toTimeString().slice(0, 5),
            endTime: endDate.toTimeString().slice(0, 5),
            date: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
            category: e.category as CalendarEvent["category"],
            color: e.color || "#3b82f6",
            location: e.location ?? undefined,
            allDay: e.is_all_day,
            recurrence: e.recurrence as EventRecurrence | undefined,
          };
        });
        setEvents(mappedEvents);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [userId]);

  const createEvent = useCallback(async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent | null> => {
    if (!userId) return null;

    const startTime = new Date(`${event.date}T${event.startTime}:00`);
    const endTime = new Date(`${event.endDate || event.date}T${event.endTime}:00`);

    const newEvent = {
      user_id: userId,
      title: event.title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      description: event.description || null,
      location: event.location || null,
      category: event.category,
      color: event.color,
      is_all_day: event.allDay || false,
      recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
    };

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(newEvent)
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      return null;
    }

    const dbEvent = data as DbCalendarEvent;
    const createdEvent: CalendarEvent = {
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description ?? undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
      endDate: event.endDate,
      category: dbEvent.category as CalendarEvent["category"],
      color: dbEvent.color || "#3b82f6",
      location: dbEvent.location ?? undefined,
      allDay: dbEvent.is_all_day,
      recurrence: dbEvent.recurrence as EventRecurrence | undefined,
    };

    setEvents((prev) => [...prev, createdEvent]);
    return createdEvent;
  }, [userId]);

  const updateEvent = useCallback(async (event: CalendarEvent): Promise<void> => {
    if (!userId) return;

    const startTime = new Date(`${event.date}T${event.startTime}:00`);
    const endTime = new Date(`${event.endDate || event.date}T${event.endTime}:00`);

    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: event.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        description: event.description || null,
        location: event.location || null,
        category: event.category,
        color: event.color,
        is_all_day: event.allDay || false,
        recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
      })
      .eq("id", event.id);

    if (error) {
      console.error("Error updating event:", error);
      return;
    }

    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  }, [userId]);

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);

    if (error) {
      console.error("Error deleting event:", error);
      return;
    }

    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, [userId]);

  return {
    events,
    setEvents,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

export function useBookingSlots() {
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .order("day_of_week", { ascending: true });

      if (error) {
        console.error("Error fetching bookings:", error);
      } else {
        const mappedBookings: BookingSlot[] = ((data as DbBookingSlot[]) || []).map((b) => ({
          id: b.id,
          title: b.title,
          startTime: b.start_time,
          endTime: b.end_time,
          date: "", // Will be set based on day_of_week when needed
          available: b.enabled,
          description: b.description ?? undefined,
        }));
        setBookings(mappedBookings);
      }
      setLoading(false);
    };

    fetchBookings();
  }, [userId]);

  const createBooking = useCallback(async (booking: Omit<BookingSlot, "id">): Promise<BookingSlot | null> => {
    if (!userId) return null;

    const dateStr = typeof booking.date === 'string' ? booking.date : new Date().toISOString().slice(0, 10);
    const bookingDate = new Date(dateStr);

    const newBooking = {
      user_id: userId,
      title: typeof booking.title === 'string' ? booking.title : "Booking",
      duration_minutes: 30,
      day_of_week: bookingDate.getDay(),
      start_time: typeof booking.startTime === 'string' ? booking.startTime : "09:00",
      end_time: typeof booking.endTime === 'string' ? booking.endTime : "09:30",
      enabled: typeof booking.available === 'boolean' ? booking.available : true,
      description: typeof booking.description === 'string' ? booking.description : null,
    };

    const { data, error } = await supabase
      .from("booking_slots")
      .insert(newBooking)
      .select()
      .single();

    if (error) {
      console.error("Error creating booking:", error);
      return null;
    }

    const dbBooking = data as DbBookingSlot;
    const createdBooking: BookingSlot = {
      id: dbBooking.id,
      title: dbBooking.title,
      startTime: dbBooking.start_time,
      endTime: dbBooking.end_time,
      date: String(booking.date),
      available: dbBooking.enabled,
      description: dbBooking.description ?? undefined,
    };

    setBookings((prev) => [...prev, createdBooking]);
    return createdBooking;
  }, [userId]);

  const updateBooking = useCallback(async (booking: BookingSlot): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase
      .from("booking_slots")
      .update({
        title: booking.title || "Booking",
        start_time: booking.startTime,
        end_time: booking.endTime,
        enabled: booking.available,
        description: booking.description || null,
      })
      .eq("id", booking.id);

    if (error) {
      console.error("Error updating booking:", error);
      return;
    }

    setBookings((prev) => prev.map((b) => (b.id === booking.id ? booking : b)));
  }, [userId]);

  const deleteBooking = useCallback(async (bookingId: string): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase.from("booking_slots").delete().eq("id", bookingId);

    if (error) {
      console.error("Error deleting booking:", error);
      return;
    }

    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  }, [userId]);

  return {
    bookings,
    setBookings,
    loading,
    createBooking,
    updateBooking,
    deleteBooking,
  };
}
