import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BookingSlot, CalendarEvent } from "@/lib/calendar-data";

// Fixed UUID for Tailscale-authenticated single-user app
const TAILSCALE_USER_ID = '00000000-0000-0000-0000-000000000001';

// Auto-sync interval in milliseconds (60 seconds)
const AUTO_SYNC_INTERVAL = 60 * 1000;

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
  source?: string;
  external_id?: string;
  read_only?: boolean;
  last_synced_at?: string;
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
    source: (dbEvent.source as CalendarEvent['source']) ?? 'arlo',
    externalId: dbEvent.external_id ?? undefined,
    readOnly: dbEvent.read_only ?? false,
    lastSyncedAt: dbEvent.last_synced_at ?? undefined,
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

// Check if user is authenticated
const isUserAuthenticated = (): boolean => {
  // This hook uses direct Supabase queries, auth is handled by RLS
  return true;
};

export function useCalendarDatabase(): [
  CalendarEvent[],
  React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
  BookingSlot[],
  React.Dispatch<React.SetStateAction<BookingSlot[]>>,
  boolean,
  boolean
] {
  const [events, setEventsState] = React.useState<CalendarEvent[]>([]);
  const [bookings, setBookingsState] = React.useState<BookingSlot[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const pendingUpdatesRef = React.useRef<Set<string>>(new Set());

  // For this Tailscale-authenticated app, we always use the fixed user ID
  const userId = TAILSCALE_USER_ID;

  // Check Tailscale authentication status
  React.useEffect(() => {
    setIsAuthenticated(isTailscaleVerified());
  }, []);

  // Sync external calendars (Google, Outlook)
  const syncExternalCalendars = React.useCallback(async () => {
    try {
      console.log('[calendar-hooks] Triggering calendar sync...');
      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: { action: 'sync', userId: TAILSCALE_USER_ID },
      });
      
      if (error) {
        console.error('[calendar-hooks] Sync error:', error);
        return false;
      }
      
      if (data?.error) {
        console.error('[calendar-hooks] Sync returned error:', data.error);
        return false;
      }
      
      console.log('[calendar-hooks] Sync completed:', data);
      return true;
    } catch (error) {
      console.error('[calendar-hooks] Sync failed:', error);
      return false;
    }
  }, []);

  // Fetch events from database
  const fetchEvents = React.useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }

      // Fetch calendar events
      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        setEventsState([]);
      } else {
        setEventsState((eventsData ?? []).map(dbToEvent));
      }

      // Fetch booking slots and convert to BookingSlot format
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('booking_slots')
        .select('*')
        .eq('user_id', userId);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        setBookingsState([]);
      } else {
        // Convert booking slots to calendar-compatible format
        const today = new Date();
        const convertedBookings: BookingSlot[] = (bookingsData ?? []).flatMap(slot => {
          // Generate booking slots for the next 30 days based on day_of_week
          const slots: BookingSlot[] = [];
          for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            if (date.getDay() === slot.day_of_week && slot.enabled) {
              slots.push({
                id: `${slot.id}-${date.toISOString().split('T')[0]}`,
                title: slot.title,
                description: slot.description ?? undefined,
                startTime: slot.start_time,
                endTime: slot.end_time,
                date: date.toISOString().split('T')[0],
                available: true,
              });
            }
          }
          return slots;
        });
        setBookingsState(convertedBookings);
      }
    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  // Initial fetch
  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-sync external calendars every 60 seconds
  React.useEffect(() => {
    // Initial sync when component mounts
    const initialSync = async () => {
      await syncExternalCalendars();
      // Refetch events after sync
      await fetchEvents(true);
    };
    
    initialSync();

    // Set up interval for periodic sync
    const intervalId = setInterval(async () => {
      const synced = await syncExternalCalendars();
      if (synced) {
        // Silently refetch events after successful sync
        await fetchEvents(true);
      }
    }, AUTO_SYNC_INTERVAL);

    return () => clearInterval(intervalId);
  }, [syncExternalCalendars, fetchEvents]);

  // Create wrapped setEvents that syncs to database
  const setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>> = React.useCallback(
    (updater) => {
      setEventsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;

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

  // Bookings wrapper
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
