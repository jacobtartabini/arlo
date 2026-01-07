import { useState } from 'react';
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  MoreHorizontal, 
  Trash2,
  Archive,
  Star,
  Tag,
  Printer,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Sparkles,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { InboxThread, InboxMessage, InboxProvider } from '@/types/inbox';
import { PROVIDER_META } from '@/types/inbox';
import { format } from 'date-fns';

interface EmailReadingPaneProps {
  thread: InboxThread;
  messages: InboxMessage[];
  loading: boolean;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStar: () => void;
  onGenerateAIReply: () => void;
  isGeneratingAI?: boolean;
}

interface EmailMessageCardProps {
  message: InboxMessage;
  isExpanded: boolean;
  onToggle: () => void;
  isLatest: boolean;
}

function EmailMessageCard({ message, isExpanded, onToggle, isLatest }: EmailMessageCardProps) {
  const sentDate = new Date(message.sent_at);
  
  return (
    <div className={cn(
      "border border-border/30 rounded-xl bg-card/30 overflow-hidden",
      isLatest && "ring-1 ring-primary/20"
    )}>
      {/* Message header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-muted/20 transition-colors"
      >
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 ring-1 ring-border/50">
          <span className="text-sm font-semibold text-primary">
            {(message.sender?.name || 'U')[0].toUpperCase()}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          {/* From line */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">
              {message.sender?.name || 'Unknown Sender'}
            </span>
            <span className="text-sm text-muted-foreground">
              &lt;{message.sender?.email || 'unknown'}&gt;
            </span>
            {message.is_outgoing && (
              <Badge variant="secondary" className="text-xs h-5">Sent</Badge>
            )}
          </div>
          
          {/* To line - shown when expanded */}
          {isExpanded && message.recipients && message.recipients.length > 0 && (
            <div className="text-sm text-muted-foreground mt-1">
              <span className="text-muted-foreground/60">To: </span>
              {message.recipients.map(r => r.name || r.email).join(', ')}
            </div>
          )}
          
          {/* Snippet when collapsed */}
          {!isExpanded && (
            <p className="text-sm text-muted-foreground truncate mt-1">
              {message.body_text?.slice(0, 100) || 'No preview'}
            </p>
          )}
        </div>
        
        {/* Date and expand icon */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {format(sentDate, "MMM d, yyyy 'at' h:mm a")}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5">
          {/* Labels */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/20">
            <span className="text-xs text-muted-foreground">
              {format(sentDate, "EEEE, MMMM d, yyyy 'at' h:mm:ss a")}
            </span>
          </div>
          
          {/* Message body */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {message.body_html ? (
              <div 
                dangerouslySetInnerHTML={{ __html: message.body_html }} 
                className="[&>*:first-child]:mt-0 [&>blockquote]:border-l-2 [&>blockquote]:border-muted-foreground/30 [&>blockquote]:pl-4 [&>blockquote]:text-muted-foreground"
              />
            ) : (
              <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {message.body_text || 'No content'}
              </p>
            )}
          </div>
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Paperclip className="h-4 w-4" />
                <span>{message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {message.attachments.map((att, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-border/30"
                  >
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Paperclip className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(att.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EmailReadingPane({
  thread,
  messages,
  loading,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onStar,
  onGenerateAIReply,
  isGeneratingAI,
}: EmailReadingPaneProps) {
  // Expand latest message by default, collapse older ones
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(messages.length > 0 ? [messages[messages.length - 1]?.id] : [])
  );

  const toggleMessage = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const providerMeta = PROVIDER_META[thread.provider];

  return (
    <div className="flex flex-col h-full">
      {/* Header with subject and primary actions */}
      <div className="px-6 py-4 border-b border-border/30 bg-card/20">
        {/* Subject line */}
        <div className="flex items-start gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {thread.subject || '(no subject)'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Provider badge */}
              <div 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${providerMeta.color}15`,
                  color: providerMeta.color 
                }}
              >
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: providerMeta.color }} />
                {providerMeta.name}
              </div>
              
              {/* Labels */}
              {thread.labels.map((label, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal rounded-full">
                  {label}
                </Badge>
              ))}
              
              {/* Message count */}
              <span className="text-xs text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {/* Star button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 flex-shrink-0"
            onClick={onStar}
          >
            <Star className={cn(
              "h-5 w-5",
              thread.is_starred && "fill-yellow-500 text-yellow-500"
            )} />
          </Button>
        </div>
        
        {/* Action bar */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onReply}>
            <Reply className="h-4 w-4" />
            Reply
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onReplyAll}>
            <ReplyAll className="h-4 w-4" />
            Reply All
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onForward}>
            <Forward className="h-4 w-4" />
            Forward
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* AI Reply button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5"
                onClick={onGenerateAIReply}
                disabled={isGeneratingAI}
              >
                <Sparkles className={cn("h-4 w-4", isGeneratingAI && "animate-pulse")} />
                AI Draft
              </Button>
            </TooltipTrigger>
            <TooltipContent>Let Arlo draft a reply</TooltipContent>
          </Tooltip>
          
          <div className="flex-1" />
          
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                Add label
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in {providerMeta.name}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">No messages in this thread</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {messages.map((message, index) => (
              <EmailMessageCard
                key={message.id}
                message={message}
                isExpanded={expandedMessages.has(message.id)}
                onToggle={() => toggleMessage(message.id)}
                isLatest={index === messages.length - 1}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
