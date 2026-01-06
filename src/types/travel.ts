// Travel Module Type Definitions

export type TripStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export type ItineraryItemType = 'flight' | 'lodging' | 'activity' | 'restaurant' | 'transit' | 'free_time' | 'other';

export type PlaceCollection = 'saved' | 'must_do' | 'food' | 'rainy_day' | 'night' | 'shopping' | 'nature';

export type ReservationType = 'flight' | 'hotel' | 'car_rental' | 'restaurant' | 'activity' | 'other';

export type ExpenseCategory = 'flights' | 'lodging' | 'food' | 'transport' | 'activities' | 'shopping' | 'miscellaneous';

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  homeAirport?: string;
  homeCurrency: string;
  coverImageUrl?: string;
  status: TripStatus;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Computed/joined
  destinations?: TripDestination[];
  travelers?: TripTraveler[];
}

export interface TripDestination {
  id: string;
  tripId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  timezone?: string;
  currency?: string;
  arrivalDate?: Date;
  departureDate?: Date;
  orderIndex: number;
  createdAt: Date;
}

export interface TripTraveler {
  id: string;
  tripId: string;
  name: string;
  email?: string;
  isOwner: boolean;
  createdAt: Date;
}

export interface TripItineraryItem {
  id: string;
  tripId: string;
  destinationId?: string;
  itemType: ItineraryItemType;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  timezone?: string;
  locationName?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  confirmationCode?: string;
  cost?: number;
  costCurrency: string;
  notes?: string;
  links?: string[];
  calendarEventId?: string;
  reservationId?: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripSavedPlace {
  id: string;
  tripId: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  placeTypes?: string[];
  rating?: number;
  photoUrl?: string;
  collection: PlaceCollection;
  notes?: string;
  distanceFromLodging?: string;
  travelTimeFromLodging?: string;
  createdAt: Date;
}

export interface TripReservation {
  id: string;
  tripId: string;
  reservationType: ReservationType;
  rawText?: string;
  parsedData?: Record<string, unknown>;
  provider?: string;
  confirmationCode?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  cost?: number;
  costCurrency: string;
  isImported: boolean;
  importSource?: string;
  itineraryItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripExpense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  amountHomeCurrency?: number;
  isPlanned: boolean;
  paidBy?: string;
  itineraryItemId?: string;
  expenseDate?: Date;
  createdAt: Date;
}

export interface TripFlightSearch {
  id: string;
  tripId: string;
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  adults: number;
  isNonstop: boolean;
  maxPrice?: number;
  results?: FlightSearchResult[];
  searchedAt: Date;
}

export interface FlightSearchResult {
  id: string;
  price: number;
  currency: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  segments?: FlightSegment[];
}

export interface FlightSegment {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
}

export interface TripSavedFlight {
  id: string;
  tripId: string;
  flightData: FlightSearchResult;
  isSelected: boolean;
  notes?: string;
  createdAt: Date;
}

// Weather API types
export interface WeatherForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  icon: string;
  precipitation: number;
  humidity: number;
  windSpeed: number;
}

// Currency API types
export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: string;
}

// Parsed reservation data
export interface ParsedFlightReservation {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  confirmationCode: string;
  passengerName?: string;
  seatNumber?: string;
}

export interface ParsedHotelReservation {
  hotelName: string;
  address: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  confirmationCode: string;
  roomType?: string;
  guestName?: string;
}

