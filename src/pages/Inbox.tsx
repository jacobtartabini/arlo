import { useState, useMemo } from 'react';
import { 
  Mail, 
  Search, 
  Pin, 
  Star, 
  Archive,
  RefreshCw,
  Settings2,
  Send,
  Paperclip,
  ChevronLeft,
  MoreHorizontal,
  MessageCircle,
  Users,
  Instagram,
  Linkedin,
  Reply,
  Forward,
  Trash2,
  Inbox as InboxIcon,
  MailOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useInboxThreads, useInboxMessages, useInboxAccounts } from '@/hooks/useInboxPersistence';
import type { InboxThread, InboxFilter, InboxProvider } from '@/types/inbox';
import { PROVIDER_META } from '@/types/inbox';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { cn } from '@/lib/utils';

// Provider icon component
function ProviderIcon({ provider, className, size = 'md' }: { provider: InboxProvider; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = PROVIDER_META[provider];
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  
  const iconMap: Record<string, React.ReactNode> = {
    Mail: <Mail className={cn(sizeClass, className)} />,
    Users: <Users className={cn(sizeClass, className)} />,
    MessageCircle: <MessageCircle className={cn(sizeClass, className)} />,
    Send: <Send className={cn(sizeClass, className)} />,
    Instagram: <Instagram className={cn(sizeClass, className)} />,
    Linkedin: <Linkedin className={cn(sizeClass, className)} />,
  };
  
  return (
    <div style={{ color: meta.color }} className="flex-shrink-0">
      {iconMap[meta.icon] || <Mail className={cn(sizeClass, className)} />}
    </div>
  );
}

// Format timestamp
function formatEmailTime(date: Date): string {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

// Sidebar navigation item type
interface SidebarNavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  color?: string;
  provider?: InboxProvider;
  count?: number;
}

// Message row component - floating card style
function MessageRow({ 
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
  const isUnread = thread.unread_count > 0;
  const timestamp = thread.last_message_at ? new Date(thread.last_message_at) : new Date();
  
  return (
    <div 
      className={cn(
        "group flex items-center gap-3 px-4 py-3.5 cursor-pointer rounded-xl mx-2 mb-1 transition-all",
        isSelected 
          ? "bg-primary/10 ring-1 ring-primary/20" 
          : "hover:bg-muted/60",
        isUnread && !isSelected && "bg-card/80"
      )}
      onClick={onClick}
    >
      {/* Unread indicator */}
      <div className="w-2 flex-shrink-0">
        {isUnread && (
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      
      {/* Sender avatar */}
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 ring-1 ring-border/50">
        <span className={cn(
          "text-sm font-medium",
          isUnread ? "text-primary" : "text-muted-foreground"
        )}>
          {(primaryParticipant?.name || 'U')[0].toUpperCase()}
        </span>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "truncate text-sm",
            isUnread ? "font-semibold text-foreground" : "text-foreground/80"
          )}>
            {primaryParticipant?.name || primaryParticipant?.email || 'Unknown'}
          </span>
          <ProviderIcon provider={thread.provider} size="sm" />
        </div>
        <div className={cn(
          "truncate text-sm",
          isUnread ? "font-medium text-foreground/90" : "text-muted-foreground"
        )}>
          {thread.subject || 'No subject'}
        </div>
        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
          {thread.snippet}
        </p>
      </div>
      
      {/* Right side */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn(
          "text-xs",
          isUnread ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {formatEmailTime(timestamp)}
        </span>
        
        {/* Quick actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
              >
                <Archive className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onStar(); }}
              >
                <Star className={cn("h-3 w-3", thread.is_starred && "fill-yellow-500 text-yellow-500")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{thread.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onPin(); }}
              >
                <Pin className={cn("h-3 w-3", thread.is_pinned && "fill-primary text-primary")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{thread.is_pinned ? 'Unpin' : 'Pin'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// Reading pane - floating card style
function ReadingPane({
  thread,
  messages,
  loading,
  account,
  onBack,
  onPin,
  onStar,
  onArchive
}: {
  thread: InboxThread;
  messages: any[];
  loading: boolean;
  account: any;
  onBack: () => void;
  onPin: () => void;
  onStar: () => void;
  onArchive: () => void;
}) {
  const [replyContent, setReplyContent] = useState('');
  const [showReply, setShowReply] = useState(false);
  
  return (
    <div className="flex flex-col h-full glass-module rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-card/30">
        <div className="flex items-center gap-3 mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-8 w-8"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {thread.subject || 'No subject'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {thread.participants[0]?.email}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive}>
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStar}>
                  <Star className={cn("h-4 w-4", thread.is_starred && "fill-yellow-500 text-yellow-500")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{thread.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPin}>
                  <Pin className={cn("h-4 w-4", thread.is_pinned && "fill-primary text-primary")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{thread.is_pinned ? 'Unpin' : 'Pin'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Labels */}
        {thread.labels && thread.labels.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {thread.labels.map((label, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal rounded-full px-2.5">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Message content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full mt-4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">No message content available</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {messages.map((message) => (
              <div key={message.id} className="px-6 py-5">
                {/* Message header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 ring-1 ring-border/50">
                    <span className="text-sm font-medium text-primary">
                      {(message.sender?.name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{message.sender?.name || 'Unknown'}</span>
                      <span className="text-sm text-muted-foreground">
                        &lt;{message.sender?.email || 'no-email'}&gt;
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {message.sent_at && format(new Date(message.sent_at), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <ProviderIcon provider={thread.provider} size="sm" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Forward className="h-4 w-4 mr-2" />
                          Forward
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Message body */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {message.body_html ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: message.body_html }} 
                      className="[&>*:first-child]:mt-0"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                      {message.body_text || 'No content'}
                    </p>
                  )}
                </div>
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="text-xs text-muted-foreground mb-2">
                      {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.attachments.map((att: any, i: number) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors ring-1 ring-border/50"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[180px]">{att.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(att.size / 1024).toFixed(0)}KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Reply area */}
      {account && PROVIDER_META[thread.provider].supportsSend && (
        <div className="border-t border-border/50 p-4 bg-card/30">
          {showReply ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[100px] resize-none bg-background/50"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setShowReply(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!replyContent.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full justify-start text-muted-foreground bg-background/50 hover:bg-background/80"
              onClick={() => setShowReply(true)}
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply to this email...
            </Button>
          )}
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
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isMobileReading, setIsMobileReading] = useState(false);

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
    accountIds: [],
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

  // Build sidebar items
  const sidebarItems: SidebarNavItem[] = useMemo(() => {
    const items: SidebarNavItem[] = [
      { 
        id: 'all', 
        icon: <InboxIcon className="h-5 w-5" />, 
        label: 'All Inbox',
        count: threads.filter(t => t.unread_count > 0).length
      }
    ];
    
    const providerCounts = new Map<InboxProvider, number>();
    threads.forEach(t => {
      if (t.unread_count > 0) {
        providerCounts.set(t.provider, (providerCounts.get(t.provider) || 0) + t.unread_count);
      }
    });
    
    accounts.forEach(account => {
      if (!items.find(i => i.provider === account.provider)) {
        items.push({
          id: account.provider,
          icon: <ProviderIcon provider={account.provider} size="md" />,
          label: PROVIDER_META[account.provider].name,
          provider: account.provider,
          color: PROVIDER_META[account.provider].color,
          count: providerCounts.get(account.provider) || 0
        });
      }
    });
    
    return items;
  }, [accounts, threads]);

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setIsMobileReading(true);
  };

  const handleBack = () => {
    setIsMobileReading(false);
    setSelectedThreadId(null);
  };

  const handleSidebarSelect = (item: SidebarNavItem) => {
    if (item.id === 'all') {
      setSelectedProviders([]);
    } else if (item.provider) {
      setSelectedProviders([item.provider]);
    }
    setActiveFilter('all');
  };

  const hasNoAccounts = !accountsLoading && accounts.length === 0;
  const unreadCount = threads.filter(t => t.unread_count > 0).length;

  return (
    <div className="flex h-screen bg-background p-4 gap-4 overflow-hidden">
      {/* Floating sidebar navigation */}
      <div className="hidden md:flex flex-col w-56 flex-shrink-0">
        <div className="glass-module rounded-2xl p-3 flex flex-col h-full">
          {/* Sidebar header */}
          <div className="px-3 py-2 mb-2">
            <h2 className="font-semibold text-lg">Inbox</h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          
          {/* Navigation items */}
          <ScrollArea className="flex-1 -mx-1">
            <div className="space-y-1 px-1">
              {sidebarItems.map((item) => {
                const isActive = 
                  (item.id === 'all' && selectedProviders.length === 0) ||
                  (item.provider && selectedProviders.includes(item.provider));
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSidebarSelect(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                      isActive 
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">
                      {item.label}
                    </span>
                    {item.count !== undefined && item.count > 0 && (
                      <Badge 
                        variant={isActive ? "default" : "secondary"} 
                        className="h-5 min-w-5 text-xs px-1.5 rounded-full"
                      >
                        {item.count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          
          {/* Settings */}
          <div className="pt-2 mt-2 border-t border-border/50">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/settings?tab=inbox')}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className={cn(
        "flex-1 flex gap-4 min-w-0",
        isMobileReading && "hidden md:flex"
      )}>
        {/* Message list floating card */}
        <div className="flex-1 glass-module rounded-2xl flex flex-col min-w-0 overflow-hidden">
          {/* Search and actions header */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/50 border-border/50"
              />
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => refetchThreads()}
                  disabled={threadsLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", threadsLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
          
          {/* Filter tabs */}
          <div className="px-4 py-2 border-b border-border/20 flex items-center gap-1.5">
            {(['all', 'unread', 'starred', 'pinned'] as InboxFilter[]).map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs capitalize rounded-full px-3",
                  activeFilter === filter && "bg-primary/10 text-primary"
                )}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'all' && <InboxIcon className="h-3 w-3 mr-1.5" />}
                {filter === 'unread' && <MailOpen className="h-3 w-3 mr-1.5" />}
                {filter === 'starred' && <Star className="h-3 w-3 mr-1.5" />}
                {filter === 'pinned' && <Pin className="h-3 w-3 mr-1.5" />}
                {filter}
              </Button>
            ))}
          </div>
          
          {/* Message list */}
          <ScrollArea className="flex-1">
            {hasNoAccounts ? (
              <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="font-medium mb-1">No accounts connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your email and messaging accounts to get started.
                </p>
                <Button onClick={() => navigate('/settings?tab=inbox')} className="rounded-full">
                  Connect Accounts
                </Button>
              </div>
            ) : threadsLoading ? (
              <div className="py-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 mx-2 mb-1">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-medium mb-1">No messages</h3>
                <p className="text-sm text-muted-foreground">
                  {activeFilter !== 'all' 
                    ? 'No messages match your filters.'
                    : 'Your inbox is empty.'}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {threads.map(thread => (
                  <MessageRow
                    key={thread.id}
                    thread={thread}
                    isSelected={thread.id === selectedThreadId}
                    onClick={() => handleSelectThread(thread.id)}
                    onPin={() => togglePin(thread.id, thread.is_pinned)}
                    onStar={() => toggleStar(thread.id, thread.is_starred)}
                    onArchive={() => archiveThread(thread.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Reading pane (desktop) - elevated floating card */}
        <div className="hidden lg:block w-[420px] xl:w-[500px] flex-shrink-0">
          {selectedThread ? (
            <ReadingPane
              thread={selectedThread}
              messages={messages}
              loading={messagesLoading}
              account={selectedAccount}
              onBack={handleBack}
              onPin={() => togglePin(selectedThread.id, selectedThread.is_pinned)}
              onStar={() => toggleStar(selectedThread.id, selectedThread.is_starred)}
              onArchive={() => archiveThread(selectedThread.id)}
            />
          ) : (
            <div className="h-full glass-module rounded-2xl flex items-center justify-center">
              <div className="text-center p-6">
                <div className="h-20 w-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile reading view */}
      {isMobileReading && selectedThread && (
        <div className="lg:hidden flex-1">
          <ReadingPane
            thread={selectedThread}
            messages={messages}
            loading={messagesLoading}
            account={selectedAccount}
            onBack={handleBack}
            onPin={() => togglePin(selectedThread.id, selectedThread.is_pinned)}
            onStar={() => toggleStar(selectedThread.id, selectedThread.is_starred)}
            onArchive={() => archiveThread(selectedThread.id)}
          />
        </div>
      )}
    </div>
  );
}
