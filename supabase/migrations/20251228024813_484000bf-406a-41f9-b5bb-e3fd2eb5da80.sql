-- Add RLS policies for Tailscale user on calendar_events table
-- Since this app uses Tailscale authentication (not Supabase Auth), auth.uid() is null

CREATE POLICY "Allow public read for Tailscale user events" 
ON public.calendar_events 
FOR SELECT 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Allow public insert for Tailscale user events" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Allow public update for Tailscale user events" 
ON public.calendar_events 
FOR UPDATE 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Allow public delete for Tailscale user events" 
ON public.calendar_events 
FOR DELETE 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);