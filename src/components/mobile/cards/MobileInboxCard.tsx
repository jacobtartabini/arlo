import { motion } from "framer-motion";
import { Mail, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface EmailPreview {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  isRead: boolean;
  time: string;
}

interface MobileInboxCardProps {
  unreadCount: number;
  emails: EmailPreview[];
}

export function MobileInboxCard({
  unreadCount = 0,
  emails = [],
}: MobileInboxCardProps) {
  const navigate = useNavigate();

  if (emails.length === 0 && unreadCount === 0) {
    return null;
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate("/inbox")}
      className="rounded-2xl bg-card border border-border/50 overflow-hidden cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="text-[15px] font-semibold text-foreground">Inbox</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {/* Email previews */}
      {emails.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {emails.slice(0, 2).map((email) => (
            <div
              key={email.id}
              className={cn(
                "py-2 px-3 -mx-1 rounded-xl transition-colors",
                !email.isRead && "bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={cn(
                  "text-[13px] truncate",
                  email.isRead ? "text-muted-foreground" : "font-semibold text-foreground"
                )}>
                  {email.sender}
                </span>
                <span className="text-[11px] text-muted-foreground/70 flex-shrink-0 ml-2">
                  {email.time}
                </span>
              </div>
              <p className={cn(
                "text-[12px] truncate",
                email.isRead ? "text-muted-foreground/70" : "text-muted-foreground"
              )}>
                {email.subject}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {emails.length === 0 && unreadCount > 0 && (
        <div className="px-4 pb-4">
          <p className="text-[13px] text-muted-foreground">
            You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </motion.div>
  );
}
