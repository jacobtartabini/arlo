import * as React from "react";

import type { BookingSlot, CalendarEvent } from "@/lib/calendar-data";
import {
  BOOKING_STORAGE_KEY,
  EVENT_STORAGE_KEY,
  getStoredBookings,
  getStoredEvents,
  setStoredBookings,
  setStoredEvents
} from "@/lib/calendar-data";

export function useStoredState<T>(
  key: typeof EVENT_STORAGE_KEY | typeof BOOKING_STORAGE_KEY,
  defaults: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(() => {
    if (key === EVENT_STORAGE_KEY) {
      return (getStoredEvents() as T) ?? defaults;
    }
    if (key === BOOKING_STORAGE_KEY) {
      return (getStoredBookings() as T) ?? defaults;
    }
    return defaults;
  });

  React.useEffect(() => {
    if (key === EVENT_STORAGE_KEY) {
      setStoredEvents(state as unknown as CalendarEvent[]);
    }
    if (key === BOOKING_STORAGE_KEY) {
      setStoredBookings(state as unknown as BookingSlot[]);
    }
  }, [key, state]);

  return [state, setState];
}
