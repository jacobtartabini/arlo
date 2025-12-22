import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BookingSlot, CalendarEvent } from "@/lib/calendar-data";
import { DEFAULT_EVENTS, DEFAULT_BOOKINGS } from "@/lib/calendar-data";

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

export function useCalendarDatabase(): [
  CalendarEvent[],
  React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
  BookingSlot[],
  React.Dispatch<React.SetStateAction<BookingSlot[]>>,
  boolean,
  boolean
] {
  const [events, setEventsState] = React.useState<CalendarEvent[]>(DEFAULT_EVENTS);
  const [bookings, setBookingsState] = React.useState<BookingSlot[]>(DEFAULT_BOOKINGS);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const pendingUpdatesRef = React.useRef<Set<string>>(new Set());

  // Check for authenticated user
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setIsAuthenticated(!!uid);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setIsAuthenticated(!!uid);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch events from database
  const fetchEvents = React.useCallback(async () => {
    if (!userId) {
      // Use defaults for unauthenticated users
      setEventsState(DEFAULT_EVENTS);
      setBookingsState(DEFAULT_BOOKINGS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        setEventsState([]);
      } else {
        setEventsState((data ?? []).map(dbToEvent));
      }

      // Note: booking_slots table has different structure, keeping local for now
      // as it's primarily for public booking which has different requirements
    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Create wrapped setEvents that syncs to database
  const setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>> = React.useCallback(
    (updater) => {
      setEventsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        
        if (!userId) return next;

        // Find changes and sync to database
        next.forEach((event) => {
          const existing = prev.find((e) => e.id === event.id);
          
          if (!existing) {
            // New event - check if it looks like a new event (generated ID)
            if (event.id.startsWith('event-')) {
              // Create in database
              supabase
                .from('calendar_events')
                .insert(eventToDb(event, userId))
                .select()
                .single()
                .then(({ data, error }) => {
                  if (error) {
                    console.error('Error creating event:', error);
                  } else if (data) {
                    // Update local state with DB ID
                    setEventsState((current) =>
                      current.map((e) =>
                        e.id === event.id ? dbToEvent(data) : e
                      )
                    );
                  }
                });
            }
          } else if (JSON.stringify(existing) !== JSON.stringify(event)) {
            // Updated event - debounce updates
            if (!pendingUpdatesRef.current.has(event.id)) {
              pendingUpdatesRef.current.add(event.id);
              
              setTimeout(() => {
                supabase
                  .from('calendar_events')
                  .update(eventToDb(event, userId))
                  .eq('id', event.id)
                  .eq('user_id', userId)
                  .then(({ error }) => {
                    if (error) {
                      console.error('Error updating event:', error);
                    }
                    pendingUpdatesRef.current.delete(event.id);
                  });
              }, 500);
            }
          }
        });

        // Handle deletions
        prev.forEach((event) => {
          if (!next.find((e) => e.id === event.id)) {
            supabase
              .from('calendar_events')
              .delete()
              .eq('id', event.id)
              .eq('user_id', userId)
              .then(({ error }) => {
                if (error) {
                  console.error('Error deleting event:', error);
                }
              });
          }
        });

        return next;
      });
    },
    [userId]
  );

  // Bookings wrapper - keeps existing localStorage behavior for public bookings
  const setBookings: React.Dispatch<React.SetStateAction<BookingSlot[]>> = React.useCallback(
    (updater) => {
      setBookingsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next;
      });
    },
    []
  );

  return [events, setEvents, bookings, setBookings, isLoading, isAuthenticated];
}

// Keep legacy hook for backwards compatibility during transition
export function useStoredState<T>(
  key: string,
  defaults: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(defaults);
  return [state, setState];
}
