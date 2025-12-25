import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Settings, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useNotifications } from '@/providers/NotificationsProvider';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            <NotificationActions />
          </SheetTitle>
        </SheetHeader>
        <NotificationList onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function NotificationActions() {
  const { markAllAsRead, unreadCount } = useNotifications();

  return (
    <div className="flex items-center gap-1">
      {unreadCount > 0 && (
        <Button variant="ghost" size="sm" onClick={markAllAsRead}>
          <CheckCheck className="h-4 w-4 mr-1" />
          Mark all read
        </Button>
      )}
    </div>
  );
}

function NotificationList({ onClose }: { onClose: () => void }) {
  const { notifications, isLoading, markAsRead, archive } = useNotifications();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Bell className="h-10 w-10 mb-2 opacity-50" />
        <p>No notifications yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
      <div className="space-y-2 pr-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              'p-3 rounded-lg border transition-colors',
              notification.read
                ? 'bg-background border-border/50'
                : 'bg-muted/50 border-primary/20'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {notification.type}
                  </Badge>
                  {!notification.read && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                {notification.body && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {notification.body}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => archive(notification.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default NotificationBell;
