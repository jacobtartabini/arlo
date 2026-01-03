-- Add RLS policies for user_key access to calendar_events
CREATE POLICY "Users can view events via user_key"
ON public.calendar_events
FOR SELECT
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);

CREATE POLICY "Users can create events via user_key"
ON public.calendar_events
FOR INSERT
WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);

CREATE POLICY "Users can update events via user_key"
ON public.calendar_events
FOR UPDATE
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);

CREATE POLICY "Users can delete events via user_key"
ON public.calendar_events
FOR DELETE
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);

-- Add RLS policies for user_key access to booking_slots
CREATE POLICY "Users can view bookings via user_key"
ON public.booking_slots
FOR SELECT
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);

CREATE POLICY "Users can create bookings via user_key"
ON public.booking_slots
FOR INSERT
WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);

CREATE POLICY "Users can update bookings via user_key"
ON public.booking_slots
FOR UPDATE
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);

CREATE POLICY "Users can delete bookings via user_key"
ON public.booking_slots
FOR DELETE
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key' OR auth.uid() = user_id);