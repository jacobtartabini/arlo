-- Add columns to calendar_events for external calendar sync
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'arlo',
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS read_only boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Create unique index to prevent duplicate external events
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_external_unique 
ON public.calendar_events (user_id, source, external_id) 
WHERE external_id IS NOT NULL;

-- Create table for calendar integrations/connections
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL, -- 'google' or 'outlook_ics'
  enabled boolean NOT NULL DEFAULT true,
  -- Google OAuth tokens (encrypted in practice, but stored securely)
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  -- Outlook iCal feed URL
  ical_url text,
  -- Sync metadata
  last_sync_at timestamp with time zone,
  last_sync_status text DEFAULT 'pending', -- 'success', 'error', 'pending'
  last_sync_error text,
  sync_cursor text, -- For incremental sync (Google sync token)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- Enable RLS on calendar_integrations
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_integrations
CREATE POLICY "Users can view their own integrations"
ON public.calendar_integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
ON public.calendar_integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON public.calendar_integrations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
ON public.calendar_integrations FOR DELETE
USING (auth.uid() = user_id);

-- Create table to track US holidays for availability exclusion
CREATE TABLE IF NOT EXISTS public.us_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  name text NOT NULL,
  year integer NOT NULL
);

-- Insert US federal holidays for 2024-2026
INSERT INTO public.us_holidays (date, name, year) VALUES
-- 2024
('2024-01-01', 'New Year''s Day', 2024),
('2024-01-15', 'Martin Luther King Jr. Day', 2024),
('2024-02-19', 'Presidents'' Day', 2024),
('2024-05-27', 'Memorial Day', 2024),
('2024-06-19', 'Juneteenth', 2024),
('2024-07-04', 'Independence Day', 2024),
('2024-09-02', 'Labor Day', 2024),
('2024-10-14', 'Columbus Day', 2024),
('2024-11-11', 'Veterans Day', 2024),
('2024-11-28', 'Thanksgiving Day', 2024),
('2024-12-25', 'Christmas Day', 2024),
-- 2025
('2025-01-01', 'New Year''s Day', 2025),
('2025-01-20', 'Martin Luther King Jr. Day', 2025),
('2025-02-17', 'Presidents'' Day', 2025),
('2025-05-26', 'Memorial Day', 2025),
('2025-06-19', 'Juneteenth', 2025),
('2025-07-04', 'Independence Day', 2025),
('2025-09-01', 'Labor Day', 2025),
('2025-10-13', 'Columbus Day', 2025),
('2025-11-11', 'Veterans Day', 2025),
('2025-11-27', 'Thanksgiving Day', 2025),
('2025-12-25', 'Christmas Day', 2025),
-- 2026
('2026-01-01', 'New Year''s Day', 2026),
('2026-01-19', 'Martin Luther King Jr. Day', 2026),
('2026-02-16', 'Presidents'' Day', 2026),
('2026-05-25', 'Memorial Day', 2026),
('2026-06-19', 'Juneteenth', 2026),
('2026-07-03', 'Independence Day (Observed)', 2026),
('2026-09-07', 'Labor Day', 2026),
('2026-10-12', 'Columbus Day', 2026),
('2026-11-11', 'Veterans Day', 2026),
('2026-11-26', 'Thanksgiving Day', 2026),
('2026-12-25', 'Christmas Day', 2026)
ON CONFLICT (date) DO NOTHING;

-- Public read access to holidays (no auth required)
ALTER TABLE public.us_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Holidays are publicly readable"
ON public.us_holidays FOR SELECT
USING (true);

-- Add trigger for updated_at on calendar_integrations
CREATE TRIGGER update_calendar_integrations_updated_at
BEFORE UPDATE ON public.calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();