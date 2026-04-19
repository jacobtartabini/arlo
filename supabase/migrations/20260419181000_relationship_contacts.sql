-- Relationship / contact circles (Circl-inspired)

CREATE TABLE public.relationship_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE public.relationship_contact_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'interaction', 'system')),
  title TEXT,
  body TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.relationship_contact_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_relationship_contacts_user_key ON public.relationship_contacts(user_key);
CREATE INDEX idx_relationship_contacts_circle ON public.relationship_contacts(user_key, circle);
CREATE INDEX idx_relationship_contacts_last_interaction ON public.relationship_contacts(user_key, last_interaction_at DESC NULLS LAST);
CREATE INDEX idx_relationship_contacts_tags ON public.relationship_contacts USING gin(tags);

CREATE UNIQUE INDEX ux_relationship_contacts_user_norm_email
  ON public.relationship_contacts(user_key, normalized_email)
  WHERE normalized_email IS NOT NULL AND normalized_email <> '';

CREATE UNIQUE INDEX ux_relationship_contacts_user_norm_phone
  ON public.relationship_contacts(user_key, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND normalized_phone <> '';

CREATE INDEX idx_relationship_activities_contact ON public.relationship_contact_activities(contact_id, occurred_at DESC);
CREATE INDEX idx_relationship_activities_user ON public.relationship_contact_activities(user_key);

CREATE INDEX idx_relationship_reminders_user_due ON public.relationship_contact_reminders(user_key, due_at)
  WHERE completed_at IS NULL;
CREATE INDEX idx_relationship_reminders_contact ON public.relationship_contact_reminders(contact_id);

ALTER TABLE public.relationship_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_contact_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relationship_contacts_select"
  ON public.relationship_contacts FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_contacts_insert"
  ON public.relationship_contacts FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_contacts_update"
  ON public.relationship_contacts FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_contacts_delete"
  ON public.relationship_contacts FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_activities_select"
  ON public.relationship_contact_activities FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_activities_insert"
  ON public.relationship_contact_activities FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_activities_update"
  ON public.relationship_contact_activities FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_activities_delete"
  ON public.relationship_contact_activities FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_reminders_select"
  ON public.relationship_contact_reminders FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_reminders_insert"
  ON public.relationship_contact_reminders FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_reminders_update"
  ON public.relationship_contact_reminders FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "relationship_reminders_delete"
  ON public.relationship_contact_reminders FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE TRIGGER update_relationship_contacts_updated_at
  BEFORE UPDATE ON public.relationship_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
