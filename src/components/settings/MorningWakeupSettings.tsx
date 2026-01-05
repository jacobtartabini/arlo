import { useState } from 'react';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sun, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { 
  requestNotificationPermission, 
  getNotificationPermission,
  isPushSupported 
} from '@/lib/notifications/push';

export default function MorningWakeupSettings() {
  const { settings, updateSettings, isAuthenticated } = useUserSettings();
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (!isAuthenticated) {
      toast.error('Please log in to update settings');
      return;
    }

    if (enabled) {
      // Check notification permission when enabling
      const permission = getNotificationPermission();
      if (permission !== 'granted') {
        setIsRequestingPermission(true);
        const newPermission = await requestNotificationPermission();
        setIsRequestingPermission(false);
        
        if (newPermission !== 'granted') {
          toast.error('Notification permission required for morning wake-up');
          return;
        }
      }
    }

    await updateSettings({ morning_wakeup_enabled: enabled });
  };

  const handleTimeChange = async (time: string) => {
    if (!isAuthenticated) return;
    await updateSettings({ morning_wakeup_time: time });
  };

  const handleTestNotification = () => {
    if (!isPushSupported()) {
      toast.error('Notifications not supported on this device');
      return;
    }

    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      toast.error('Please enable notification permissions first');
      return;
    }

    new Notification('Good Morning! ☀️', {
      body: 'This is a test of your morning wake-up notification.',
      icon: '/icon-192x192.png',
      tag: 'morning-wakeup-test',
    });

    toast.success('Test notification sent!');
  };

  const notificationSupported = isPushSupported();
  const currentPermission = getNotificationPermission();

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Sun className="h-5 w-5 text-amber-500" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Morning Wake-Up</Label>
            <p className="text-xs text-muted-foreground">
              Daily notification to start your day
            </p>
          </div>
        </div>
        <Switch 
          checked={settings?.morning_wakeup_enabled ?? true}
          onCheckedChange={handleToggle}
          disabled={isRequestingPermission || !notificationSupported}
        />
      </div>

      {/* Time Picker */}
      {settings?.morning_wakeup_enabled && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Wake-Up Time</Label>
              <p className="text-xs text-muted-foreground">
                When to receive your morning notification
              </p>
            </div>
          </div>
          <Input
            type="time"
            value={settings?.morning_wakeup_time ?? '07:00'}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-28 bg-background/60"
          />
        </div>
      )}

      {/* Permission Status & Test */}
      {settings?.morning_wakeup_enabled && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {!notificationSupported ? (
              <span className="text-destructive">Notifications not supported</span>
            ) : currentPermission === 'granted' ? (
              <span className="text-green-500">✓ Notifications enabled</span>
            ) : currentPermission === 'denied' ? (
              <span className="text-destructive">Notifications blocked</span>
            ) : (
              <span className="text-amber-500">Permission required</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              disabled={currentPermission !== 'granted'}
            >
              Test
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/morning', '_blank')}
            >
              Preview
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}