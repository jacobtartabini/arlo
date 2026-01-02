-- Remove all public RLS policies for the hardcoded Tailscale user (00000000-0000-0000-0000-000000000001)
-- These policies create a security backdoor that exposes OAuth tokens, email addresses, and calendar data

-- Drop public policies from calendar_events table
DROP POLICY IF EXISTS "Allow public delete for Tailscale user events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow public insert for Tailscale user events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow public read for Tailscale user events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow public update for Tailscale user events" ON public.calendar_events;

-- Drop public policies from calendar_integrations table
DROP POLICY IF EXISTS "Allow public delete for Tailscale user" ON public.calendar_integrations;
DROP POLICY IF EXISTS "Allow public insert for Tailscale user" ON public.calendar_integrations;
DROP POLICY IF EXISTS "Allow public read for Tailscale user" ON public.calendar_integrations;
DROP POLICY IF EXISTS "Allow public update for Tailscale user" ON public.calendar_integrations;

-- Drop public policies from google_calendar_selections table
DROP POLICY IF EXISTS "Allow public delete for Tailscale user calendar selections" ON public.google_calendar_selections;
DROP POLICY IF EXISTS "Allow public insert for Tailscale user calendar selections" ON public.google_calendar_selections;
DROP POLICY IF EXISTS "Allow public read for Tailscale user calendar selections" ON public.google_calendar_selections;
DROP POLICY IF EXISTS "Allow public update for Tailscale user calendar selections" ON public.google_calendar_selections;

-- Add proper authenticated-user-only RLS policies for google_calendar_selections
-- (calendar_events and calendar_integrations already have proper user-based policies)

-- Create authenticated user policies for google_calendar_selections via integration ownership
CREATE POLICY "Users can view their calendar selections" 
ON public.google_calendar_selections 
FOR SELECT 
USING (
  integration_id IN (
    SELECT id FROM public.calendar_integrations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their calendar selections" 
ON public.google_calendar_selections 
FOR INSERT 
WITH CHECK (
  integration_id IN (
    SELECT id FROM public.calendar_integrations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their calendar selections" 
ON public.google_calendar_selections 
FOR UPDATE 
USING (
  integration_id IN (
    SELECT id FROM public.calendar_integrations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their calendar selections" 
ON public.google_calendar_selections 
FOR DELETE 
USING (
  integration_id IN (
    SELECT id FROM public.calendar_integrations WHERE user_id = auth.uid()
  )
);