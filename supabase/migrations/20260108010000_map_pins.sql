CREATE TABLE public.map_pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.map_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own map pins"
  ON public.map_pins FOR SELECT
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can create their own map pins"
  ON public.map_pins FOR INSERT
  WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can update their own map pins"
  ON public.map_pins FOR UPDATE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can delete their own map pins"
  ON public.map_pins FOR DELETE
  USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE INDEX idx_map_pins_user_key ON public.map_pins(user_key);
CREATE INDEX idx_map_pins_location ON public.map_pins(latitude, longitude);

CREATE TRIGGER update_map_pins_updated_at
  BEFORE UPDATE ON public.map_pins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