// DB Row types for conversion
export interface DbTrip {
  id: string;
  user_key: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  home_airport: string | null;
  home_currency: string;
  cover_image_url: string | null;
  status: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTripDestination {
  id: string;
  trip_id: string;
  user_key: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  timezone: string | null;
  currency: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  order_index: number;
  created_at: string;
}

export interface DbTripItineraryItem {
  id: string;
  trip_id: string;
  destination_id: string | null;
  user_key: string;
  item_type: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  timezone: string | null;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  confirmation_code: string | null;
  cost: number | null;
  cost_currency: string;
  notes: string | null;
  links: string[] | null;
  calendar_event_id: string | null;
  reservation_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DbTripSavedPlace {
  id: string;
  trip_id: string;
  user_key: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  place_id: string | null;
  place_types: string[] | null;
  rating: number | null;
  photo_url: string | null;
  collection: string;
  notes: string | null;
  distance_from_lodging: string | null;
  travel_time_from_lodging: string | null;
  created_at: string;
}

export interface DbTripExpense {
  id: string;
  trip_id: string;
  user_key: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  amount_home_currency: number | null;
  is_planned: boolean;
  paid_by: string | null;
  itinerary_item_id: string | null;
  expense_date: string | null;
  created_at: string;
}

// Conversion functions
export function dbToTrip(db: DbTrip): Trip {
  return {
    id: db.id,
    name: db.name,
    description: db.description || undefined,
    startDate: new Date(db.start_date),
    endDate: new Date(db.end_date),
    homeAirport: db.home_airport || undefined,
    homeCurrency: db.home_currency,
    coverImageUrl: db.cover_image_url || undefined,
    status: db.status as TripStatus,
    projectId: db.project_id || undefined,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

export function dbToDestination(db: DbTripDestination): TripDestination {
  return {
    id: db.id,
    tripId: db.trip_id,
    name: db.name,
    address: db.address || undefined,
    latitude: db.latitude || undefined,
    longitude: db.longitude || undefined,
    placeId: db.place_id || undefined,
    timezone: db.timezone || undefined,
    currency: db.currency || undefined,
    arrivalDate: db.arrival_date ? new Date(db.arrival_date) : undefined,
    departureDate: db.departure_date ? new Date(db.departure_date) : undefined,
    orderIndex: db.order_index,
    createdAt: new Date(db.created_at),
  };
}

export function dbToItineraryItem(db: DbTripItineraryItem): TripItineraryItem {
  return {
    id: db.id,
    tripId: db.trip_id,
    destinationId: db.destination_id || undefined,
    itemType: db.item_type as ItineraryItemType,
    title: db.title,
    description: db.description || undefined,
    startTime: new Date(db.start_time),
    endTime: db.end_time ? new Date(db.end_time) : undefined,
    timezone: db.timezone || undefined,
    locationName: db.location_name || undefined,
    locationAddress: db.location_address || undefined,
    latitude: db.latitude || undefined,
    longitude: db.longitude || undefined,
    placeId: db.place_id || undefined,
    confirmationCode: db.confirmation_code || undefined,
    cost: db.cost || undefined,
    costCurrency: db.cost_currency,
    notes: db.notes || undefined,
    links: db.links || undefined,
    calendarEventId: db.calendar_event_id || undefined,
    reservationId: db.reservation_id || undefined,
    orderIndex: db.order_index,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

export function dbToSavedPlace(db: DbTripSavedPlace): TripSavedPlace {
  return {
    id: db.id,
    tripId: db.trip_id,
    name: db.name,
    address: db.address || undefined,
    latitude: db.latitude,
    longitude: db.longitude,
    placeId: db.place_id || undefined,
    placeTypes: db.place_types || undefined,
    rating: db.rating || undefined,
    photoUrl: db.photo_url || undefined,
    collection: db.collection as PlaceCollection,
    notes: db.notes || undefined,
    distanceFromLodging: db.distance_from_lodging || undefined,
    travelTimeFromLodging: db.travel_time_from_lodging || undefined,
    createdAt: new Date(db.created_at),
  };
}

export function dbToExpense(db: DbTripExpense): TripExpense {
  return {
    id: db.id,
    tripId: db.trip_id,
    category: db.category as ExpenseCategory,
    description: db.description,
    amount: db.amount,
    currency: db.currency,
    amountHomeCurrency: db.amount_home_currency || undefined,
    isPlanned: db.is_planned,
    paidBy: db.paid_by || undefined,
    itineraryItemId: db.itinerary_item_id || undefined,
    expenseDate: db.expense_date ? new Date(db.expense_date) : undefined,
    createdAt: new Date(db.created_at),
  };
}
