import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CalendarEvent, BookingSlot } from '@/lib/calendar-data';

interface DbCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  recurrence: unknown;
  category: string;
  color: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

interface DbBookingSlot {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  day_of_week: number;
  duration_minutes: number;
  enabled: boolean;
  created_at: string;
}

// Transform DB event to app CalendarEvent type
const dbToEvent = (dbEvent: DbCalendarEvent): CalendarEvent => {
  const startDate = new Date(dbEvent.start_time);
  const endDate = new Date(dbEvent.end_time);
  
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description ?? undefined,
    startTime: startDate.toTimeString().slice(0, 5),
    endTime: endDate.toTimeString().slice(0, 5),
    date: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    category: dbEvent.category as CalendarEvent['category'],
    color: dbEvent.color ?? '#3b82f6',
    location: dbEvent.location ?? undefined,
    allDay: dbEvent.is_all_day,
    recurrence: dbEvent.recurrence as CalendarEvent['recurrence'] ?? undefined,
  };
};

// Transform app CalendarEvent to DB format
const eventToDb = (event: Partial<CalendarEvent>, userId: string) => {
  const startDateTime = event.allDay 
    ? `${event.date}T00:00:00`
    : `${event.date}T${event.startTime || '00:00'}:00`;
  
  const endDateValue = event.endDate || event.date;
  const endDateTime = event.allDay
    ? `${endDateValue}T23:59:59`
    : `${endDateValue}T${event.endTime || '23:59'}:00`;

  return {
    user_id: userId,
    title: event.title,
    description: event.description ?? null,
    start_time: startDateTime,
    end_time: endDateTime,
    is_all_day: event.allDay ?? false,
    recurrence: event.recurrence ?? null,
    category: event.category ?? 'personal',
    color: event.color ?? null,
    location: event.location ?? null,
  };
};

// Transform DB booking slot to app format
const dbToBooking = (dbSlot: DbBookingSlot): BookingSlot => ({
  id: dbSlot.id,
  title: dbSlot.title,
  description: dbSlot.description ?? undefined,
  startTime: dbSlot.start_time,
  endTime: dbSlot.end_time,
  date: '', // Will be calculated based on day_of_week
  available: dbSlot.enabled,
  bookedBy: null,
});

