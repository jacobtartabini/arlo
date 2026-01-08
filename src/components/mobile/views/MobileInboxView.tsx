import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Mail, Search, RefreshCw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInboxThreads, useInboxAccounts } from "@/hooks/useInboxPersistence";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

export function MobileInboxView() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { accounts, loading: accountsLoading } = useInboxAccounts();
  const { threads, loading: threadsLoading, refetch } = useInboxThreads({
    filter: 'all',
    providers: [],
    accountIds: [],
    searchQuery,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const filteredThreads = threads.filter(t => !t.is_archived);
  const unreadCount = filteredThreads.filter(t => t.unread_count > 0).length;

  const loading = accountsLoading || threadsLoading;
  const hasNoAccounts = !accountsLoading && accounts.length === 0;

  if (loading && threads.length === 0) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-12 bg-muted rounded-xl" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (hasNoAccounts) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">No email accounts</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your email to get started
        </p>
        <button
          onClick={() => navigate("/settings?tab=inbox")}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
        >
          Connect Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search emails..."
          className="w-full pl-10 pr-12 py-3 rounded-xl bg-muted/50 text-[15px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin")} />
        </button>
      </div>

      {/* Unread count */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">
            {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Email list */}
      <div className="space-y-2">
        {filteredThreads.slice(0, 20).map((thread, index) => {
          const isUnread = thread.unread_count > 0;
          const sender = thread.participants?.[0] || { name: "Unknown", email: "" };
          const senderName = typeof sender === 'string' ? sender : (sender.name || sender.email || "Unknown");

          return (
            <motion.button
              key={thread.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => navigate(`/inbox?thread=${thread.id}`)}
              className={cn(
                "flex items-start gap-3 w-full p-4 rounded-xl text-left",
                "bg-card border border-border/50",
                "transition-all active:scale-[0.98]",
                isUnread && "bg-primary/5 border-primary/20"
              )}
            >
              {/* Unread indicator */}
              <div className="pt-1.5">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isUnread ? "bg-primary" : "bg-transparent"
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={cn(
                    "text-[15px] truncate",
                    isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}>
                    {senderName}
                  </span>
                  <span className="text-xs text-muted-foreground/70 flex-shrink-0">
                    {thread.last_message_at && formatDate(thread.last_message_at)}
                  </span>
                </div>
                <p className={cn(
                  "text-[14px] truncate",
                  isUnread ? "text-foreground" : "text-muted-foreground"
                )}>
                  {thread.subject || "(No subject)"}
                </p>
                <p className="text-[13px] text-muted-foreground/70 truncate mt-0.5">
                  {thread.snippet}
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground/30 flex-shrink-0 mt-1" />
            </motion.button>
          );
        })}

        {filteredThreads.length === 0 && (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No emails found</p>
          </div>
        )}
      </div>
    </div>
  );
}
