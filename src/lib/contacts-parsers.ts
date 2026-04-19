import type { ContactImportDraft } from '@/types/contacts';

/** Minimal RFC4180-style row parser (handles quoted fields). */
export function parseCSVRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseLinkedInConnectionsCsv(text: string): ContactImportDraft[] {
  const normalized = text.replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCSVRow(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.findIndex((h) => h === name || h.includes(name));

  const iFirst = idx('first name');
  const iLast = idx('last name');
  const iUrl = idx('url');
  const iEmail = idx('email');
  const iCompany = idx('company');
  const iPosition = idx('position');

  if (iFirst < 0 && iLast < 0 && iUrl < 0) {
    return [];
  }

  const drafts: ContactImportDraft[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = parseCSVRow(lines[r]);
    const first = iFirst >= 0 ? cols[iFirst] : '';
    const last = iLast >= 0 ? cols[iLast] : '';
    const display = [first, last].filter(Boolean).join(' ').trim() || cols[iUrl] || 'Unknown';
    const emails: string[] = [];
    if (iEmail >= 0 && cols[iEmail]) emails.push(cols[iEmail]);
    const linkedin = iUrl >= 0 ? cols[iUrl] : null;
    drafts.push({
      display_name: display,
      given_name: first || null,
      family_name: last || null,
      emails,
      phones: [],
      company: iCompany >= 0 ? cols[iCompany] || null : null,
      job_title: iPosition >= 0 ? cols[iPosition] || null : null,
      linkedin_url: linkedin,
      source: 'linkedin_csv',
      external_id: linkedin || null,
    });
  }

  return drafts;
}

export function parseVCardFile(text: string): ContactImportDraft[] {
  const blocks = text.split(/BEGIN:VCARD/gi).slice(1);
  const out: ContactImportDraft[] = [];

  for (const raw of blocks) {
    const block = raw.split(/END:VCARD/gi)[0];
    const lines = block.split(/\r?\n/);
    let fn = '';
    let nGiven = '';
    let nFamily = '';
    const emails: string[] = [];
    const phones: string[] = [];
    let org = '';

    const unfold = (lns: string[]) => {
      const merged: string[] = [];
      for (const line of lns) {
        if (!line.trim()) continue;
        if (line.startsWith(' ') || line.startsWith('\t')) {
          if (merged.length) merged[merged.length - 1] += line.slice(1);
        } else merged.push(line);
      }
      return merged;
    };

    for (const line of unfold(lines)) {
      const upper = line.toUpperCase();
      if (upper.startsWith('FN:')) fn = line.slice(3).trim();
      else if (upper.startsWith('N:')) {
        const parts = line.slice(2).split(';');
        nFamily = (parts[0] || '').trim();
        nGiven = (parts[1] || '').trim();
      } else if (upper.startsWith('EMAIL')) {
        const idx = line.indexOf(':');
        if (idx >= 0) emails.push(line.slice(idx + 1).trim());
      } else if (upper.startsWith('TEL')) {
        const idx = line.indexOf(':');
        if (idx >= 0) phones.push(line.slice(idx + 1).trim());
      } else if (upper.startsWith('ORG:')) org = line.slice(4).trim();
    }

    const display = fn || [nGiven, nFamily].filter(Boolean).join(' ').trim();
    if (!display && emails.length === 0 && phones.length === 0) continue;

    out.push({
      display_name: display || emails[0] || phones[0] || 'Unknown',
      given_name: nGiven || null,
      family_name: nFamily || null,
      emails,
      phones,
      company: org || null,
      job_title: null,
      source: 'vcard',
    });
  }

  return out;
}

export function devicePickedToDrafts(
  picked: Array<{ name?: string[]; email?: string[]; tel?: string[] }>,
): ContactImportDraft[] {
  return picked.map((p) => {
    const name = p.name?.[0]?.trim() || '';
    const emails = (p.email || []).map((e) => e.trim()).filter(Boolean);
    const phones = (p.tel || []).map((t) => t.trim()).filter(Boolean);
    return {
      display_name: name || emails[0] || phones[0] || 'Unknown',
      emails,
      phones,
      source: 'device' as const,
    };
  });
}
