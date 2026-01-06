-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  home_airport TEXT,
  home_currency TEXT DEFAULT 'USD',
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip destinations table
CREATE TABLE public.trip_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,
  timezone TEXT,
  currency TEXT,
  arrival_date DATE,
  departure_date DATE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip travelers table
CREATE TABLE public.trip_travelers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip itinerary items table
CREATE TABLE public.trip_itinerary_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES public.trip_destinations(id) ON DELETE SET NULL,
  user_key TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('flight', 'lodging', 'activity', 'restaurant', 'transit', 'free_time', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  timezone TEXT,
  location_name TEXT,
  location_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,
  confirmation_code TEXT,
  cost DECIMAL(10, 2),
  cost_currency TEXT DEFAULT 'USD',
  notes TEXT,
  links TEXT[],
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  reservation_id UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip saved places table
CREATE TABLE public.trip_saved_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  place_id TEXT,
  place_types TEXT[],
  rating DECIMAL(2, 1),
  photo_url TEXT,
  collection TEXT DEFAULT 'saved' CHECK (collection IN ('saved', 'must_do', 'food', 'rainy_day', 'night', 'shopping', 'nature')),
  notes TEXT,
  distance_from_lodging TEXT,
  travel_time_from_lodging TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip reservations table
CREATE TABLE public.trip_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  reservation_type TEXT NOT NULL CHECK (reservation_type IN ('flight', 'hotel', 'car_rental', 'restaurant', 'activity', 'other')),
  raw_text TEXT,
  parsed_data JSONB,
  provider TEXT,
  confirmation_code TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  cost DECIMAL(10, 2),
  cost_currency TEXT DEFAULT 'USD',
  is_imported BOOLEAN DEFAULT false,
  import_source TEXT,
  itinerary_item_id UUID REFERENCES public.trip_itinerary_items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip expenses table
CREATE TABLE public.trip_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('flights', 'lodging', 'food', 'transport', 'activities', 'shopping', 'miscellaneous')),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount_home_currency DECIMAL(10, 2),
  is_planned BOOLEAN NOT NULL DEFAULT true,
  paid_by TEXT,
  itinerary_item_id UUID REFERENCES public.trip_itinerary_items(id) ON DELETE SET NULL,
  expense_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip flight searches table (for Amadeus integration)
CREATE TABLE public.trip_flight_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  adults INTEGER DEFAULT 1,
  is_nonstop BOOLEAN DEFAULT false,
  max_price DECIMAL(10, 2),
  results JSONB,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip saved flights table
CREATE TABLE public.trip_saved_flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  flight_data JSONB NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_flight_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_saved_flights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Users can create trips" ON public.trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING (true);

-- RLS Policies for trip_destinations
CREATE POLICY "Users can view trip destinations" ON public.trip_destinations FOR SELECT USING (true);
CREATE POLICY "Users can create trip destinations" ON public.trip_destinations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update trip destinations" ON public.trip_destinations FOR UPDATE USING (true);
CREATE POLICY "Users can delete trip destinations" ON public.trip_destinations FOR DELETE USING (true);

-- RLS Policies for trip_travelers
CREATE POLICY "Users can view trip travelers" ON public.trip_travelers FOR SELECT USING (true);
CREATE POLICY "Users can create trip travelers" ON public.trip_travelers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update trip travelers" ON public.trip_travelers FOR UPDATE USING (true);
CREATE POLICY "Users can delete trip travelers" ON public.trip_travelers FOR DELETE USING (true);

-- RLS Policies for trip_itinerary_items
CREATE POLICY "Users can view itinerary items" ON public.trip_itinerary_items FOR SELECT USING (true);
CREATE POLICY "Users can create itinerary items" ON public.trip_itinerary_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update itinerary items" ON public.trip_itinerary_items FOR UPDATE USING (true);
CREATE POLICY "Users can delete itinerary items" ON public.trip_itinerary_items FOR DELETE USING (true);

-- RLS Policies for trip_saved_places
CREATE POLICY "Users can view saved places" ON public.trip_saved_places FOR SELECT USING (true);
CREATE POLICY "Users can create saved places" ON public.trip_saved_places FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update saved places" ON public.trip_saved_places FOR UPDATE USING (true);
CREATE POLICY "Users can delete saved places" ON public.trip_saved_places FOR DELETE USING (true);

-- RLS Policies for trip_reservations
CREATE POLICY "Users can view reservations" ON public.trip_reservations FOR SELECT USING (true);
CREATE POLICY "Users can create reservations" ON public.trip_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update reservations" ON public.trip_reservations FOR UPDATE USING (true);
CREATE POLICY "Users can delete reservations" ON public.trip_reservations FOR DELETE USING (true);

-- RLS Policies for trip_expenses
CREATE POLICY "Users can view expenses" ON public.trip_expenses FOR SELECT USING (true);
CREATE POLICY "Users can create expenses" ON public.trip_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update expenses" ON public.trip_expenses FOR UPDATE USING (true);
CREATE POLICY "Users can delete expenses" ON public.trip_expenses FOR DELETE USING (true);

-- RLS Policies for trip_flight_searches
CREATE POLICY "Users can view flight searches" ON public.trip_flight_searches FOR SELECT USING (true);
CREATE POLICY "Users can create flight searches" ON public.trip_flight_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete flight searches" ON public.trip_flight_searches FOR DELETE USING (true);

-- RLS Policies for trip_saved_flights
CREATE POLICY "Users can view saved flights" ON public.trip_saved_flights FOR SELECT USING (true);
CREATE POLICY "Users can create saved flights" ON public.trip_saved_flights FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update saved flights" ON public.trip_saved_flights FOR UPDATE USING (true);
CREATE POLICY "Users can delete saved flights" ON public.trip_saved_flights FOR DELETE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trip_itinerary_items_updated_at BEFORE UPDATE ON public.trip_itinerary_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trip_reservations_updated_at BEFORE UPDATE ON public.trip_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add trips tables to data-api allowed list (done via edge function update)