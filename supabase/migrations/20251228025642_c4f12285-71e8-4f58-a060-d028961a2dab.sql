-- Create table to store which Google calendars the user wants to sync
CREATE TABLE public.google_calendar_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.calendar_integrations(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  calendar_color TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sync_cursor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, calendar_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_selections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Tailscale user
CREATE POLICY "Allow public read for Tailscale user calendar selections" 
ON public.google_calendar_selections 
FOR SELECT 
USING (
  integration_id IN (
    SELECT id FROM public.calendar_integrations 
    WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  )
);

CREATE POLICY "Allow public insert for Tailscale user calendar selections" 
ON public.google_calendar_selections 
FOR INSERT 
WITH CHECK (
  integration_id IN (
    SELECT id FROM public.calendar_integrations 
    WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  )
);

CREATE POLICY "Allow public update for Tailscale user calendar selections" 
ON public.google_calendar_selections 
FOR UPDATE 
USING (
  integration_id IN (
    SELECT id FROM public.calendar_integrations 
    WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  )
);

CREATE POLICY "Allow public delete for Tailscale user calendar selections" 
ON public.google_calendar_selections 
FOR DELETE 
USING (
  integration_id IN (
    SELECT id FROM public.calendar_integrations 
    WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  )
);

-- Create index for faster lookups
CREATE INDEX idx_calendar_selections_integration ON public.google_calendar_selections(integration_id);