-- Add user_key (TEXT) column to all user-specific tables that need it
-- This allows storing email/Tailscale JWT sub instead of requiring UUID

-- notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_notes_user_key ON public.notes(user_key);

-- note_folders table
ALTER TABLE public.note_folders ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_note_folders_user_key ON public.note_folders(user_key);

-- tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_user_key ON public.tasks(user_key);

-- habits table
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_habits_user_key ON public.habits(user_key);

-- habit_logs table
ALTER TABLE public.habit_logs ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_key ON public.habit_logs(user_key);

-- booking_slots table
ALTER TABLE public.booking_slots ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_booking_slots_user_key ON public.booking_slots(user_key);

-- notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_notifications_user_key ON public.notifications(user_key);

-- conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_user_key ON public.conversations(user_key);

-- conversation_messages table
ALTER TABLE public.conversation_messages ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_key ON public.conversation_messages(user_key);

-- chat_folders table
ALTER TABLE public.chat_folders ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_chat_folders_user_key ON public.chat_folders(user_key);

-- user_settings table
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON public.user_settings(user_key);

-- routines table
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_routines_user_key ON public.routines(user_key);

-- user_progress table
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_user_progress_user_key ON public.user_progress(user_key);

-- rewards table
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_rewards_user_key ON public.rewards(user_key);

-- reward_redemptions table
ALTER TABLE public.reward_redemptions ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_key ON public.reward_redemptions(user_key);

-- xp_events table
ALTER TABLE public.xp_events ADD COLUMN IF NOT EXISTS user_key TEXT;
CREATE INDEX IF NOT EXISTS idx_xp_events_user_key ON public.xp_events(user_key);

-- Add index to calendar_integrations user_key (already has the column)
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_key ON public.calendar_integrations(user_key);

-- Add index to calendar_events user_key (already has the column)
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_key ON public.calendar_events(user_key);