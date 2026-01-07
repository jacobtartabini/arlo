import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageCircle, Calendar as CalendarIcon, Settings as SettingsIcon, Mail, Bell, ExternalLink, LucideIcon } from "lucide-react";
import { ExpandableTabs, TabItem } from "@/components/ui/expandable-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/providers/NotificationsProvider";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NavTabWithPath {
  title: string;
  icon: LucideIcon;
  path: string;
}

interface NavSeparator {
  type: "separator";
}

type NavTab = NavTabWithPath | NavSeparator;

function isNavSeparator(item: NavTab): item is NavSeparator {
  return "type" in item && item.type === "separator";
}

// Notification Bell Component with hover popover
function NavNotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 5);

  const handleViewAll = () => {
    setIsOpen(false);
    navigate("/notifications");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center justify-center rounded-xl px-2 py-2 text-sm font-medium transition-colors duration-300",
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onMouseEnter={() => setIsOpen(true)}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center p-0 text-[9px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={12}
        className="w-80 p-0 overflow-hidden"
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <h4 className="text-sm font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead()}
            >
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="p-2 space-y-1">
              {recentNotifications.map((notification) => (
                <button
                  key={notification.id}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg transition-colors",
                    notification.read
                      ? "bg-transparent hover:bg-muted/50"
                      : "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                  )}
                  onClick={() => {
                    if (!notification.read) markAsRead(notification.id);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs truncate",
                        notification.read ? "text-foreground" : "text-foreground font-medium"
                      )}>
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="p-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs h-8"
            onClick={handleViewAll}
          >
            View all notifications
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const navTabsBase: NavTab[] = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Inbox", icon: Mail, path: "/inbox" },
  { title: "Chat", icon: MessageCircle, path: "/chat" },
  { title: "Calendar", icon: CalendarIcon, path: "/calendar" },
  { type: "separator" },
];

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Build expandable tabs with notification bell and settings
  const expandableTabs: TabItem[] = [
    ...navTabsBase.map(tab => 
      isNavSeparator(tab) 
        ? { type: "separator" as const }
        : { title: tab.title, icon: tab.icon }
    ),
    { type: "custom" as const, render: () => <NavNotificationBell /> },
    { title: "Settings", icon: SettingsIcon },
  ];

  // Build paths array matching expandableTabs indices
  // Index: 0=Dashboard, 1=Inbox, 2=Chat, 3=Calendar, 4=separator, 5=notification, 6=Settings
  const pathMap: (string | null)[] = [
    "/dashboard",  // 0
    "/inbox",      // 1
    "/chat",       // 2
    "/calendar",   // 3
    null,          // 4 - separator
    null,          // 5 - notification (custom)
    "/settings",   // 6
  ];

  // Find active index based on current path
  const activeIndex = React.useMemo(() => {
    const currentPath = location.pathname === "/" ? "/dashboard" : location.pathname;
    return pathMap.findIndex(p => p === currentPath);
  }, [location.pathname]);

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const path = pathMap[index];
    if (path) {
      navigate(path);
    }
  };

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
      <ExpandableTabs
        tabs={expandableTabs}
        activeIndex={activeIndex}
        onChange={handleTabChange}
        activeColor="text-primary"
      />
    </nav>
  );
}
