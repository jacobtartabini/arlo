import { useState, useMemo } from 'react';
import { 
  Mail, 
  Search, 
  Filter, 
  Pin, 
  Star, 
  Archive,
  RefreshCw,
  Settings2,
  Send,
  Sparkles,
  Paperclip,
  ChevronLeft,
  MoreVertical,
  MessageCircle,
  Users,
  Instagram,
  Linkedin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useInboxThreads, useInboxMessages, useInboxAccounts } from '@/hooks/useInboxPersistence';
import type { InboxThread, InboxFilter, InboxProvider } from '@/types/inbox';
import { PROVIDER_META } from '@/types/inbox';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Provider icon component
function ProviderIcon({ provider, className }: { provider: InboxProvider; className?: string }) {
  const meta = PROVIDER_META[provider];
  
  const iconMap: Record<string, React.ReactNode> = {
    Mail: <Mail className={className} />,
    Users: <Users className={className} />,
    MessageCircle: <MessageCircle className={className} />,
    Send: <Send className={className} />,
    Instagram: <Instagram className={className} />,
    Linkedin: <Linkedin className={className} />,
  };
  
  return (
    <div style={{ color: meta.color }}>
      {iconMap[meta.icon] || <Mail className={className} />}
    </div>
  );
}

// Thread list item
function ThreadListItem({ 
  thread, 
  isSelected, 
  onClick,
  onPin,
  onStar,
  onArchive
}: { 
  thread: InboxThread;
  isSelected: boolean;
  onClick: () => void;
  onPin: () => void;
  onStar: () => void;
  onArchive: () => void;
}) {
  const primaryParticipant = thread.participants[0];
  
  return (
    <div 
      className={cn(
        "group flex items-start gap-3 p-3 cursor-pointer border-b border-border/50 transition-colors",
        isSelected ? "bg-primary/10" : "hover:bg-muted/50",
        thread.unread_count > 0 && "bg-primary/5"
      )}
      onClick={onClick}
    >
      {/* Provider icon */}
      <div className="flex-shrink-0 mt-1">
        <ProviderIcon provider={thread.provider} className="h-4 w-4" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-sm truncate",
            thread.unread_count > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
          )}>
            {primaryParticipant?.name || primaryParticipant?.email || 'Unknown'}
          </span>
          {thread.is_pinned && <Pin className="h-3 w-3 text-primary" />}
          {thread.is_starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
        </div>
        
        <p className={cn(
          "text-sm truncate",
          thread.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {thread.subject || 'No subject'}
        </p>
        
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {thread.snippet}
        </p>
      </div>
      
      {/* Meta */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {thread.last_message_at 
            ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: false })
            : ''
          }
        </span>
        
        {thread.unread_count > 0 && (
          <Badge variant="default" className="h-5 min-w-5 text-xs px-1.5">
            {thread.unread_count}
          </Badge>
        )}
        
        {/* Actions (show on hover) */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onPin(); }}
          >
            <Pin className={cn("h-3 w-3", thread.is_pinned && "fill-primary")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onStar(); }}
          >
            <Star className={cn("h-3 w-3", thread.is_starred && "fill-yellow-500")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
          >
            <Archive className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Message bubble
function MessageBubble({ 
  sender, 
  content, 
  timestamp, 
  isOutgoing,
  attachments
}: { 
  sender: { name: string; email?: string };
  content: string;
  timestamp: string;
  isOutgoing: boolean;
  attachments?: { name: string; mime_type: string; size: number }[];
}) {
  return (
    <div className={cn("flex flex-col gap-1 max-w-[80%]", isOutgoing ? "ml-auto items-end" : "items-start")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{sender.name}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
      </div>
      
      <div className={cn(
        "rounded-2xl px-4 py-2.5",
        isOutgoing 
          ? "bg-primary text-primary-foreground rounded-br-sm" 
          : "bg-muted rounded-bl-sm"
      )}>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
      
      {attachments && attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {attachments.map((att, i) => (
            <div 
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{att.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all');
  const [selectedProviders, setSelectedProviders] = useState<InboxProvider[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  const { accounts, loading: accountsLoading } = useInboxAccounts();
  const { 
    threads, 
    loading: threadsLoading, 
    refetch: refetchThreads,
    togglePin,
    toggleStar,
    archiveThread
  } = useInboxThreads({
    filter: activeFilter,
    providers: selectedProviders,
    accountIds: selectedAccounts,
    searchQuery,
  });
  
  const { messages, loading: messagesLoading } = useInboxMessages(selectedThreadId);

  const selectedThread = useMemo(() => 
    threads.find(t => t.id === selectedThreadId),
    [threads, selectedThreadId]
  );

  const selectedAccount = useMemo(() => 
    selectedThread ? accounts.find(a => a.id === selectedThread.account_id) : null,
    [selectedThread, accounts]
  );

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setIsMobileThreadOpen(true);
    setDraftContent('');
  };

  const handleBack = () => {
    setIsMobileThreadOpen(false);
    setSelectedThreadId(null);
  };

  const handleSend = async () => {
    if (!draftContent.trim() || !selectedThread || !selectedAccount) return;
    
    // TODO: Implement send via edge function
    console.log('Sending message:', draftContent);
    setDraftContent('');
  };

  const handleGenerateDraft = async () => {
    // TODO: Implement AI draft generation
    console.log('Generating AI draft...');
  };

  const toggleProvider = (provider: InboxProvider) => {
    setSelectedProviders(prev => 
      prev.includes(provider)
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  const uniqueProviders = useMemo(() => 
    [...new Set(accounts.map(a => a.provider))],
    [accounts]
  );

  const hasNoAccounts = !accountsLoading && accounts.length === 0;

  return (
    <div className="flex h-screen bg-background">
      {/* Thread list sidebar */}
      <div className={cn(
        "w-full md:w-96 border-r border-border flex flex-col",
        isMobileThreadOpen && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-xl font-semibold">Inbox</h1>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetchThreads()}
              disabled={threadsLoading}
            >
              <RefreshCw className={cn("h-4 w-4", threadsLoading && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/settings?tab=inbox')}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="p-3 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs 
              value={activeFilter} 
              onValueChange={(v) => setActiveFilter(v as InboxFilter)}
              className="flex-1"
            >
              <TabsList className="w-full h-8">
                <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
                <TabsTrigger value="unread" className="flex-1 text-xs">Unread</TabsTrigger>
                <TabsTrigger value="pinned" className="flex-1 text-xs">Pinned</TabsTrigger>
                <TabsTrigger value="starred" className="flex-1 text-xs">Starred</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Filter by Provider
                </div>
                {uniqueProviders.map(provider => (
                  <DropdownMenuCheckboxItem
                    key={provider}
                    checked={selectedProviders.includes(provider)}
                    onCheckedChange={() => toggleProvider(provider)}
                  >
                    <ProviderIcon provider={provider} className="h-4 w-4 mr-2" />
                    {PROVIDER_META[provider].name}
                  </DropdownMenuCheckboxItem>
                ))}
                {uniqueProviders.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => setSelectedProviders([])}>
                  Clear filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Thread list */}
        <ScrollArea className="flex-1">
          {hasNoAccounts ? (
            <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
              <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-1">No accounts connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your email and messaging accounts to get started.
              </p>
              <Button onClick={() => navigate('/settings?tab=inbox')}>
                Connect Accounts
              </Button>
            </div>
          ) : threadsLoading ? (
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-1">No messages</h3>
              <p className="text-sm text-muted-foreground">
                {activeFilter !== 'all' 
                  ? 'No messages match your filters.'
                  : 'Your inbox is empty.'}
              </p>
            </div>
          ) : (
            threads.map(thread => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                onClick={() => handleSelectThread(thread.id)}
                onPin={() => togglePin(thread.id, thread.is_pinned)}
                onStar={() => toggleStar(thread.id, thread.is_starred)}
                onArchive={() => archiveThread(thread.id)}
              />
            ))
          )}
        </ScrollArea>
      </div>
      
      {/* Message view */}
      <div className={cn(
        "flex-1 flex flex-col",
        !isMobileThreadOpen && "hidden md:flex"
      )}>
        {selectedThread ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={handleBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ProviderIcon provider={selectedThread.provider} className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    {selectedAccount?.account_name || PROVIDER_META[selectedThread.provider].name}
                  </span>
                </div>
                <h2 className="font-medium truncate">
                  {selectedThread.subject || 'No subject'}
                </h2>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => togglePin(selectedThread.id, selectedThread.is_pinned)}
                >
                  <Pin className={cn("h-4 w-4", selectedThread.is_pinned && "fill-primary text-primary")} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => toggleStar(selectedThread.id, selectedThread.is_starred)}
                >
                  <Star className={cn("h-4 w-4", selectedThread.is_starred && "fill-yellow-500 text-yellow-500")} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => archiveThread(selectedThread.id)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={cn("flex flex-col gap-1", i % 2 === 0 ? "items-start" : "items-end")}>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className={cn("h-20 rounded-2xl", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No messages in this thread
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <MessageBubble
                      key={message.id}
                      sender={message.sender}
                      content={message.body_text || ''}
                      timestamp={message.sent_at}
                      isOutgoing={message.is_outgoing}
                      attachments={message.attachments}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {/* Composer */}
            {selectedAccount && PROVIDER_META[selectedThread.provider].supportsSend && (
              <div className="p-4 border-t border-border">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your reply..."
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleGenerateDraft}
                      title="Generate AI draft"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!draftContent.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Read-only notice */}
            {selectedAccount && !PROVIDER_META[selectedThread.provider].supportsSend && (
              <div className="p-4 border-t border-border bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  Replies are not supported for {PROVIDER_META[selectedThread.provider].name}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
