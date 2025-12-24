-- Create routines table FIRST
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'sun',
  routine_type TEXT DEFAULT 'custom' CHECK (routine_type IN ('morning', 'night', 'custom')),
  anchor_cue TEXT,
  reward_description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on routines
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- RLS policies for routines
CREATE POLICY "Users can view their own routines"
ON public.routines FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routines"
ON public.routines FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
ON public.routines FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
ON public.routines FOR DELETE
USING (auth.uid() = user_id);

-- Now extend habits table with new scheduling and XP fields
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'check',
ADD COLUMN IF NOT EXISTS habit_type TEXT DEFAULT 'check',
ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS schedule_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS routine_order INTEGER DEFAULT 0;

-- Add value tracking to habit_logs
ALTER TABLE public.habit_logs
ADD COLUMN IF NOT EXISTS value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT false;

-- Create user_progress table for XP and levels
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  available_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_progress
CREATE POLICY "Users can view their own progress"
ON public.user_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
ON public.user_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Create rewards table
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  xp_cost INTEGER NOT NULL DEFAULT 100,
  icon TEXT DEFAULT 'gift',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rewards
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for rewards
CREATE POLICY "Users can view their own rewards"
ON public.rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rewards"
ON public.rewards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
ON public.rewards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rewards"
ON public.rewards FOR DELETE
USING (auth.uid() = user_id);

-- Create reward_redemptions table
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  xp_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reward_redemptions
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reward_redemptions
CREATE POLICY "Users can view their own redemptions"
ON public.reward_redemptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own redemptions"
ON public.reward_redemptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create xp_events table to track XP gains
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on xp_events
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for xp_events
CREATE POLICY "Users can view their own xp events"
ON public.xp_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own xp events"
ON public.xp_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add update trigger for routines
CREATE TRIGGER update_routines_updated_at
BEFORE UPDATE ON public.routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for user_progress
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();