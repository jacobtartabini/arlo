-- Add duration field to habits (in minutes)
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT NULL;

-- Add time window fields to routines
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS start_time time DEFAULT NULL;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS end_time time DEFAULT NULL;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS schedule_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6];
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS repeat_interval integer DEFAULT 1;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS repeat_unit text DEFAULT 'day';