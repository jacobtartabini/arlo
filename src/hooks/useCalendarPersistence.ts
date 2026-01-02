import { useCallback, useEffect, useState } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { isAuthenticated as checkIsAuthenticated } from '@/lib/arloAuth';
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
const eventToDb = (event: Partial<CalendarEvent>) => {
  const startDateTime = event.allDay 
    ? `${event.date}T00:00:00`
    : `${event.date}T${event.startTime || '00:00'}:00`;
  
  const endDateValue = event.endDate || event.date;
  const endDateTime = event.allDay
    ? `${endDateValue}T23:59:59`
    : `${endDateValue}T${event.endTime || '23:59'}:00`;

  return {
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
  date: '',
  available: dbSlot.enabled,
  bookedBy: null,
});

export function useCalendarPersistence() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(checkIsAuthenticated());
    };
    
    checkAuth();
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch events and bookings
  const fetchData = useCallback(async () => {
    if (!checkIsAuthenticated()) {
      setEvents([]);
      setBookingSlots([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [eventsResult, bookingsResult] = await Promise.all([
        dataApiHelpers.select<DbCalendarEvent[]>('calendar_events', {
          order: { column: 'start_time', ascending: true },
        }),
        dataApiHelpers.select<DbBookingSlot[]>('booking_slots', {
          order: { column: 'start_time', ascending: true },
        }),
      ]);

      if (eventsResult.error) {
        console.error('Error fetching events:', eventsResult.error);
      } else if (eventsResult.data) {
        setEvents(eventsResult.data.map(dbToEvent));
      }

      if (bookingsResult.error) {
        console.error('Error fetching bookings:', bookingsResult.error);
      } else if (bookingsResult.data) {
        setBookingSlots(bookingsResult.data.map(dbToBooking));
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create event
  const createEvent = useCallback(async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> => {
    if (!checkIsAuthenticated()) {
      toast.error('Please log in to create events');
      return null;
    }

    try {
      const { data, error } = await dataApiHelpers.insert<DbCalendarEvent>('calendar_events', eventToDb(event));

      if (error || !data) {
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
  }, []);

  // Update event
  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> => {
    if (!checkIsAuthenticated()) return false;

    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent) return false;

    const mergedEvent = { ...currentEvent, ...updates };

    // Optimistic update
    setEvents(prev => prev.map(e => e.id === eventId ? mergedEvent : e));

    try {
      const { error } = await dataApiHelpers.update('calendar_events', eventId, eventToDb(mergedEvent));

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
  }, [events, fetchData]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!checkIsAuthenticated()) return false;

    // Optimistic update
    const previousEvents = events;
    setEvents(prev => prev.filter(e => e.id !== eventId));

    try {
      const { error } = await dataApiHelpers.delete('calendar_events', eventId);

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
  }, [events]);

  // Create booking slot
  const createBookingSlot = useCallback(async (
    title: string,
    startTime: string,
    endTime: string,
    dayOfWeek: number,
    description?: string
  ): Promise<BookingSlot | null> => {
    if (!checkIsAuthenticated()) {
      toast.error('Please log in to create booking slots');
      return null;
    }

    // Calculate duration in minutes
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    try {
      const { data, error } = await dataApiHelpers.insert<DbBookingSlot>('booking_slots', {
        title,
        description: description ?? null,
        start_time: startTime,
        end_time: endTime,
        day_of_week: dayOfWeek,
        duration_minutes: durationMinutes,
        enabled: true,
      });

      if (error || !data) {
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
  }, []);

  // Update booking slot
  const updateBookingSlot = useCallback(async (slotId: string, updates: Partial<BookingSlot>): Promise<boolean> => {
    if (!checkIsAuthenticated()) return false;

    try {
      const { error } = await dataApiHelpers.update('booking_slots', slotId, {
        title: updates.title,
        description: updates.description ?? null,
        start_time: updates.startTime,
        end_time: updates.endTime,
        enabled: updates.available,
      });

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
  }, []);

  // Delete booking slot
  const deleteBookingSlot = useCallback(async (slotId: string): Promise<boolean> => {
    if (!checkIsAuthenticated()) return false;

    const previousSlots = bookingSlots;
    setBookingSlots(prev => prev.filter(s => s.id !== slotId));

    try {
      const { error } = await dataApiHelpers.delete('booking_slots', slotId);

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
  }, [bookingSlots]);

  // Wrapper to provide React setState-like interface for backwards compatibility
  const setEventsWrapper = useCallback((updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
    if (typeof updater === 'function') {
      setEvents(prev => {
        const next = updater(prev);
        // Sync to database
        next.forEach(event => {
          if (!prev.find(e => e.id === event.id)) {
            createEvent(event);
          } else {
            const existing = prev.find(e => e.id === event.id);
            if (existing && JSON.stringify(existing) !== JSON.stringify(event)) {
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
    isAuthenticated,
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
