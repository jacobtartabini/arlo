import React, { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileSettingsView } from '@/components/mobile/views/MobileSettingsView';
import { useArlo } from '@/providers/ArloProvider';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import EnhancedThemeToggle from '@/components/EnhancedThemeToggle';
import CalendarIntegrations from '@/components/settings/CalendarIntegrations';
import InboxSettings from '@/components/settings/InboxSettings';
import MorningWakeupSettings from '@/components/settings/MorningWakeupSettings';
import DriveIntegrations from '@/components/settings/DriveIntegrations';
import DashboardVisibilitySettings from '@/components/settings/DashboardVisibilitySettings';
import DashboardLayoutSettings from '@/components/settings/DashboardLayoutSettings';
import VoiceSettings from '@/components/settings/VoiceSettings';
import TailscaleStatus from '@/components/settings/TailscaleStatus';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Bell,
  LogIn,
  Plug,
  ChevronDown,
  Mic,
  LayoutDashboard,
  Move,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SettingsSection({ icon: Icon, title, description, children, defaultOpen = false }: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center justify-between p-4 rounded-xl transition-all duration-200",
          "bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/70",
          isOpen && "rounded-b-none border-b-0"
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium">{title}</h3>
              {description && !isOpen && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn(
          "p-4 pt-3 rounded-b-xl border border-t-0 border-border/30",
          "bg-card/30 backdrop-blur-sm"
        )}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingToggle({ label, description, checked, onCheckedChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium cursor-pointer">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function Settings() {
  const isMobile = useIsMobile();
  const { isConnected } = useArlo();
  const { settings, isLoading, isAuthenticated, updateSettings } = useUserSettings();
  const navigate = useNavigate();

  // SEO
  useEffect(() => {
    document.title = "Settings – Arlo";
    const desc = "Configure Arlo settings including appearance, notifications, and integrations.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    if (meta) meta.content = desc;
  }, []);

  // Mobile view
  if (isMobile) {
    return <MobileSettingsView />;
  }

  const handleSettingToggle = async (key: keyof typeof settings, value: boolean) => {
    if (!isAuthenticated) {
      toast.error('Please log in to save settings');
      return;
    }
    await updateSettings({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 pt-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="p-4 rounded-full bg-muted/20 w-fit mx-auto">
            <LogIn className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Sign in required</h2>
          <p className="text-sm text-muted-foreground">
            Connect via Tailscale to access settings.
          </p>
          <Button onClick={() => navigate('/login')} className="mt-2">
            Connect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-24 relative">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            {isConnected && (
              <Badge variant="secondary" className="ml-auto text-xs bg-green-500/10 text-green-600 border-green-500/20">
                Connected
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground pl-12">
            Customize your Arlo experience
          </p>
        </header>

        <div className="space-y-3">
          {/* Appearance */}
          <SettingsSection 
            icon={Palette} 
            title="Appearance" 
            description="Theme and visual preferences"
            defaultOpen
          >
            <EnhancedThemeToggle />
          </SettingsSection>

          {/* Dashboard Visibility */}
          <SettingsSection 
            icon={LayoutDashboard} 
            title="Dashboard Visibility" 
            description="Show or hide modules"
          >
            <DashboardVisibilitySettings embedded />
          </SettingsSection>

          {/* Dashboard Layout */}
          <SettingsSection 
            icon={Move} 
            title="Module Layout" 
            description="Position and size each module"
          >
            <DashboardLayoutSettings embedded />
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection 
            icon={Bell} 
            title="Notifications" 
            description="Alerts and morning wake-up"
          >
            <div className="space-y-4">
              <MorningWakeupSettings />
              
              <div className="pt-3 border-t border-border/20 space-y-1">
                <SettingToggle
                  label="Push Notifications"
                  description="Receive push notifications"
                  checked={settings?.push_notifications_enabled ?? true}
                  onCheckedChange={(checked) => handleSettingToggle('push_notifications_enabled', checked)}
                />
                <SettingToggle
                  label="Sound"
                  description="Play sound for notifications"
                  checked={settings?.sound_enabled ?? true}
                  onCheckedChange={(checked) => handleSettingToggle('sound_enabled', checked)}
                />
                <SettingToggle
                  label="Email Notifications"
                  description="Receive email updates"
                  checked={settings?.email_notifications_enabled ?? false}
                  onCheckedChange={(checked) => handleSettingToggle('email_notifications_enabled', checked)}
                />
              </div>
            </div>
          </SettingsSection>

          {/* Voice */}
          <SettingsSection 
            icon={Mic} 
            title="Voice" 
            description="Voice mode and TTS settings"
          >
            <VoiceSettings embedded />
          </SettingsSection>

          {/* Integrations */}
          <SettingsSection 
            icon={Plug} 
            title="Integrations" 
            description="Calendar, inbox, and cloud storage"
          >
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Calendar</h4>
                <CalendarIntegrations embedded />
              </div>
              <div className="pt-4 border-t border-border/20">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Cloud Storage</h4>
                <DriveIntegrations embedded />
              </div>
              <div className="pt-4 border-t border-border/20">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Inbox</h4>
                <InboxSettings embedded />
              </div>
            </div>
          </SettingsSection>

          {/* Services */}
          <SettingsSection
            icon={Shield}
            title="Services"
            description="Internal connectivity (Tailscale)"
          >
            <TailscaleStatus embedded />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
