-- Add trigger and notification settings to routines table
ALTER TABLE public.routines
ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'time' CHECK (trigger_type IN ('time', 'sunrise', 'sunset', 'location')),
ADD COLUMN IF NOT EXISTS trigger_location_id UUID REFERENCES public.user_saved_places(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sunrise_offset_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'push' CHECK (reminder_type IN ('push', 'alarm')),
ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reminder_sound TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS reminder_vibrate BOOLEAN DEFAULT true;

-- Add index for location-based triggers
CREATE INDEX IF NOT EXISTS idx_routines_trigger_location ON public.routines(trigger_location_id) WHERE trigger_location_id IS NOT NULL;