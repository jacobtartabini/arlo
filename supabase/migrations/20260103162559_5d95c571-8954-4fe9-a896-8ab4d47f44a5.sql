-- Create table for user saved places (home, work, favorites)
CREATE TABLE public.user_saved_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  place_type TEXT NOT NULL CHECK (place_type IN ('home', 'work', 'favorite')),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  place_id TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for recent searches
CREATE TABLE public.map_recent_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  query TEXT NOT NULL,
  place_id TEXT,
  place_name TEXT,
  place_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for destination patterns (for smart suggestions)
CREATE TABLE public.map_destination_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  place_id TEXT,
  place_name TEXT NOT NULL,
  place_address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_bucket TEXT NOT NULL CHECK (time_bucket IN ('morning', 'midday', 'afternoon', 'evening', 'night')),
  visit_count INTEGER NOT NULL DEFAULT 1,
  last_visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for crowd-reported incidents
CREATE TABLE public.map_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('police', 'accident', 'hazard', 'construction', 'closure', 'other')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create table for incident votes (prevent double voting)
CREATE TABLE public.map_incident_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  incident_id UUID NOT NULL REFERENCES public.map_incidents(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_key, incident_id)
);

-- Create table for user map settings
CREATE TABLE public.map_user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL UNIQUE,
  pattern_learning_enabled BOOLEAN NOT NULL DEFAULT true,
  show_incidents BOOLEAN NOT NULL DEFAULT true,
  show_traffic BOOLEAN NOT NULL DEFAULT true,
  default_map_type TEXT NOT NULL DEFAULT 'roadmap' CHECK (default_map_type IN ('roadmap', 'satellite', 'hybrid', 'terrain')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_recent_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_destination_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_incident_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_saved_places
CREATE POLICY "Users can view their own saved places"
  ON public.user_saved_places FOR SELECT
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can create their own saved places"
  ON public.user_saved_places FOR INSERT
  WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can update their own saved places"
  ON public.user_saved_places FOR UPDATE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can delete their own saved places"
  ON public.user_saved_places FOR DELETE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

-- RLS Policies for map_recent_searches
CREATE POLICY "Users can view their own recent searches"
  ON public.map_recent_searches FOR SELECT
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can create their own recent searches"
  ON public.map_recent_searches FOR INSERT
  WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can delete their own recent searches"
  ON public.map_recent_searches FOR DELETE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

-- RLS Policies for map_destination_patterns
CREATE POLICY "Users can view their own destination patterns"
  ON public.map_destination_patterns FOR SELECT
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can create their own destination patterns"
  ON public.map_destination_patterns FOR INSERT
  WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can update their own destination patterns"
  ON public.map_destination_patterns FOR UPDATE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can delete their own destination patterns"
  ON public.map_destination_patterns FOR DELETE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

-- RLS Policies for map_incidents (everyone can view active incidents)
CREATE POLICY "Anyone can view active incidents"
  ON public.map_incidents FOR SELECT
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create incidents"
  ON public.map_incidents FOR INSERT
  WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can update their own incidents"
  ON public.map_incidents FOR UPDATE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

-- RLS Policies for map_incident_votes
CREATE POLICY "Users can view their own votes"
  ON public.map_incident_votes FOR SELECT
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can create their own votes"
  ON public.map_incident_votes FOR INSERT
  WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can update their own votes"
  ON public.map_incident_votes FOR UPDATE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can delete their own votes"
  ON public.map_incident_votes FOR DELETE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

-- RLS Policies for map_user_settings
CREATE POLICY "Users can view their own map settings"
  ON public.map_user_settings FOR SELECT
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can create their own map settings"
  ON public.map_user_settings FOR INSERT
  WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can update their own map settings"
  ON public.map_user_settings FOR UPDATE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

-- Create indexes for performance
CREATE INDEX idx_user_saved_places_user_key ON public.user_saved_places(user_key);
CREATE INDEX idx_map_recent_searches_user_key ON public.map_recent_searches(user_key);
CREATE INDEX idx_map_recent_searches_searched_at ON public.map_recent_searches(searched_at DESC);
CREATE INDEX idx_map_destination_patterns_user_key ON public.map_destination_patterns(user_key);
CREATE INDEX idx_map_destination_patterns_lookup ON public.map_destination_patterns(user_key, day_of_week, time_bucket);
CREATE INDEX idx_map_incidents_location ON public.map_incidents(latitude, longitude) WHERE is_active = true;
CREATE INDEX idx_map_incidents_expires ON public.map_incidents(expires_at) WHERE is_active = true;
CREATE INDEX idx_map_incident_votes_incident ON public.map_incident_votes(incident_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_saved_places_updated_at
  BEFORE UPDATE ON public.user_saved_places
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_map_user_settings_updated_at
  BEFORE UPDATE ON public.map_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();