export function useCalendarPersistence() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch events and bookings
  const fetchData = useCallback(async () => {
    if (!userId) {
      setEvents([]);
      setBookingSlots([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [eventsResult, bookingsResult] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true }),
        supabase
          .from('booking_slots')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true }),
      ]);

      if (eventsResult.error) {
        console.error('Error fetching events:', eventsResult.error);
      } else {
        setEvents((eventsResult.data ?? []).map(dbToEvent));
      }

      if (bookingsResult.error) {
        console.error('Error fetching bookings:', bookingsResult.error);
      } else {
        setBookingSlots((bookingsResult.data ?? []).map(dbToBooking));
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create event
  const createEvent = useCallback(async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> => {
    if (!userId) {
      toast.error('Please log in to create events');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventToDb(event, userId))
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        toast.error('Failed to create event');
        return null;
      }

      const newEvent = dbToEvent(data);
      setEvents(prev => [...prev, newEvent].sort((a, b) => 
        new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
      ));
      return newEvent;
    } catch (error) {
      console.error('Error in createEvent:', error);
      return null;
    }
  }, [userId]);

  // Update event
  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> => {
    if (!userId) return false;

    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent) return false;

    const mergedEvent = { ...currentEvent, ...updates };

    // Optimistic update
    setEvents(prev => prev.map(e => e.id === eventId ? mergedEvent : e));

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(eventToDb(mergedEvent, userId))
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating event:', error);
        await fetchData();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateEvent:', error);
      await fetchData();
      return false;
    }
  }, [userId, events, fetchData]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!userId) return false;

    // Optimistic update
    const previousEvents = events;
    setEvents(prev => prev.filter(e => e.id !== eventId));

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting event:', error);
        setEvents(previousEvents);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      setEvents(previousEvents);
      return false;
    }
  }, [userId, events]);

  // Create booking slot
  const createBookingSlot = useCallback(async (
    title: string,
    startTime: string,
    endTime: string,
    dayOfWeek: number,
    description?: string
  ): Promise<BookingSlot | null> => {
    if (!userId) {
      toast.error('Please log in to create booking slots');
      return null;
    }

    // Calculate duration in minutes
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    try {
      const { data, error } = await supabase
        .from('booking_slots')
        .insert({
          user_id: userId,
          title,
          description: description ?? null,
          start_time: startTime,
          end_time: endTime,
          day_of_week: dayOfWeek,
          duration_minutes: durationMinutes,
          enabled: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating booking slot:', error);
        toast.error('Failed to create booking slot');
        return null;
      }

      const newSlot = dbToBooking(data);
      setBookingSlots(prev => [...prev, newSlot]);
      return newSlot;
    } catch (error) {
      console.error('Error in createBookingSlot:', error);
      return null;
    }
  }, [userId]);

  // Update booking slot
  const updateBookingSlot = useCallback(async (slotId: string, updates: Partial<BookingSlot>): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('booking_slots')
        .update({
          title: updates.title,
          description: updates.description ?? null,
          start_time: updates.startTime,
          end_time: updates.endTime,
          enabled: updates.available,
        })
        .eq('id', slotId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating booking slot:', error);
        return false;
      }

      setBookingSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updates } : s));
      return true;
    } catch (error) {
      console.error('Error in updateBookingSlot:', error);
      return false;
    }
  }, [userId]);

  // Delete booking slot
  const deleteBookingSlot = useCallback(async (slotId: string): Promise<boolean> => {
    if (!userId) return false;

    const previousSlots = bookingSlots;
    setBookingSlots(prev => prev.filter(s => s.id !== slotId));

    try {
      const { error } = await supabase
        .from('booking_slots')
        .delete()
        .eq('id', slotId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting booking slot:', error);
        setBookingSlots(previousSlots);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteBookingSlot:', error);
      setBookingSlots(previousSlots);
      return false;
    }
  }, [userId, bookingSlots]);

  // Wrapper to provide React setState-like interface for backwards compatibility
  const setEventsWrapper = useCallback((updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
    if (typeof updater === 'function') {
      setEvents(prev => {
        const next = updater(prev);
        // Sync to database
        next.forEach(event => {
          if (!prev.find(e => e.id === event.id)) {
            // New event
            createEvent(event);
          } else {
            const existing = prev.find(e => e.id === event.id);
            if (existing && JSON.stringify(existing) !== JSON.stringify(event)) {
              // Updated event
              updateEvent(event.id, event);
            }
          }
        });
        // Handle deletions
        prev.forEach(event => {
          if (!next.find(e => e.id === event.id)) {
            deleteEvent(event.id);
          }
        });
        return next;
      });
    } else {
      setEvents(updater);
    }
  }, [createEvent, updateEvent, deleteEvent]);

  const setBookingsWrapper = useCallback((updater: BookingSlot[] | ((prev: BookingSlot[]) => BookingSlot[])) => {
    if (typeof updater === 'function') {
      setBookingSlots(prev => {
        const next = updater(prev);
        // Handle deletions
        prev.forEach(slot => {
          if (!next.find(s => s.id === slot.id)) {
            deleteBookingSlot(slot.id);
          }
        });
        return next;
      });
    } else {
      setBookingSlots(updater);
    }
  }, [deleteBookingSlot]);

  return {
    events,
    bookingSlots,
    isLoading,
    isAuthenticated: !!userId,
    setEvents: setEventsWrapper,
    setBookings: setBookingsWrapper,
    createEvent,
    updateEvent,
    deleteEvent,
    createBookingSlot,
    updateBookingSlot,
    deleteBookingSlot,
    refreshData: fetchData,
  };
}
