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
  ChevronRight,
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
import { Separator } from '@/components/ui/separator';
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
import { format, formatDistanceToNow, isToday, isYesterday, isThisYear } from 'date-fns';
import { cn } from '@/lib/utils';

// Provider icon component with proper colors
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

// Format timestamp for email display
function formatEmailTime(date: Date): string {
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
}

// Sidebar navigation item
interface SidebarNavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  color?: string;
  provider?: InboxProvider;
  count?: number;
}

// Message row component - email-style
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
        "group flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/40 transition-all",
        isSelected 
          ? "bg-primary/8 border-l-2 border-l-primary" 
          : "hover:bg-muted/50 border-l-2 border-l-transparent",
        isUnread && !isSelected && "bg-primary/4"
      )}
      onClick={onClick}
    >
      {/* Unread indicator */}
      <div className="w-2 flex-shrink-0">
        {isUnread && (
          <div className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
      
      {/* Sender */}
      <div className={cn(
        "w-44 flex-shrink-0 truncate",
        isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
      )}>
        {primaryParticipant?.name || primaryParticipant?.email || 'Unknown'}
      </div>
      
      {/* Subject + Preview */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={cn(
          "truncate",
          isUnread ? "font-medium text-foreground" : "text-foreground/80"
        )}>
          {thread.subject || 'No subject'}
        </span>
        <span className="text-muted-foreground/60 mx-1">—</span>
        <span className="text-muted-foreground truncate text-sm">
          {thread.snippet}
        </span>
      </div>
      
      {/* Quick actions (show on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onArchive(); }}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Archive</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onStar(); }}
            >
              <Star className={cn("h-3.5 w-3.5", thread.is_starred && "fill-yellow-500 text-yellow-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{thread.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onPin(); }}
            >
              <Pin className={cn("h-3.5 w-3.5", thread.is_pinned && "fill-primary text-primary")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{thread.is_pinned ? 'Unpin' : 'Pin'}</TooltipContent>
        </Tooltip>
      </div>
      
      {/* Provider icon */}
      <div className="flex-shrink-0 w-6">
        <ProviderIcon provider={thread.provider} size="sm" />
      </div>
      
      {/* Timestamp */}
      <div className={cn(
        "w-20 text-right text-sm flex-shrink-0",
        isUnread ? "font-medium text-foreground" : "text-muted-foreground"
      )}>
        {formatEmailTime(timestamp)}
      </div>
    </div>
  );
}

// Reading pane - email view
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
  
  const latestMessage = messages[messages.length - 1];
  const hasMultipleMessages = messages.length > 1;
  
  return (
    <div className="flex flex-col h-full">
      {/* Email header */}
      <div className="px-6 py-4 border-b border-border">
        {/* Mobile back button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden mb-2 -ml-2"
          onClick={onBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        {/* Subject line */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold leading-tight">
            {thread.subject || 'No subject'}
          </h1>
          
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onArchive}>
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => {}}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onStar}
                >
                  <Star className={cn("h-4 w-4", thread.is_starred && "fill-yellow-500 text-yellow-500")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{thread.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onPin}
                >
                  <Pin className={cn("h-4 w-4", thread.is_pinned && "fill-primary text-primary")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{thread.is_pinned ? 'Unpin' : 'Pin'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Labels/tags */}
        {thread.labels && thread.labels.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {thread.labels.map((label, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
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
            No message content available
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {messages.map((message, index) => (
              <div key={message.id} className="px-6 py-5">
                {/* Message header */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Avatar placeholder */}
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">
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
                  
                  {/* Per-message actions */}
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
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="text-sm text-muted-foreground mb-2">
                      {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.attachments.map((att: any, i: number) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">{att.name}</span>
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
        <div className="border-t border-border p-4">
          {showReply ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[120px] resize-none"
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
              className="w-full justify-start text-muted-foreground"
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // Build sidebar navigation items
  const sidebarItems: SidebarNavItem[] = useMemo(() => {
    const items: SidebarNavItem[] = [
      { 
        id: 'all', 
        icon: <InboxIcon className="h-5 w-5" />, 
        label: 'All Inbox',
        count: threads.filter(t => t.unread_count > 0).length
      }
    ];
    
    // Add connected providers
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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Source navigation sidebar */}
      <div 
        className={cn(
          "flex-shrink-0 border-r border-border bg-muted/30 flex flex-col transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Sidebar header */}
        <div className="p-3 flex items-center justify-between">
          {!sidebarCollapsed && (
            <span className="font-semibold text-sm">Inbox</span>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <Separator />
        
        {/* Navigation items */}
        <ScrollArea className="flex-1 py-2">
          <div className="space-y-1 px-2">
            {sidebarItems.map((item) => {
              const isActive = 
                (item.id === 'all' && selectedProviders.length === 0) ||
                (item.provider && selectedProviders.includes(item.provider));
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSidebarSelect(item)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex-shrink-0">
                        {item.icon}
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium truncate">
                            {item.label}
                          </span>
                          {item.count !== undefined && item.count > 0 && (
                            <Badge 
                              variant={isActive ? "default" : "secondary"} 
                              className="h-5 min-w-5 text-xs px-1.5"
                            >
                              {item.count}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {sidebarCollapsed && (
                    <TooltipContent side="right">
                      {item.label}
                      {item.count !== undefined && item.count > 0 && ` (${item.count})`}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>
        
        {/* Sidebar footer */}
        <Separator />
        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size={sidebarCollapsed ? "icon" : "default"}
                className={cn("w-full", !sidebarCollapsed && "justify-start")}
                onClick={() => navigate('/settings?tab=inbox')}
              >
                <Settings2 className="h-4 w-4" />
                {!sidebarCollapsed && <span className="ml-2">Settings</span>}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">Settings</TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
      
      {/* Main content area */}
      <div className={cn(
        "flex-1 flex",
        isMobileReading && "hidden md:flex"
      )}>
        {/* Message list */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          {/* List header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9"
                onClick={() => refetchThreads()}
                disabled={threadsLoading}
              >
                <RefreshCw className={cn("h-4 w-4", threadsLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {/* Filter tabs */}
          <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2">
            {(['all', 'unread', 'starred', 'pinned'] as InboxFilter[]).map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs capitalize"
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'all' && <InboxIcon className="h-3 w-3 mr-1.5" />}
                {filter === 'unread' && <MailOpen className="h-3 w-3 mr-1.5" />}
                {filter === 'starred' && <Star className="h-3 w-3 mr-1.5" />}
                {filter === 'pinned' && <Pin className="h-3 w-3 mr-1.5" />}
                {filter}
                {filter === 'unread' && unreadCount > 0 && (
                  <Badge variant="default" className="ml-1.5 h-4 text-[10px] px-1">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          
          {/* Message list */}
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
              <div className="divide-y divide-border/40">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-1">No messages</h3>
                <p className="text-sm text-muted-foreground">
                  {activeFilter !== 'all' 
                    ? 'No messages match your filters.'
                    : 'Your inbox is empty.'}
                </p>
              </div>
            ) : (
              <div>
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
        
        {/* Reading pane (desktop) */}
        <div className="hidden md:flex w-[45%] min-w-[400px] max-w-[600px] flex-col">
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
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile reading view */}
      {isMobileReading && selectedThread && (
        <div className="md:hidden flex-1 flex flex-col">
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
