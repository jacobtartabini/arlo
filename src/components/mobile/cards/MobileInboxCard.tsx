import { motion } from "framer-motion";
import { Mail, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileModuleCard } from "../MobileModuleCard";
import { cn } from "@/lib/utils";

interface EmailPreview {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  isUnread: boolean;
  timestamp: Date;
}

interface MobileInboxCardProps {
  emails: EmailPreview[];
  unreadCount: number;
}

export function MobileInboxCard({ emails, unreadCount }: MobileInboxCardProps) {
  const navigate = useNavigate();

  if (emails.length === 0) {
    return null; // Don't show empty cards
  }

  return (
    <MobileModuleCard
      title="Inbox"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
      icon={Mail}
      onClick={() => navigate("/inbox")}
      actionLabel="View all"
      isCompact
    >
      <div className="space-y-1">
        {emails.slice(0, 3).map((email, index) => (
          <motion.div
            key={email.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-start gap-3 py-2 px-1 -mx-1 rounded-lg",
              "transition-colors hover:bg-muted/50"
            )}
          >
            {/* Unread indicator */}
            <div className="pt-1.5">
              <span className={cn(
                "block h-2 w-2 rounded-full",
                email.isUnread ? "bg-primary" : "bg-transparent"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm truncate",
                  email.isUnread ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                  {email.sender}
                </span>
              </div>
              <p className={cn(
                "text-sm truncate",
                email.isUnread ? "text-foreground" : "text-muted-foreground"
              )}>
                {email.subject}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {email.snippet}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </MobileModuleCard>
  );
}
