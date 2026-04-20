-- ============================================================
-- Circles (relationship contacts) tables
-- Identity uses TEXT user_key (Tailscale JWT sub claim).
-- Access is exclusively through the data-api edge function
-- (service role), so RLS denies direct browser access.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.relationship_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  emails TEXT[] NOT NULL DEFAULT '{}',
  phones TEXT[] NOT NULL DEFAULT '{}',
  company TEXT,
  job_title TEXT,
  linkedin_url TEXT,
  photo_url TEXT,
  circle TEXT NOT NULL DEFAULT 'outer' CHECK (circle IN ('inner', 'middle', 'outer')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  profile_notes TEXT,
  last_interaction_at TIMESTAMPTZ,
  import_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_email TEXT,
  normalized_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_contacts_user_key
  ON public.relationship_contacts(user_key);
CREATE INDEX IF NOT EXISTS idx_relationship_contacts_normalized_email
  ON public.relationship_contacts(user_key, normalized_email);
CREATE INDEX IF NOT EXISTS idx_relationship_contacts_normalized_phone
  ON public.relationship_contacts(user_key, normalized_phone);

ALTER TABLE public.relationship_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_direct_select_relationship_contacts"
  ON public.relationship_contacts FOR SELECT USING (false);
CREATE POLICY "deny_direct_insert_relationship_contacts"
  ON public.relationship_contacts FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_direct_update_relationship_contacts"
  ON public.relationship_contacts FOR UPDATE USING (false);
CREATE POLICY "deny_direct_delete_relationship_contacts"
  ON public.relationship_contacts FOR DELETE USING (false);

CREATE TRIGGER trg_relationship_contacts_updated_at
  BEFORE UPDATE ON public.relationship_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activities -------------------------------------------------

CREATE TABLE IF NOT EXISTS public.relationship_contact_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('note', 'interaction', 'system')),
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_contact_activities_user_key
  ON public.relationship_contact_activities(user_key);
CREATE INDEX IF NOT EXISTS idx_relationship_contact_activities_contact_id
  ON public.relationship_contact_activities(contact_id, occurred_at DESC);

ALTER TABLE public.relationship_contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_direct_select_relationship_contact_activities"
  ON public.relationship_contact_activities FOR SELECT USING (false);
CREATE POLICY "deny_direct_insert_relationship_contact_activities"
  ON public.relationship_contact_activities FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_direct_update_relationship_contact_activities"
  ON public.relationship_contact_activities FOR UPDATE USING (false);
CREATE POLICY "deny_direct_delete_relationship_contact_activities"
  ON public.relationship_contact_activities FOR DELETE USING (false);

-- Reminders --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.relationship_contact_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_contact_reminders_user_key
  ON public.relationship_contact_reminders(user_key);
CREATE INDEX IF NOT EXISTS idx_relationship_contact_reminders_contact_id
  ON public.relationship_contact_reminders(contact_id);
CREATE INDEX IF NOT EXISTS idx_relationship_contact_reminders_open
  ON public.relationship_contact_reminders(user_key, due_at)
  WHERE completed_at IS NULL;

ALTER TABLE public.relationship_contact_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_direct_select_relationship_contact_reminders"
  ON public.relationship_contact_reminders FOR SELECT USING (false);
CREATE POLICY "deny_direct_insert_relationship_contact_reminders"
  ON public.relationship_contact_reminders FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_direct_update_relationship_contact_reminders"
  ON public.relationship_contact_reminders FOR UPDATE USING (false);
CREATE POLICY "deny_direct_delete_relationship_contact_reminders"
  ON public.relationship_contact_reminders FOR DELETE USING (false);