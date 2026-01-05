-- Add morning wake-up notification settings to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS morning_wakeup_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS morning_wakeup_time time DEFAULT '07:00:00';