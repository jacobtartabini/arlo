import { Archive, Trash2, Tag, Mail, MailOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionBarProps {
  selectedCount: number;
  onArchive: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onAddLabel: (label: string) => void;
  onClearSelection: () => void;
  availableLabels: string[];
}

export function BulkActionBar({
  selectedCount,
  onArchive,
  onDelete,
  onMarkRead,
  onMarkUnread,
  onAddLabel,
  onClearSelection,
  availableLabels,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium text-primary">
            {selectedCount} selected
          </span>
          
          <div className="h-4 w-px bg-border/50 mx-2" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onArchive}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onMarkRead}
          >
            <MailOpen className="h-3.5 w-3.5" />
            Mark read
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onMarkUnread}
          >
            <Mail className="h-3.5 w-3.5" />
            Mark unread
          </Button>
          
          {availableLabels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Label
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableLabels.map((label) => (
                  <DropdownMenuItem
                    key={label}
                    onClick={() => onAddLabel(label)}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
