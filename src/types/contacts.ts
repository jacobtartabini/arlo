export type RelationshipCircle = 'inner' | 'middle' | 'outer';

export type ContactActivityKind = 'note' | 'interaction' | 'system';

export interface RelationshipContact {
  id: string;
  user_key: string;
  display_name: string;
  given_name: string | null;
  family_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  emails: string[];
  phones: string[];
  company: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  circle: RelationshipCircle;
  tags: string[];
  profile_notes: string | null;
  last_interaction_at: string | null;
  import_sources: ImportSourceRow[];
  normalized_email: string | null;
  normalized_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportSourceRow {
  source: 'google' | 'device' | 'vcard' | 'linkedin_csv';
  external_id?: string | null;
  imported_at: string;
}

export interface RelationshipContactActivity {
  id: string;
  user_key: string;
  contact_id: string;
  kind: ContactActivityKind;
  title: string | null;
  body: string;
  occurred_at: string;
  created_at: string;
}

export interface RelationshipContactReminder {
  id: string;
  user_key: string;
  contact_id: string;
  title: string;
  due_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ContactImportDraft {
  display_name: string;
  given_name?: string | null;
  family_name?: string | null;
  emails: string[];
  phones: string[];
  company?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  photo_url?: string | null;
  source: ImportSourceRow['source'];
  external_id?: string | null;
}
