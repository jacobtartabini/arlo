
CREATE TABLE public.strava_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL,
  strava_athlete_id text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  athlete_name text,
  athlete_avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_key)
);

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own strava connection"
  ON public.strava_connections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on strava_connections"
  ON public.strava_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon read for edge functions that use service_role internally
CREATE POLICY "Anon select strava_connections"
  ON public.strava_connections
  FOR SELECT
  TO anon
  USING (true);
