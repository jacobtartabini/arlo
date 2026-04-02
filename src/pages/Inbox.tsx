import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useInboxThreads, useInboxMessages, useInboxAccounts } from '@/hooks/useInboxPersistence';
import { useIsMobile } from '@/hooks/use-mobile';
import type { InboxThread, InboxMessage } from '@/types/inbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getArloToken } from '@/lib/arloAuth';

import {
  InboxSidebar,
  EmailMessageRow,
  EmailReadingPane,
  ComposeDialog,
  BulkActionBar,
  type SystemFolder,
  type ComposeMode,
  type ComposeData,
} from '@/components/inbox';

import { MobileInboxView } from '@/components/mobile';

const AUTO_SYNC_INTERVAL = 60000; // 60 seconds

export default function Inbox() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<SystemFolder>('inbox');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [isMobileReading, setIsMobileReading] = useState(false);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>('new');
  const [replyToMessage, setReplyToMessage] = useState<InboxMessage | undefined>();
  const [aiDraft, setAiDraft] = useState<string | undefined>();
  const [isAiDraft, setIsAiDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  const { accounts, loading: accountsLoading, refetch: refetchAccounts } = useInboxAccounts();
  
  // Map folder to filter
  const filterFromFolder = useMemo(() => {
    switch (activeFolder) {
      case 'starred': return 'starred' as const;
      case 'inbox': return 'all' as const;
      default: return 'all' as const;
    }
  }, [activeFolder]);

  const { 
    threads, 
    loading: threadsLoading, 
    refetch: refetchThreads,
    togglePin,
    toggleStar,
    archiveThread
  } = useInboxThreads({
    filter: filterFromFolder,
    providers: [],
    accountIds: [],
    searchQuery,
  });
  
  const { messages, loading: messagesLoading } = useInboxMessages(selectedThreadId);

  const selectedThread = useMemo(() => 
    threads.find(t => t.id === selectedThreadId),
    [threads, selectedThreadId]
  );

  // Filter threads based on active folder
  const filteredThreads = useMemo(() => {
    let filtered = threads;
    
    switch (activeFolder) {
      case 'inbox':
        filtered = threads.filter(t => !t.is_archived);
        break;
      case 'starred':
        filtered = threads.filter(t => t.is_starred);
        break;
      case 'spam':
        filtered = threads.filter(t => t.labels.some(l => l.toLowerCase() === 'spam'));
        break;
      case 'trash':
        filtered = threads.filter(t => t.labels.some(l => l.toLowerCase() === 'trash'));
        break;
      default:
        break;
    }
    
    // Filter by selected labels
    if (selectedLabels.length > 0) {
      filtered = filtered.filter(t => 
        selectedLabels.every(label => t.labels.includes(label))
      );
    }
    
    return filtered;
  }, [threads, activeFolder, selectedLabels]);

  // Get last sync time from accounts
  useEffect(() => {
    if (accounts.length > 0) {
      const latestSync = accounts
        .map(a => a.last_sync_at)
        .filter(Boolean)
        .sort()
        .pop();
      setLastSyncedAt(latestSync);
    }
  }, [accounts]);

  // Manual sync function
  const handleManualSync = useCallback(async () => {
    if (isSyncing || accounts.length === 0) return;
    
    setIsSyncing(true);
    try {
      const token = await getArloToken();
      if (!token) throw new Error('Not authenticated');

      // Sync each account
      for (const account of accounts) {
        await supabase.functions.invoke('inbox-sync', {
          headers: { Authorization: `Bearer ${token}` },
          body: { account_id: account.id, sync_type: 'incremental' }
        });
      }
      
      setLastSyncedAt(new Date().toISOString());
      await refetchThreads();
      await refetchAccounts();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [accounts, isSyncing, refetchThreads, refetchAccounts]);

  // Auto-sync every 60 seconds
  useEffect(() => {
    if (accounts.length === 0) return;
    
    syncIntervalRef.current = setInterval(() => {
      handleManualSync();
    }, AUTO_SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [accounts.length, handleManualSync]);

  // Compose handlers
  const handleCompose = () => {
    setComposeMode('new');
    setReplyToMessage(undefined);
    setAiDraft(undefined);
    setIsAiDraft(false);
    setComposeOpen(true);
  };

  const handleReply = () => {
    if (messages.length > 0) {
      setComposeMode('reply');
      setReplyToMessage(messages[messages.length - 1]);
      setAiDraft(undefined);
      setIsAiDraft(false);
      setComposeOpen(true);
    }
  };

  const handleReplyAll = () => {
    if (messages.length > 0) {
      setComposeMode('replyAll');
      setReplyToMessage(messages[messages.length - 1]);
      setComposeOpen(true);
    }
  };

  const handleForward = () => {
    if (messages.length > 0) {
      setComposeMode('forward');
      setReplyToMessage(messages[messages.length - 1]);
      setComposeOpen(true);
    }
  };

  const handleGenerateAIReply = async () => {
    if (!selectedThread || messages.length === 0) return;
    
    setIsGeneratingAI(true);
    try {
      const lastMessage = messages[messages.length - 1];
      const context = `Subject: ${selectedThread.subject}\n\nMessage:\n${lastMessage.body_text || ''}`;
      
      const response = await supabase.functions.invoke('ai-draft-reply', {
        body: { context, threadId: selectedThread.id }
      });
      
      if (response.data?.draft) {
        setAiDraft(response.data.draft);
        setIsAiDraft(true);
        setComposeMode('reply');
        setReplyToMessage(lastMessage);
        setComposeOpen(true);
      }
    } catch (error) {
      toast.error('Failed to generate AI draft');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSend = async (data: ComposeData) => {
    setIsSending(true);
    try {
      const token = await getArloToken();
      if (!token) throw new Error('Not authenticated');

      await supabase.functions.invoke('inbox-send', {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          account_id: data.accountId,
          thread_id: data.threadId || selectedThread?.id,
          content: data.body,
          subject: data.subject,
          recipients: data.to.map(email => ({ email })),
        }
      });
      
      toast.success('Message sent');
      setComposeOpen(false);
      refetchThreads();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Selection handlers
  const handleCheckThread = (threadId: string, checked: boolean) => {
    setSelectedThreadIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(threadId);
      } else {
        next.delete(threadId);
      }
      return next;
    });
  };

  const handleClearSelection = () => setSelectedThreadIds(new Set());

  const handleBulkArchive = async () => {
    for (const id of selectedThreadIds) {
      await archiveThread(id);
    }
    handleClearSelection();
  };

  const handleBulkDelete = async () => {
    // Would need delete implementation
    toast.info('Delete not yet implemented');
  };

  // Mobile view (after all hooks to keep hook order stable)
  if (isMobile) {
    return <MobileInboxView />;
  }

  const hasNoAccounts = !accountsLoading && accounts.length === 0;
  const allLabels = Array.from(new Set(threads.flatMap(t => t.labels))).filter(Boolean);

  return (
    <div className="flex h-screen bg-background p-4 gap-4 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-56 flex-shrink-0">
        <div className="glass-module rounded-2xl p-2 flex flex-col h-full">
          <InboxSidebar
            accounts={accounts}
            threads={threads}
            activeFolder={activeFolder}
            selectedLabels={selectedLabels}
            onFolderSelect={(folder) => { setActiveFolder(folder); setSelectedLabels([]); }}
            onLabelSelect={(label) => setSelectedLabels(prev => 
              prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
            )}
            onComposeClick={handleCompose}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            onManualSync={handleManualSync}
          />
        </div>
      </div>
      
      {/* Message list */}
      <div className={cn("flex-1 glass-module rounded-2xl flex flex-col min-w-0 overflow-hidden", isMobileReading && "hidden md:flex")}>
        {/* Search header */}
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-border/50"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleManualSync} disabled={isSyncing}>
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
        
        {/* Bulk action bar */}
        <BulkActionBar
          selectedCount={selectedThreadIds.size}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onMarkRead={() => {}}
          onMarkUnread={() => {}}
          onAddLabel={() => {}}
          onClearSelection={handleClearSelection}
          availableLabels={allLabels}
        />
        
        {/* Message list */}
        <ScrollArea className="flex-1">
          {hasNoAccounts ? (
            <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="font-medium mb-1">No accounts connected</h3>
              <p className="text-sm text-muted-foreground mb-4">Connect your email accounts to get started.</p>
              <Button onClick={() => navigate('/settings?tab=inbox')} className="rounded-full">Connect Accounts</Button>
            </div>
          ) : threadsLoading ? (
            <div className="py-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
              <Mail className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No emails in this folder</p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <EmailMessageRow
                key={thread.id}
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                isChecked={selectedThreadIds.has(thread.id)}
                onSelect={() => { setSelectedThreadId(thread.id); setIsMobileReading(true); }}
                onCheck={(checked) => handleCheckThread(thread.id, checked)}
                onStar={() => toggleStar(thread.id, thread.is_starred)}
              />
            ))
          )}
        </ScrollArea>
      </div>
      
      {/* Reading pane */}
      <div className="hidden lg:block w-[480px] xl:w-[560px] flex-shrink-0">
        {selectedThread ? (
          <div className="h-full glass-module rounded-2xl overflow-hidden">
            <EmailReadingPane
              thread={selectedThread}
              messages={messages}
              loading={messagesLoading}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onArchive={() => archiveThread(selectedThread.id)}
              onDelete={() => {}}
              onStar={() => toggleStar(selectedThread.id, selectedThread.is_starred)}
              onGenerateAIReply={handleGenerateAIReply}
              isGeneratingAI={isGeneratingAI}
            />
          </div>
        ) : (
          <div className="h-full glass-module rounded-2xl flex items-center justify-center">
            <div className="text-center p-6">
              <Mail className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Select an email to read</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Compose dialog */}
      <ComposeDialog
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        mode={composeMode}
        accounts={accounts}
        replyToThread={selectedThread}
        replyToMessage={replyToMessage}
        initialDraft={aiDraft}
        isAIDraft={isAiDraft}
        onSend={handleSend}
        isSending={isSending}
      />
    </div>
  );
}
