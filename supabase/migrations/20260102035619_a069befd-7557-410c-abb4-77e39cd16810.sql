-- Add archived_at column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN archived_at timestamp with time zone NULL;

-- Add index for performance on archived_at queries
CREATE INDEX idx_notifications_archived_at ON public.notifications (archived_at);

-- Add read_at column as well (used by the notifications system)
ALTER TABLE public.notifications 
ADD COLUMN read_at timestamp with time zone NULL;