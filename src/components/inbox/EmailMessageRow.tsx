import { useState } from 'react';
import { 
  Star, 
  Paperclip, 
  Reply,
  Forward,
  CornerUpRight
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InboxThread, InboxProvider } from '@/types/inbox';
import { PROVIDER_META } from '@/types/inbox';
import { format, isToday, isYesterday, isThisYear, isThisWeek } from 'date-fns';

interface EmailMessageRowProps {
  thread: InboxThread;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
  onStar: () => void;
}

function formatEmailTime(date: Date): string {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return format(date, 'EEE');
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MM/dd/yy');
}

export function EmailMessageRow({
  thread,
  isSelected,
  isChecked,
  onSelect,
  onCheck,
  onStar,
}: EmailMessageRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const primaryParticipant = thread.participants[0];
  const isUnread = thread.unread_count > 0;
  const timestamp = thread.last_message_at ? new Date(thread.last_message_at) : new Date();
  const hasAttachments = false; // Would need to check messages
  const hasReplied = false; // Would need message tracking
  const hasForwarded = false;
  
  const providerMeta = PROVIDER_META[thread.provider];

  return (
    <div 
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-border/20 transition-all",
        isSelected && "bg-primary/8",
        isChecked && !isSelected && "bg-muted/40",
        !isSelected && !isChecked && "hover:bg-muted/30",
        isUnread && "bg-card/60"
      )}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox - visible on hover or when checked */}
      <div 
        className={cn(
          "flex-shrink-0 w-6 flex items-center justify-center transition-opacity",
          !isHovered && !isChecked && "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => onCheck(checked as boolean)}
          className="h-4 w-4"
        />
      </div>

      {/* Star button */}
      <button
        onClick={(e) => { e.stopPropagation(); onStar(); }}
        className={cn(
          "flex-shrink-0 p-1 rounded transition-colors",
          thread.is_starred 
            ? "text-yellow-500" 
            : "text-muted-foreground/40 hover:text-yellow-500"
        )}
      >
        <Star className={cn("h-4 w-4", thread.is_starred && "fill-current")} />
      </button>

      {/* Sender - fixed width */}
      <div className="w-44 flex-shrink-0 flex items-center gap-2 min-w-0">
        {/* Unread indicator */}
        {isUnread && (
          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
        )}
        <span className={cn(
          "truncate text-sm",
          isUnread ? "font-semibold text-foreground" : "text-foreground/80"
        )}>
          {primaryParticipant?.name || primaryParticipant?.email || 'Unknown'}
        </span>
        {/* Provider indicator - subtle */}
        <div 
          className="h-1.5 w-1.5 rounded-full flex-shrink-0 opacity-60"
          style={{ backgroundColor: providerMeta.color }}
          title={providerMeta.name}
        />
      </div>

      {/* Subject + Snippet */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {/* Status icons */}
        <div className="flex-shrink-0 flex items-center gap-0.5">
          {hasReplied && <Reply className="h-3.5 w-3.5 text-muted-foreground/60" />}
          {hasForwarded && <CornerUpRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </div>
        
        {/* Subject */}
        <span className={cn(
          "truncate text-sm",
          isUnread ? "font-medium text-foreground" : "text-foreground/80"
        )}>
          {thread.subject || '(no subject)'}
        </span>
        
        {/* Separator */}
        <span className="text-muted-foreground/40 flex-shrink-0">—</span>
        
        {/* Snippet */}
        <span className="truncate text-sm text-muted-foreground/70">
          {thread.snippet || 'No preview available'}
        </span>
      </div>

      {/* Right side: attachment, labels, date */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Attachment indicator */}
        {hasAttachments && (
          <Paperclip className="h-4 w-4 text-muted-foreground/60" />
        )}
        
        {/* Labels (show first 2) */}
        {thread.labels.slice(0, 2).map((label, i) => (
          <Badge 
            key={i} 
            variant="outline" 
            className="text-xs px-1.5 py-0 h-5 font-normal rounded border-border/50"
          >
            {label}
          </Badge>
        ))}
        
        {/* Timestamp */}
        <span className={cn(
          "text-xs tabular-nums w-16 text-right",
          isUnread ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {formatEmailTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
