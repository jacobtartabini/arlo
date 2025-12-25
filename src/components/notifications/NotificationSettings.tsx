import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Monitor, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNotifications } from '@/providers/NotificationsProvider';
import {
  isPushSupported,
  isInstalledPWA,
  detectPlatform,
} from '@/lib/notifications/push';
import { notify, getCurrentUserId } from '@/lib/notifications/notify';

export function NotificationSettings() {
  const {
    pushPermission,
    isPushSupported: pushSupported,
    enablePush,
    disablePush,
  } = useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const platform = detectPlatform();
  const isInstalled = isInstalledPWA();

  const handleEnablePush = async () => {
    setIsEnabling(true);
    try {
      await enablePush();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisablePush = async () => {
    await disablePush();
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error('You must be logged in to send test notifications');
        return;
      }

      const result = await notify(userId, {
        type: 'system',
        title: 'Test Notification',
        body: 'This is a test notification from Arlo!',
        data: { test: true },
      });

      if (result.success) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Notifications Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushSupported ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <BellOff className="h-4 w-4" />
              <span>Push notifications are not supported in this browser</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Current status: {' '}
                    <Badge variant={pushPermission === 'granted' ? 'default' : 'secondary'}>
                      {pushPermission}
                    </Badge>
                  </p>
                </div>
                {pushPermission === 'granted' ? (
                  <Button variant="outline" onClick={handleDisablePush}>
                    Disable
                  </Button>
                ) : (
                  <Button onClick={handleEnablePush} disabled={isEnabling}>
                    {isEnabling ? 'Enabling...' : 'Enable'}
                  </Button>
                )}
              </div>

              {pushPermission === 'denied' && (
                <p className="text-sm text-destructive">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* PWA Installation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Install Arlo App
          </CardTitle>
          <CardDescription>
            Install Arlo as an app for the best notification experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={isInstalled ? 'default' : 'outline'}>
              {isInstalled ? 'Installed' : 'Not Installed'}
            </Badge>
            <Badge variant="outline">{platform}</Badge>
          </div>

          {!isInstalled && (
            <div className="space-y-3">
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Desktop / Android
                </h4>
                <p className="text-sm text-muted-foreground">
                  Click the install icon in your browser's address bar, or look for 
                  "Install Arlo" in the browser menu.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  iOS / iPadOS
                </h4>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Tap the Share button (square with arrow)</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                  <li>Open Arlo from your home screen</li>
                  <li>Enable push notifications inside the app</li>
                </ol>
              </div>
            </div>
          )}

          {isInstalled && platform.startsWith('pwa-') && (
            <p className="text-sm text-muted-foreground">
              Great! You're using the installed app. Push notifications will work even when the app is closed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Notification
          </CardTitle>
          <CardDescription>
            Send a test notification to verify everything is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSendTestNotification}
            disabled={isSendingTest}
            className="w-full"
          >
            {isSendingTest ? 'Sending...' : 'Send Test Notification'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationSettings;
