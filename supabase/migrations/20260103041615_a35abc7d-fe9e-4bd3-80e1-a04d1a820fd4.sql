-- Add RLS policies for google_calendar_selections that support user_key access
-- The issue is that existing RLS checks calendar_integrations.user_id which is NULL for JWT-auth users

-- Drop existing restrictive policies (they check user_id which is null)
DROP POLICY IF EXISTS "Users can view their calendar selections" ON public.google_calendar_selections;
DROP POLICY IF EXISTS "Users can create their calendar selections" ON public.google_calendar_selections;
DROP POLICY IF EXISTS "Users can update their calendar selections" ON public.google_calendar_selections;
DROP POLICY IF EXISTS "Users can delete their calendar selections" ON public.google_calendar_selections;

-- Create new policies that check user_key on the parent integration
CREATE POLICY "Users can view their calendar selections via user_key"
ON public.google_calendar_selections
FOR SELECT
USING (
  integration_id IN (
    SELECT id FROM calendar_integrations 
    WHERE user_key = (current_setting('request.headers', true)::json->>'x-user-key')
       OR user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their calendar selections via user_key"
ON public.google_calendar_selections
FOR INSERT
WITH CHECK (
  integration_id IN (
    SELECT id FROM calendar_integrations 
    WHERE user_key = (current_setting('request.headers', true)::json->>'x-user-key')
       OR user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their calendar selections via user_key"
ON public.google_calendar_selections
FOR UPDATE
USING (
  integration_id IN (
    SELECT id FROM calendar_integrations 
    WHERE user_key = (current_setting('request.headers', true)::json->>'x-user-key')
       OR user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their calendar selections via user_key"
ON public.google_calendar_selections
FOR DELETE
USING (
  integration_id IN (
    SELECT id FROM calendar_integrations 
    WHERE user_key = (current_setting('request.headers', true)::json->>'x-user-key')
       OR user_id = auth.uid()
  )
);