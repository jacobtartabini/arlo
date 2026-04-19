import { differenceInCalendarDays } from 'date-fns';
import type { RelationshipCircle, RelationshipContact } from '@/types/contacts';

const CADENCE_DAYS: Record<RelationshipCircle, number> = {
  inner: 21,
  middle: 45,
  outer: 90,
};

export interface ContactNudge {
  contactId: string;
  displayName: string;
  circle: RelationshipCircle;
  daysSince: number;
  message: string;
}

export function daysSinceLastInteraction(contact: RelationshipContact): number | null {
  if (!contact.last_interaction_at) return null;
  return differenceInCalendarDays(new Date(), new Date(contact.last_interaction_at));
}

export function buildContactNudges(contacts: RelationshipContact[]): ContactNudge[] {
  const out: ContactNudge[] = [];

  for (const c of contacts) {
    const threshold = CADENCE_DAYS[c.circle];
    const days = daysSinceLastInteraction(c);

    if (days === null) {
      if (c.circle === 'inner' || c.circle === 'middle') {
        out.push({
          contactId: c.id,
          displayName: c.display_name,
          circle: c.circle,
          daysSince: 9999,
          message: `No logged touchpoints yet for ${c.display_name}.`,
        });
      }
      continue;
    }

    if (days >= threshold) {
      out.push({
        contactId: c.id,
        displayName: c.display_name,
        circle: c.circle,
        daysSince: days,
        message: `It's been ${days} days since you last logged contact with ${c.display_name}.`,
      });
    }
  }

  out.sort((a, b) => {
    if (a.circle !== b.circle) {
      const rank: Record<RelationshipCircle, number> = { inner: 0, middle: 1, outer: 2 };
      return rank[a.circle] - rank[b.circle];
    }
    return b.daysSince - a.daysSince;
  });

  return out.slice(0, 8);
}
