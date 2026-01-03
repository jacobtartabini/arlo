import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/arloAuth";
import { useAuth } from "@/providers/AuthProvider";
import type { BookingSlot, CalendarEvent } from "@/lib/calendar-data";

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

// Transform app CalendarEvent to DB format (no user_id needed - data-api adds user_key)
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
  const { isAuthenticated, userKey, isLoading: authLoading } = useAuth();
  const pendingUpdatesRef = React.useRef<Set<string>>(new Set());

  // Track if auth has finished loading and we have a userKey
  const authReady = !authLoading && isAuthenticated && !!userKey;

  // TEMP DEBUG (remove after verifying): ensure /calendar receives userKey
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[calendar-hooks] received userKey:', userKey);
    }
  }, [userKey]);

  // Sync external calendars (Google, Outlook)
  const syncExternalCalendars = React.useCallback(async () => {
    try {
      console.log('[calendar-hooks] Triggering calendar sync...');
      
      // Get auth headers for the request
      const headers = await getAuthHeaders();
      if (!headers) {
        console.log('[calendar-hooks] Not authenticated, skipping sync');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: { action: 'sync' },
        headers: headers as Record<string, string>,
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

  // Fetch events from database via data-api (uses user_key)
  const fetchEvents = React.useCallback(async (silent = false) => {
    // Wait for auth to be ready before fetching
    if (!authReady || !userKey) {
      console.log('[calendar-hooks] Auth not ready or no userKey, skipping fetch', { authReady, userKey });
      if (!authLoading) {
        setIsLoading(false);
      }
      return;
    }
    
    try {
      if (!silent) {
        setIsLoading(true);
      }

      console.log('[calendar-hooks] Fetching events for userKey:', userKey);

      // Get auth headers for data-api calls
      const headers = await getAuthHeaders();
      if (!headers) {
        console.log('[calendar-hooks] Not authenticated, skipping fetch');
        setIsLoading(false);
        return;
      }

      // Fetch calendar events via data-api (which handles user_key filtering)
      const { data: eventsResponse, error: eventsError } = await supabase.functions.invoke('data-api', {
        body: { 
          action: 'list', 
          table: 'calendar_events',
          orderBy: 'start_time',
          orderDirection: 'asc'
        },
        headers: headers as Record<string, string>,
      });

      if (eventsError) {
        console.error('[calendar-hooks] Error fetching events:', eventsError);
        setEventsState([]);
      } else if (eventsResponse?.error) {
        console.error('[calendar-hooks] Data API error:', eventsResponse.error);
        setEventsState([]);
      } else {
        const eventsData = eventsResponse?.data ?? [];
        console.log('[calendar-hooks] Fetched events:', eventsData.length);
        setEventsState(eventsData.map(dbToEvent));
      }

      // Fetch booking slots via data-api
      const { data: bookingsResponse, error: bookingsError } = await supabase.functions.invoke('data-api', {
        body: { 
          action: 'list', 
          table: 'booking_slots'
        },
        headers: headers as Record<string, string>,
      });

      if (bookingsError) {
        console.error('[calendar-hooks] Error fetching bookings:', bookingsError);
        setBookingsState([]);
      } else if (bookingsResponse?.error) {
        console.error('[calendar-hooks] Data API error for bookings:', bookingsResponse.error);
        setBookingsState([]);
      } else {
        const bookingsData = bookingsResponse?.data ?? [];
        // Convert booking slots to calendar-compatible format
        const today = new Date();
        const convertedBookings: BookingSlot[] = bookingsData.flatMap((slot: any) => {
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
      console.error('[calendar-hooks] Error in fetchEvents:', error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [authReady, authLoading, userKey]);

  // Initial fetch - only run when auth is ready
  React.useEffect(() => {
    if (authReady) {
      fetchEvents();
    }
  }, [authReady, fetchEvents]);

  // Auto-sync external calendars every 60 seconds - only when auth is ready
  React.useEffect(() => {
    if (!authReady) return;
    
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
  }, [authReady, syncExternalCalendars, fetchEvents]);

  // Create wrapped setEvents that syncs to database via data-api
  const setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>> = React.useCallback(
    (updater) => {
      setEventsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;

        // Find changes and sync to database
        next.forEach(async (event) => {
          const existing = prev.find((e) => e.id === event.id);
          
          if (!existing) {
            // New event - check if it looks like a new event (generated ID)
            if (event.id.startsWith('event-')) {
              try {
                const headers = await getAuthHeaders();
                if (!headers) return;
                
                // Create in database via data-api
                const { data, error } = await supabase.functions.invoke('data-api', {
                  body: { 
                    action: 'create', 
                    table: 'calendar_events',
                    data: eventToDb(event)
                  },
                  headers: headers as Record<string, string>,
                });
                
                if (error) {
                  console.error('[calendar-hooks] Error creating event:', error);
                } else if (data?.data) {
                  // Update local state with DB ID
                  setEventsState((current) =>
                    current.map((e) =>
                      e.id === event.id ? dbToEvent(data.data) : e
                    )
                  );
                }
              } catch (err) {
                console.error('[calendar-hooks] Error creating event:', err);
              }
            }
          } else if (JSON.stringify(existing) !== JSON.stringify(event)) {
            // Updated event - debounce updates
            if (!pendingUpdatesRef.current.has(event.id)) {
              pendingUpdatesRef.current.add(event.id);
              
              setTimeout(async () => {
                try {
                  const headers = await getAuthHeaders();
                  if (!headers) {
                    pendingUpdatesRef.current.delete(event.id);
                    return;
                  }
                  
                  const { error } = await supabase.functions.invoke('data-api', {
                    body: { 
                      action: 'update', 
                      table: 'calendar_events',
                      id: event.id,
                      data: eventToDb(event)
                    },
                    headers: headers as Record<string, string>,
                  });
                  
                  if (error) {
                    console.error('[calendar-hooks] Error updating event:', error);
                  }
                } catch (err) {
                  console.error('[calendar-hooks] Error updating event:', err);
                } finally {
                  pendingUpdatesRef.current.delete(event.id);
                }
              }, 500);
            }
          }
        });

        // Handle deletions
        prev.forEach(async (event) => {
          if (!next.find((e) => e.id === event.id)) {
            try {
              const headers = await getAuthHeaders();
              if (!headers) return;
              
              const { error } = await supabase.functions.invoke('data-api', {
                body: { 
                  action: 'delete', 
                  table: 'calendar_events',
                  id: event.id
                },
                headers: headers as Record<string, string>,
              });
              
              if (error) {
                console.error('[calendar-hooks] Error deleting event:', error);
              }
            } catch (err) {
              console.error('[calendar-hooks] Error deleting event:', err);
            }
          }
        });

        return next;
      });
    },
    []
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
