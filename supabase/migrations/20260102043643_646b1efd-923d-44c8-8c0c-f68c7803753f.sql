-- Add UPDATE policy for habit_logs with 24-hour time restriction
-- Users can only update their own habit logs within 24 hours of creation
CREATE POLICY "Users can update their own habit logs within 24 hours"
ON public.habit_logs
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND completed_at > (now() - interval '24 hours')
)
WITH CHECK (
  auth.uid() = user_id
);