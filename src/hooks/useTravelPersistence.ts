import { dataApiHelpers } from '@/lib/data-api';
import {
  Trip,
  TripDestination,
  TripItineraryItem,
  TripSavedPlace,
  TripExpense,
  TripReservation,
  DbTrip,
  DbTripDestination,
  DbTripItineraryItem,
  DbTripSavedPlace,
  DbTripExpense,
  dbToTrip,
  dbToDestination,
  dbToItineraryItem,
  dbToSavedPlace,
  dbToExpense,
  ItineraryItemType,
  PlaceCollection,
  ExpenseCategory,
  ReservationType,
  TripStatus,
} from '@/types/travel';
import { format } from 'date-fns';

export function useTravelPersistence() {
  // ============ TRIPS ============
  const fetchTrips = async (status?: TripStatus): Promise<Trip[]> => {
    try {
      const filters = status ? { status } : undefined;
      const { data, error } = await dataApiHelpers.select<DbTrip[]>('trips', {
        filters,
        order: { column: 'start_date', ascending: false },
      });
      if (error || !data) return [];
      return data.map(dbToTrip);
    } catch (e) {
      console.error('[useTravelPersistence] fetchTrips error:', e);
      return [];
    }
  };

  const fetchTrip = async (id: string): Promise<Trip | null> => {
    try {
      const { data, error } = await dataApiHelpers.select<DbTrip[]>('trips', {
        filters: { id },
      });
      if (error || !data || data.length === 0) return null;
      return dbToTrip(data[0]);
    } catch (e) {
      console.error('[useTravelPersistence] fetchTrip error:', e);
      return null;
    }
  };

  const createTrip = async (
    name: string,
    startDate: Date,
    endDate: Date,
    options?: {
      description?: string;
      homeAirport?: string;
      homeCurrency?: string;
    }
  ): Promise<Trip | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbTrip>('trips', {
        name,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        description: options?.description || null,
        home_airport: options?.homeAirport || null,
        home_currency: options?.homeCurrency || 'USD',
        status: 'planning',
      });
      if (error || !data) return null;
      return dbToTrip(data);
    } catch (e) {
      console.error('[useTravelPersistence] createTrip error:', e);
      return null;
    }
  };

  const updateTrip = async (
    id: string,
    updates: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.startDate !== undefined) dbUpdates.start_date = format(updates.startDate, 'yyyy-MM-dd');
      if (updates.endDate !== undefined) dbUpdates.end_date = format(updates.endDate, 'yyyy-MM-dd');
      if (updates.homeAirport !== undefined) dbUpdates.home_airport = updates.homeAirport;
      if (updates.homeCurrency !== undefined) dbUpdates.home_currency = updates.homeCurrency;
      if (updates.coverImageUrl !== undefined) dbUpdates.cover_image_url = updates.coverImageUrl;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;

      const { error } = await dataApiHelpers.update('trips', id, dbUpdates);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] updateTrip error:', e);
      return false;
    }
  };

  const deleteTrip = async (id: string): Promise<boolean> => {
    try {
      const { error } = await dataApiHelpers.delete('trips', id);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] deleteTrip error:', e);
      return false;
    }
  };

  // ============ DESTINATIONS ============
  const fetchDestinations = async (tripId: string): Promise<TripDestination[]> => {
    try {
      const { data, error } = await dataApiHelpers.select<DbTripDestination[]>('trip_destinations', {
        filters: { trip_id: tripId },
        order: { column: 'order_index', ascending: true },
      });
      if (error || !data) return [];
      return data.map(dbToDestination);
    } catch (e) {
      console.error('[useTravelPersistence] fetchDestinations error:', e);
      return [];
    }
  };

  const createDestination = async (
    tripId: string,
    name: string,
    options?: {
      address?: string;
      latitude?: number;
      longitude?: number;
      placeId?: string;
      timezone?: string;
      currency?: string;
      arrivalDate?: Date;
      departureDate?: Date;
      orderIndex?: number;
    }
  ): Promise<TripDestination | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbTripDestination>('trip_destinations', {
        trip_id: tripId,
        name,
        address: options?.address || null,
        latitude: options?.latitude || null,
        longitude: options?.longitude || null,
        place_id: options?.placeId || null,
        timezone: options?.timezone || null,
        currency: options?.currency || null,
        arrival_date: options?.arrivalDate ? format(options.arrivalDate, 'yyyy-MM-dd') : null,
        departure_date: options?.departureDate ? format(options.departureDate, 'yyyy-MM-dd') : null,
        order_index: options?.orderIndex ?? 0,
      });
      if (error || !data) return null;
      return dbToDestination(data);
    } catch (e) {
      console.error('[useTravelPersistence] createDestination error:', e);
      return null;
    }
  };

  const deleteDestination = async (id: string): Promise<boolean> => {
    try {
      const { error } = await dataApiHelpers.delete('trip_destinations', id);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] deleteDestination error:', e);
      return false;
    }
  };

  // ============ ITINERARY ITEMS ============
  const fetchItineraryItems = async (tripId: string): Promise<TripItineraryItem[]> => {
    try {
      const { data, error } = await dataApiHelpers.select<DbTripItineraryItem[]>('trip_itinerary_items', {
        filters: { trip_id: tripId },
        order: { column: 'start_time', ascending: true },
      });
      if (error || !data) return [];
      return data.map(dbToItineraryItem);
    } catch (e) {
      console.error('[useTravelPersistence] fetchItineraryItems error:', e);
      return [];
    }
  };

  const createItineraryItem = async (
    tripId: string,
    itemType: ItineraryItemType,
    title: string,
    startTime: Date,
    options?: {
      destinationId?: string;
      description?: string;
      endTime?: Date;
      timezone?: string;
      locationName?: string;
      locationAddress?: string;
      latitude?: number;
      longitude?: number;
      placeId?: string;
      confirmationCode?: string;
      cost?: number;
      costCurrency?: string;
      notes?: string;
      links?: string[];
      orderIndex?: number;
    }
  ): Promise<TripItineraryItem | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbTripItineraryItem>('trip_itinerary_items', {
        trip_id: tripId,
        item_type: itemType,
        title,
        start_time: startTime.toISOString(),
        destination_id: options?.destinationId || null,
        description: options?.description || null,
        end_time: options?.endTime?.toISOString() || null,
        timezone: options?.timezone || null,
        location_name: options?.locationName || null,
        location_address: options?.locationAddress || null,
        latitude: options?.latitude || null,
        longitude: options?.longitude || null,
        place_id: options?.placeId || null,
        confirmation_code: options?.confirmationCode || null,
        cost: options?.cost || null,
        cost_currency: options?.costCurrency || 'USD',
        notes: options?.notes || null,
        links: options?.links || null,
        order_index: options?.orderIndex ?? 0,
      });
      if (error || !data) return null;
      return dbToItineraryItem(data);
    } catch (e) {
      console.error('[useTravelPersistence] createItineraryItem error:', e);
      return null;
    }
  };

  const updateItineraryItem = async (
    id: string,
    updates: Partial<Omit<TripItineraryItem, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.itemType !== undefined) dbUpdates.item_type = updates.itemType;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime.toISOString();
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime?.toISOString() || null;
      if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
      if (updates.locationName !== undefined) dbUpdates.location_name = updates.locationName;
      if (updates.locationAddress !== undefined) dbUpdates.location_address = updates.locationAddress;
      if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
      if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
      if (updates.placeId !== undefined) dbUpdates.place_id = updates.placeId;
      if (updates.confirmationCode !== undefined) dbUpdates.confirmation_code = updates.confirmationCode;
      if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
      if (updates.costCurrency !== undefined) dbUpdates.cost_currency = updates.costCurrency;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.links !== undefined) dbUpdates.links = updates.links;
      if (updates.calendarEventId !== undefined) dbUpdates.calendar_event_id = updates.calendarEventId;
      if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;

      const { error } = await dataApiHelpers.update('trip_itinerary_items', id, dbUpdates);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] updateItineraryItem error:', e);
      return false;
    }
  };

  const deleteItineraryItem = async (id: string): Promise<boolean> => {
    try {
      const { error } = await dataApiHelpers.delete('trip_itinerary_items', id);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] deleteItineraryItem error:', e);
      return false;
    }
  };

  // ============ SAVED PLACES ============
  const fetchSavedPlaces = async (tripId: string): Promise<TripSavedPlace[]> => {
    try {
      const { data, error } = await dataApiHelpers.select<DbTripSavedPlace[]>('trip_saved_places', {
        filters: { trip_id: tripId },
        order: { column: 'created_at', ascending: false },
      });
      if (error || !data) return [];
      return data.map(dbToSavedPlace);
    } catch (e) {
      console.error('[useTravelPersistence] fetchSavedPlaces error:', e);
      return [];
    }
  };

  const createSavedPlace = async (
    tripId: string,
    name: string,
    latitude: number,
    longitude: number,
    options?: {
      address?: string;
      placeId?: string;
      placeTypes?: string[];
      rating?: number;
      photoUrl?: string;
      collection?: PlaceCollection;
      notes?: string;
    }
  ): Promise<TripSavedPlace | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbTripSavedPlace>('trip_saved_places', {
        trip_id: tripId,
        name,
        latitude,
        longitude,
        address: options?.address || null,
        place_id: options?.placeId || null,
        place_types: options?.placeTypes || null,
        rating: options?.rating || null,
        photo_url: options?.photoUrl || null,
        collection: options?.collection || 'saved',
        notes: options?.notes || null,
      });
      if (error || !data) return null;
      return dbToSavedPlace(data);
    } catch (e) {
      console.error('[useTravelPersistence] createSavedPlace error:', e);
      return null;
    }
  };

  const updateSavedPlace = async (
    id: string,
    updates: Partial<Omit<TripSavedPlace, 'id' | 'tripId' | 'createdAt'>>
  ): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.collection !== undefined) dbUpdates.collection = updates.collection;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await dataApiHelpers.update('trip_saved_places', id, dbUpdates);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] updateSavedPlace error:', e);
      return false;
    }
  };

  const deleteSavedPlace = async (id: string): Promise<boolean> => {
    try {
      const { error } = await dataApiHelpers.delete('trip_saved_places', id);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] deleteSavedPlace error:', e);
      return false;
    }
  };

  // ============ EXPENSES ============
  const fetchExpenses = async (tripId: string): Promise<TripExpense[]> => {
    try {
      const { data, error } = await dataApiHelpers.select<DbTripExpense[]>('trip_expenses', {
        filters: { trip_id: tripId },
        order: { column: 'created_at', ascending: false },
      });
      if (error || !data) return [];
      return data.map(dbToExpense);
    } catch (e) {
      console.error('[useTravelPersistence] fetchExpenses error:', e);
      return [];
    }
  };

  const createExpense = async (
    tripId: string,
    category: ExpenseCategory,
    description: string,
    amount: number,
    options?: {
      currency?: string;
      amountHomeCurrency?: number;
      isPlanned?: boolean;
      paidBy?: string;
      itineraryItemId?: string;
      expenseDate?: Date;
    }
  ): Promise<TripExpense | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbTripExpense>('trip_expenses', {
        trip_id: tripId,
        category,
        description,
        amount,
        currency: options?.currency || 'USD',
        amount_home_currency: options?.amountHomeCurrency || null,
        is_planned: options?.isPlanned ?? true,
        paid_by: options?.paidBy || null,
        itinerary_item_id: options?.itineraryItemId || null,
        expense_date: options?.expenseDate ? format(options.expenseDate, 'yyyy-MM-dd') : null,
      });
      if (error || !data) return null;
      return dbToExpense(data);
    } catch (e) {
      console.error('[useTravelPersistence] createExpense error:', e);
      return null;
    }
  };

  const updateExpense = async (
    id: string,
    updates: Partial<Omit<TripExpense, 'id' | 'tripId' | 'createdAt'>>
  ): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
      if (updates.amountHomeCurrency !== undefined) dbUpdates.amount_home_currency = updates.amountHomeCurrency;
      if (updates.isPlanned !== undefined) dbUpdates.is_planned = updates.isPlanned;
      if (updates.paidBy !== undefined) dbUpdates.paid_by = updates.paidBy;
      if (updates.expenseDate !== undefined) dbUpdates.expense_date = updates.expenseDate ? format(updates.expenseDate, 'yyyy-MM-dd') : null;

      const { error } = await dataApiHelpers.update('trip_expenses', id, dbUpdates);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] updateExpense error:', e);
      return false;
    }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      const { error } = await dataApiHelpers.delete('trip_expenses', id);
      return !error;
    } catch (e) {
      console.error('[useTravelPersistence] deleteExpense error:', e);
      return false;
    }
  };

  return {
    // Trips
    fetchTrips,
    fetchTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    // Destinations
    fetchDestinations,
    createDestination,
    deleteDestination,
    // Itinerary
    fetchItineraryItems,
    createItineraryItem,
    updateItineraryItem,
    deleteItineraryItem,
    // Saved Places
    fetchSavedPlaces,
    createSavedPlace,
    updateSavedPlace,
    deleteSavedPlace,
    // Expenses
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
