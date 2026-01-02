-- Make user_id nullable across all user-facing tables
-- Since we now use user_key (TEXT) as the primary identity column,
-- user_id (UUID) is no longer required for new records

ALTER TABLE public.notes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.note_folders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.habit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.routines ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.calendar_events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.calendar_integrations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.booking_slots ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.conversation_messages ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_folders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_settings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_progress ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.rewards ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reward_redemptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.xp_events ALTER COLUMN user_id DROP NOT NULL;