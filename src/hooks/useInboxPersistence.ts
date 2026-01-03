import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { dataApiHelpers } from '@/lib/data-api';
import type { 
  InboxAccount, 
  InboxThread, 
  InboxMessage, 
  InboxDraft,
  InboxProvider,
  InboxFilter 
} from '@/types/inbox';

export function useInboxAccounts() {
  const { userKey, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<InboxAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!userKey || !isAuthenticated) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await dataApiHelpers.select<InboxAccount[]>(
        'inbox_accounts_safe',
        { filters: { user_key: userKey } }
      );
      
      if (!result.error && result.data) {
        setAccounts(result.data);
      } else {
        setError(result.error || 'Failed to fetch accounts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userKey, isAuthenticated]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const disconnectAccount = async (accountId: string) => {
    if (!userKey) return { error: 'Not authenticated' };
    
    const result = await dataApiHelpers.delete('inbox_accounts', accountId);
    
    if (!result.error) {
      setAccounts(prev => prev.filter(a => a.id !== accountId));
    }
    
    return result;
  };

  return { accounts, loading, error, refetch: fetchAccounts, disconnectAccount };
}

export function useInboxThreads(options: {
  filter?: InboxFilter;
  providers?: InboxProvider[];
  accountIds?: string[];
  searchQuery?: string;
} = {}) {
  const { userKey, isAuthenticated } = useAuth();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { filter = 'all', providers = [], accountIds = [], searchQuery = '' } = options;

  const fetchThreads = useCallback(async () => {
    if (!userKey || !isAuthenticated) {
      setThreads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build filter conditions
      const filters: Record<string, unknown> = { 
        user_key: userKey,
        is_archived: false,
      };
      
      if (filter === 'pinned') {
        filters.is_pinned = true;
      } else if (filter === 'starred') {
        filters.is_starred = true;
      }

      const result = await dataApiHelpers.select<InboxThread[]>(
        'inbox_threads',
        { 
          filters,
          order: { column: 'last_message_at', ascending: false }
        }
      );
      
      if (!result.error && result.data) {
        let filteredThreads = result.data;
        
        // Apply unread filter (client-side since unread_count > 0 needs special handling)
        if (filter === 'unread') {
          filteredThreads = filteredThreads.filter(t => t.unread_count > 0);
        }
        
        // Apply provider filter
        if (providers.length > 0) {
          filteredThreads = filteredThreads.filter(t => providers.includes(t.provider));
        }
        
        // Apply account filter
        if (accountIds.length > 0) {
          filteredThreads = filteredThreads.filter(t => accountIds.includes(t.account_id));
        }
        
        // Apply search filter (client-side for now)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredThreads = filteredThreads.filter(t => 
            t.subject?.toLowerCase().includes(query) ||
            t.snippet?.toLowerCase().includes(query) ||
            t.participants.some(p => 
              p.name?.toLowerCase().includes(query) ||
              p.email?.toLowerCase().includes(query)
            )
          );
        }
        
        setThreads(filteredThreads);
      } else {
        setError(result.error || 'Failed to fetch threads');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userKey, isAuthenticated, filter, providers, accountIds, searchQuery]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const togglePin = async (threadId: string, isPinned: boolean) => {
    if (!userKey) return { error: 'Not authenticated' };
    
    const result = await dataApiHelpers.update('inbox_threads', threadId, { is_pinned: !isPinned });
    
    if (!result.error) {
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, is_pinned: !isPinned } : t
      ));
    }
    
    return result;
  };

  const toggleStar = async (threadId: string, isStarred: boolean) => {
    if (!userKey) return { error: 'Not authenticated' };
    
    const result = await dataApiHelpers.update('inbox_threads', threadId, { is_starred: !isStarred });
    
    if (!result.error) {
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, is_starred: !isStarred } : t
      ));
    }
    
    return result;
  };

  const archiveThread = async (threadId: string) => {
    if (!userKey) return { error: 'Not authenticated' };
    
    const result = await dataApiHelpers.update('inbox_threads', threadId, { is_archived: true });
    
    if (!result.error) {
      setThreads(prev => prev.filter(t => t.id !== threadId));
    }
    
    return result;
  };

  return { 
    threads, 
    loading, 
    error, 
    refetch: fetchThreads,
    togglePin,
    toggleStar,
    archiveThread 
  };
}

export function useInboxMessages(threadId: string | null) {
  const { userKey, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!userKey || !isAuthenticated || !threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const result = await dataApiHelpers.select<InboxMessage[]>(
        'inbox_messages',
        { 
          filters: { thread_id: threadId, user_key: userKey },
          order: { column: 'sent_at', ascending: true }
        }
      );
      
      if (!result.error && result.data) {
        setMessages(result.data);
        
        // Mark messages as read (in background)
        const unreadIds = result.data
          .filter(m => !m.is_read && !m.is_outgoing)
          .map(m => m.id);
        
        if (unreadIds.length > 0) {
          // Update in background
          Promise.all(unreadIds.map(id => 
            dataApiHelpers.update('inbox_messages', id, { is_read: true })
          ));
        }
      } else {
        setError(result.error || 'Failed to fetch messages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userKey, isAuthenticated, threadId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages };
}

export function useInboxDrafts(threadId: string | null) {
  const { userKey, isAuthenticated } = useAuth();
  const [drafts, setDrafts] = useState<InboxDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async () => {
    if (!userKey || !isAuthenticated || !threadId) {
      setDrafts([]);
      return;
    }

    const result = await dataApiHelpers.select<InboxDraft[]>(
      'inbox_drafts',
      { 
        filters: { thread_id: threadId, user_key: userKey, sent: false },
        order: { column: 'created_at', ascending: false }
      }
    );
    
    if (!result.error && result.data) {
      setDrafts(result.data);
    }
  }, [userKey, isAuthenticated, threadId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const saveDraft = async (content: string, aiGenerated = false) => {
    if (!userKey || !threadId) return null;
    
    // Get account_id from thread
    const threadResult = await dataApiHelpers.select<InboxThread[]>(
      'inbox_threads',
      { filters: { id: threadId, user_key: userKey } }
    );
    
    if (threadResult.error || !threadResult.data?.[0]) return null;
    
    const result = await dataApiHelpers.upsert('inbox_drafts', {
      user_key: userKey,
      thread_id: threadId,
      account_id: threadResult.data[0].account_id,
      content,
      ai_generated: aiGenerated,
    });
    
    if (!result.error) {
      fetchDrafts();
    }
    
    return result;
  };

  const deleteDraft = async (draftId: string) => {
    if (!userKey) return { error: 'Not authenticated' };
    
    const result = await dataApiHelpers.delete('inbox_drafts', draftId);
    
    if (!result.error) {
      setDrafts(prev => prev.filter(d => d.id !== draftId));
    }
    
    return result;
  };

  return { drafts, loading, saveDraft, deleteDraft, refetch: fetchDrafts };
}
