import { useState } from 'react';
import { 
  Inbox, 
  Star, 
  Send, 
  FileText, 
  AlertTriangle, 
  Trash2,
  ChevronDown,
  ChevronRight,
  Tag,
  Plus,
  Settings2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { InboxProvider, InboxThread, InboxAccount } from '@/types/inbox';
import { PROVIDER_META } from '@/types/inbox';
import { useNavigate } from 'react-router-dom';

export type SystemFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'spam' | 'trash';

interface InboxSidebarProps {
  accounts: InboxAccount[];
  threads: InboxThread[];
  activeFolder: SystemFolder;
  selectedLabels: string[];
  onFolderSelect: (folder: SystemFolder) => void;
  onLabelSelect: (label: string) => void;
  onComposeClick: () => void;
  lastSyncedAt?: string;
  isSyncing: boolean;
  onManualSync: () => void;
}

const SYSTEM_FOLDERS: { id: SystemFolder; icon: React.ReactNode; label: string }[] = [
  { id: 'inbox', icon: <Inbox className="h-4 w-4" />, label: 'Inbox' },
  { id: 'starred', icon: <Star className="h-4 w-4" />, label: 'Starred' },
  { id: 'sent', icon: <Send className="h-4 w-4" />, label: 'Sent' },
  { id: 'drafts', icon: <FileText className="h-4 w-4" />, label: 'Drafts' },
  { id: 'spam', icon: <AlertTriangle className="h-4 w-4" />, label: 'Spam' },
  { id: 'trash', icon: <Trash2 className="h-4 w-4" />, label: 'Trash' },
];

export function InboxSidebar({
  accounts,
  threads,
  activeFolder,
  selectedLabels,
  onFolderSelect,
  onLabelSelect,
  onComposeClick,
  lastSyncedAt,
  isSyncing,
  onManualSync,
}: InboxSidebarProps) {
  const navigate = useNavigate();
  const [labelsOpen, setLabelsOpen] = useState(true);

  // Calculate folder counts
  const folderCounts: Record<SystemFolder, number> = {
    inbox: threads.filter(t => !t.is_archived && t.unread_count > 0).length,
    starred: threads.filter(t => t.is_starred).length,
    sent: 0, // Would need outgoing message tracking
    drafts: 0, // Would come from drafts table
    spam: threads.filter(t => t.labels.includes('spam')).length,
    trash: threads.filter(t => t.labels.includes('trash')).length,
  };

  // Extract unique labels from threads
  const allLabels = Array.from(
    new Set(threads.flatMap(t => t.labels.filter(l => !['spam', 'trash', 'sent', 'drafts'].includes(l.toLowerCase()))))
  ).sort();

  const formatLastSynced = (dateStr?: string) => {
    if (!dateStr) return 'Never synced';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Back to dashboard */}
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-background/80 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </button>
      </div>

      {/* Compose button */}
      <div className="px-3 pb-3">
        <Button 
          onClick={onComposeClick}
          className="w-full justify-start gap-2 rounded-xl shadow-md"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Compose
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* System folders */}
        <div className="space-y-0.5 mb-4">
          {SYSTEM_FOLDERS.map((folder) => {
            const count = folderCounts[folder.id];
            const isActive = activeFolder === folder.id;
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderSelect(folder.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left group",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  isActive && "text-primary"
                )}>
                  {folder.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{folder.label}</span>
                {count > 0 && (
                  <Badge 
                    variant={isActive ? "default" : "secondary"} 
                    className={cn(
                      "h-5 min-w-5 text-xs px-1.5 rounded-full font-medium",
                      folder.id === 'inbox' && count > 0 && !isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Labels section */}
        {allLabels.length > 0 && (
          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              {labelsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Labels
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {allLabels.map((label) => {
                const isSelected = selectedLabels.includes(label);
                const count = threads.filter(t => t.labels.includes(label)).length;
                
                return (
                  <button
                    key={label}
                    onClick={() => onLabelSelect(label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
                      isSelected 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Tag className="h-4 w-4" />
                    <span className="flex-1 text-sm truncate">{label}</span>
                    {count > 0 && (
                      <span className="text-xs text-muted-foreground">{count}</span>
                    )}
                  </button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Connected accounts */}
        {accounts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Accounts
            </div>
            <div className="space-y-1">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <div 
                    className="h-2 w-2 rounded-full" 
                    style={{ backgroundColor: PROVIDER_META[account.provider].color }}
                  />
                  <span className="truncate text-xs">{account.account_email || account.account_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer with sync status */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button 
            onClick={onManualSync}
            disabled={isSyncing}
            className="hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : `Synced ${formatLastSynced(lastSyncedAt)}`}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => navigate('/settings?tab=inbox')}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
