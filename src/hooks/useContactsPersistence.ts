import { useCallback, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { dataApiHelpers } from '@/lib/data-api';
import {
  buildContactInsertPayload,
  findMatchingContact,
  mergeImportIntoExisting,
} from '@/lib/contacts-normalize';
import type {
  ContactImportDraft,
  RelationshipContact,
  RelationshipContactActivity,
  RelationshipContactReminder,
} from '@/types/contacts';

export function useContactsPersistence() {
  const { userKey, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async (): Promise<RelationshipContact[]> => {
    if (!userKey || !isAuthenticated) return [];
    const { data, error } = await dataApiHelpers.select<RelationshipContact[]>('relationship_contacts', {
      order: { column: 'display_name', ascending: true },
      limit: 5000,
    });
    if (error || !data) {
      console.error('[contacts] fetchContacts', error);
      return [];
    }
    return data;
  }, [userKey, isAuthenticated]);

  const fetchActivities = useCallback(
    async (contactId: string): Promise<RelationshipContactActivity[]> => {
      if (!userKey || !isAuthenticated) return [];
      const { data, error } = await dataApiHelpers.select<RelationshipContactActivity[]>(
        'relationship_contact_activities',
        {
          filters: { contact_id: contactId },
          order: { column: 'occurred_at', ascending: false },
          limit: 200,
        },
      );
      if (error || !data) return [];
      return data;
    },
    [userKey, isAuthenticated],
  );

  const fetchOpenReminders = useCallback(async (): Promise<RelationshipContactReminder[]> => {
    if (!userKey || !isAuthenticated) return [];
    const { data, error } = await dataApiHelpers.select<RelationshipContactReminder[]>(
      'relationship_contact_reminders',
      {
        filters: { completed_at: null },
        order: { column: 'due_at', ascending: true },
        limit: 500,
      },
    );
    if (error || !data) return [];
    return data;
  }, [userKey, isAuthenticated]);

  const fetchRemindersForContact = useCallback(
    async (contactId: string): Promise<RelationshipContactReminder[]> => {
      if (!userKey || !isAuthenticated) return [];
      const { data, error } = await dataApiHelpers.select<RelationshipContactReminder[]>(
        'relationship_contact_reminders',
        {
          filters: { contact_id: contactId },
          order: { column: 'due_at', ascending: true },
          limit: 100,
        },
      );
      if (error || !data) return [];
      return data;
    },
    [userKey, isAuthenticated],
  );

  const createContactManual = useCallback(
    async (displayName: string): Promise<RelationshipContact | null> => {
      const draft: ContactImportDraft = {
        display_name: displayName,
        emails: [],
        phones: [],
        source: 'device',
      };
      const payload = buildContactInsertPayload(draft);
      const { data, error } = await dataApiHelpers.insert<RelationshipContact>('relationship_contacts', payload);
      if (error) {
        console.error('[contacts] create', error);
        return null;
      }
      return data;
    },
    [],
  );

  const createContactDetailed = useCallback(
    async (input: {
      display_name: string;
      given_name?: string | null;
      family_name?: string | null;
      emails?: string[];
      phones?: string[];
      company?: string | null;
      job_title?: string | null;
      linkedin_url?: string | null;
      circle?: 'inner' | 'middle' | 'outer';
      tags?: string[];
      profile_notes?: string | null;
    }): Promise<RelationshipContact | null> => {
      const draft: ContactImportDraft = {
        display_name: input.display_name,
        given_name: input.given_name ?? null,
        family_name: input.family_name ?? null,
        emails: input.emails ?? [],
        phones: input.phones ?? [],
        company: input.company ?? null,
        job_title: input.job_title ?? null,
        linkedin_url: input.linkedin_url ?? null,
        source: 'device',
      };
      const payload = {
        ...buildContactInsertPayload(draft),
        circle: input.circle ?? 'outer',
        tags: input.tags ?? [],
        profile_notes: input.profile_notes ?? null,
      };
      const { data, error } = await dataApiHelpers.insert<RelationshipContact>('relationship_contacts', payload);
      if (error) {
        console.error('[contacts] createDetailed', error);
        return null;
      }
      return data;
    },
    [],
  );

  const updateContact = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const { data, error } = await dataApiHelpers.update<RelationshipContact>('relationship_contacts', id, patch);
    if (error) console.error('[contacts] update', error);
    return { data, error };
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    return dataApiHelpers.delete('relationship_contacts', id);
  }, []);

  const addActivity = useCallback(
    async (contactId: string, kind: RelationshipContactActivity['kind'], body: string, title?: string | null) => {
      const { error } = await dataApiHelpers.insert('relationship_contact_activities', {
        contact_id: contactId,
        kind,
        body,
        title: title ?? null,
      });
      if (error) console.error('[contacts] addActivity', error);
      return { error };
    },
    [],
  );

  const logInteraction = useCallback(
    async (contactId: string, summary: string) => {
      const now = new Date().toISOString();
      await addActivity(contactId, 'interaction', summary, summary.slice(0, 80));
      await updateContact(contactId, { last_interaction_at: now });
    },
    [addActivity, updateContact],
  );

  const addReminder = useCallback(async (contactId: string, title: string, dueAtIso: string) => {
    const { data, error } = await dataApiHelpers.insert<RelationshipContactReminder>(
      'relationship_contact_reminders',
      {
        contact_id: contactId,
        title,
        due_at: dueAtIso,
      },
    );
    if (error) console.error('[contacts] addReminder', error);
    return { data, error };
  }, []);

  const completeReminder = useCallback(async (reminderId: string) => {
    const { error } = await dataApiHelpers.update('relationship_contact_reminders', reminderId, {
      completed_at: new Date().toISOString(),
    });
    if (error) console.error('[contacts] completeReminder', error);
    return { error };
  }, []);

  const importDrafts = useCallback(async (drafts: ContactImportDraft[]) => {
    if (!drafts.length) return { created: 0, merged: 0, error: null as string | null };
    setLoading(true);
    try {
      const existing = await fetchContacts();
      const working = [...existing];
      let created = 0;
      let merged = 0;

      for (const draft of drafts) {
        const match = findMatchingContact(draft, working);
        if (match) {
          const patch = mergeImportIntoExisting(match, draft);
          const { data, error } = await dataApiHelpers.update<RelationshipContact>(
            'relationship_contacts',
            match.id,
            patch,
          );
          if (error) {
            return { created, merged, error };
          }
          await addActivity(
            match.id,
            'system',
            `Updated from ${draft.source} import (${draft.display_name}).`,
            'Import',
          );
          merged++;
          const idx = working.findIndex((c) => c.id === match.id);
          if (idx >= 0 && data) working[idx] = data;
        } else {
          const payload = buildContactInsertPayload(draft);
          const { data, error } = await dataApiHelpers.insert<RelationshipContact>('relationship_contacts', payload);
          if (error) {
            return { created, merged, error };
          }
          if (data) {
            working.push(data);
            created++;
          }
        }
      }

      return { created, merged, error: null };
    } finally {
      setLoading(false);
    }
  }, [fetchContacts, addActivity]);

  return {
    loading,
    fetchContacts,
    fetchActivities,
    fetchOpenReminders,
    fetchRemindersForContact,
    createContactManual,
    updateContact,
    deleteContact,
    addActivity,
    logInteraction,
    addReminder,
    completeReminder,
    importDrafts,
  };
}
