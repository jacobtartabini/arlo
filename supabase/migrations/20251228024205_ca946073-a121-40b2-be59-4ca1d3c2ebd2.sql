-- Add policy to allow reading calendar_integrations for the fixed Tailscale user
-- Since this app uses Tailscale authentication (not Supabase Auth), auth.uid() is null
-- We need to allow public read access for the fixed user ID used in Tailscale auth

CREATE POLICY "Allow public read for Tailscale user" 
ON public.calendar_integrations 
FOR SELECT 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Also add insert policy for Tailscale user
CREATE POLICY "Allow public insert for Tailscale user" 
ON public.calendar_integrations 
FOR INSERT 
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- And update policy
CREATE POLICY "Allow public update for Tailscale user" 
ON public.calendar_integrations 
FOR UPDATE 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- And delete policy  
CREATE POLICY "Allow public delete for Tailscale user" 
ON public.calendar_integrations 
FOR DELETE 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);