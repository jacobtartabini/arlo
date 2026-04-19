import type { ContactImportDraft, ImportSourceRow, RelationshipContact } from '@/types/contacts';

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const t = email.trim().toLowerCase();
  return t.length ? t : null;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits;
}

export function normalizeLinkedInPath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const raw = url.trim();
    if (!raw) return null;
    const withProto = raw.startsWith('http') ? raw : `https://${raw}`;
    const parsed = new URL(withProto);
    if (!parsed.hostname.toLowerCase().includes('linkedin.com')) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    return parts.slice(0, 3).join('/').toLowerCase();
  } catch {
    return null;
  }
}

export function uniqStrings(list: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of list) {
    if (!v) continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function buildContactInsertPayload(draft: ContactImportDraft) {
  const emails = uniqStrings(draft.emails);
  const phones = uniqStrings(draft.phones);
  const primary_email = emails[0] ?? null;
  const primary_phone = phones[0] ?? null;
  const normalized_email = normalizeEmail(primary_email);
  const normalized_phone = normalizePhone(primary_phone);

  const importRow: ImportSourceRow = {
    source: draft.source,
    external_id: draft.external_id ?? null,
    imported_at: new Date().toISOString(),
  };

  return {
    display_name: draft.display_name.trim() || 'Unknown',
    given_name: draft.given_name ?? null,
    family_name: draft.family_name ?? null,
    primary_email,
    primary_phone,
    emails,
    phones,
    company: draft.company?.trim() || null,
    job_title: draft.job_title?.trim() || null,
    linkedin_url: draft.linkedin_url?.trim() || null,
    photo_url: draft.photo_url?.trim() || null,
    circle: 'outer' as const,
    tags: [] as string[],
    profile_notes: null as string | null,
    last_interaction_at: null as string | null,
    import_sources: [importRow],
    normalized_email,
    normalized_phone,
  };
}

export function findMatchingContact(
  draft: ContactImportDraft,
  existing: RelationshipContact[],
): RelationshipContact | null {
  const ne = normalizeEmail(draft.emails[0]);
  const np = normalizePhone(draft.phones[0]);
  const nl = normalizeLinkedInPath(draft.linkedin_url || null);

  for (const c of existing) {
    if (ne && c.normalized_email && c.normalized_email === ne) return c;
    if (np && c.normalized_phone && c.normalized_phone === np) return c;
    if (nl) {
      const cur = normalizeLinkedInPath(c.linkedin_url);
      if (cur && cur === nl) return c;
    }
  }
  return null;
}

export function mergeImportIntoExisting(
  contact: RelationshipContact,
  draft: ContactImportDraft,
): Record<string, unknown> {
  const emails = uniqStrings([...contact.emails, ...draft.emails]);
  const phones = uniqStrings([...contact.phones, ...draft.phones]);
  const primary_email = emails[0] ?? contact.primary_email;
  const primary_phone = phones[0] ?? contact.primary_phone;

  const importRow: ImportSourceRow = {
    source: draft.source,
    external_id: draft.external_id ?? null,
    imported_at: new Date().toISOString(),
  };

  const sources = Array.isArray(contact.import_sources) ? [...contact.import_sources] : [];
  sources.push(importRow);

  const display_name =
    draft.display_name.trim().length > contact.display_name.length
      ? draft.display_name.trim()
      : contact.display_name;

  return {
    display_name,
    given_name: contact.given_name ?? draft.given_name ?? null,
    family_name: contact.family_name ?? draft.family_name ?? null,
    primary_email,
    primary_phone,
    emails,
    phones,
    company: draft.company?.trim() || contact.company,
    job_title: draft.job_title?.trim() || contact.job_title,
    linkedin_url: draft.linkedin_url?.trim() || contact.linkedin_url,
    photo_url: draft.photo_url?.trim() || contact.photo_url,
    import_sources: sources,
    normalized_email: normalizeEmail(primary_email),
    normalized_phone: normalizePhone(primary_phone),
  };
}
