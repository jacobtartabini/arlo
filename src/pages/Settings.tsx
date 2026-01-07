import React, { useEffect, useState } from 'react';
import { useArlo } from '@/providers/ArloProvider';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import EnhancedThemeToggle from '@/components/EnhancedThemeToggle';
import CalendarIntegrations from '@/components/settings/CalendarIntegrations';
import InboxSettings from '@/components/settings/InboxSettings';
import MorningWakeupSettings from '@/components/settings/MorningWakeupSettings';
import DriveIntegrations from '@/components/settings/DriveIntegrations';
import DashboardVisibilitySettings from '@/components/settings/DashboardVisibilitySettings';
import VoiceSettings from '@/components/settings/VoiceSettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Bot, 
  Shield, 
  Server, 
  Bell,
  Cpu,
  LogIn,
  Plug,
  ChevronDown,
  Mic,
  LayoutDashboard
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Validation schema for connection settings
const connectionSettingsSchema = z.object({
  apiEndpoint: z.string()
    .max(255, 'API endpoint must be less than 255 characters')
    .refine(
      (val) => !val || val.startsWith('http://') || val.startsWith('https://'),
      'API endpoint must be a valid HTTP/HTTPS URL'
    ),
  apiToken: z.string()
    .max(500, 'API token must be less than 500 characters'),
});

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
  const { config, setConfig, status, isConnected } = useArlo();
  const { settings, isLoading, isAuthenticated, updateSettings } = useUserSettings();
  const navigate = useNavigate();
  const [validationErrors, setValidationErrors] = useState<{ apiEndpoint?: string; apiToken?: string }>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // SEO
  useEffect(() => {
    document.title = "Settings – Arlo";
    const desc = "Configure Arlo AI settings including appearance, privacy, notifications, and system preferences.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    if (meta) meta.content = desc;
  }, []);

  const handleSaveConnectionConfig = async () => {
    const result = connectionSettingsSchema.safeParse({
      apiEndpoint: config.apiEndpoint,
      apiToken: config.apiToken,
    });

    if (!result.success) {
      const errors: { apiEndpoint?: string; apiToken?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'apiEndpoint') errors.apiEndpoint = err.message;
        if (err.path[0] === 'apiToken') errors.apiToken = err.message;
      });
      setValidationErrors(errors);
      toast.error('Please fix validation errors');
      return;
    }

    setValidationErrors({});
    
    if (isAuthenticated && settings) {
      await updateSettings({
        api_endpoint: config.apiEndpoint,
        api_token: config.apiToken,
      });
    }
    toast.success('Connection settings saved');
  };

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

          {/* Dashboard */}
          <SettingsSection 
            icon={LayoutDashboard} 
            title="Dashboard" 
            description="Module visibility"
          >
            <DashboardVisibilitySettings embedded />
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

          {/* AI Assistant */}
          <SettingsSection 
            icon={Bot} 
            title="AI Assistant" 
            description="Arlo behavior preferences"
          >
            <div className="space-y-1">
              <SettingToggle
                label="Voice Responses"
                description="Enable audio responses from Arlo"
                checked={settings?.voice_responses_enabled ?? true}
                onCheckedChange={(checked) => handleSettingToggle('voice_responses_enabled', checked)}
              />
              <SettingToggle
                label="Proactive Suggestions"
                description="Show contextual suggestions"
                checked={settings?.proactive_suggestions_enabled ?? true}
                onCheckedChange={(checked) => handleSettingToggle('proactive_suggestions_enabled', checked)}
              />
              <SettingToggle
                label="Learning Mode"
                description="Allow Arlo to learn from interactions"
                checked={settings?.learning_mode_enabled ?? true}
                onCheckedChange={(checked) => handleSettingToggle('learning_mode_enabled', checked)}
              />
            </div>
          </SettingsSection>

          {/* Privacy */}
          <SettingsSection 
            icon={Shield} 
            title="Privacy & Security" 
            description="Data and encryption settings"
          >
            <div className="space-y-1">
              <SettingToggle
                label="Data Collection"
                description="Allow usage data collection"
                checked={settings?.data_collection_enabled ?? true}
                onCheckedChange={(checked) => handleSettingToggle('data_collection_enabled', checked)}
              />
              <SettingToggle
                label="Analytics"
                description="Help improve Arlo with analytics"
                checked={settings?.analytics_enabled ?? true}
                onCheckedChange={(checked) => handleSettingToggle('analytics_enabled', checked)}
              />
              <SettingToggle
                label="End-to-End Encryption"
                description="Encrypt all communications"
                checked={settings?.encryption_enabled ?? true}
                onCheckedChange={(checked) => handleSettingToggle('encryption_enabled', checked)}
              />
            </div>
          </SettingsSection>

          {/* Advanced - Connection Settings */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl transition-all duration-200",
                "bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/70",
                advancedOpen && "rounded-b-none border-b-0"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/30">
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-muted-foreground">Advanced</h3>
                    {!advancedOpen && (
                      <p className="text-xs text-muted-foreground/70">Connection and system settings</p>
                    )}
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  advancedOpen && "rotate-180"
                )} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className={cn(
                "p-4 pt-3 rounded-b-xl border border-t-0 border-border/30",
                "bg-card/30 backdrop-blur-sm space-y-4"
              )}>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endpoint" className="text-xs">API Endpoint</Label>
                    <Input
                      id="endpoint"
                      placeholder="http://100.64.0.1:8080"
                      value={config.apiEndpoint}
                      onChange={(e) => {
                        setConfig({ ...config, apiEndpoint: e.target.value });
                        if (validationErrors.apiEndpoint) {
                          setValidationErrors(prev => ({ ...prev, apiEndpoint: undefined }));
                        }
                      }}
                      maxLength={255}
                      className={cn(
                        "bg-background/60 h-9 text-sm",
                        validationErrors.apiEndpoint && "border-destructive"
                      )}
                    />
                    {validationErrors.apiEndpoint && (
                      <p className="text-xs text-destructive">{validationErrors.apiEndpoint}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-xs">API Token</Label>
                    <Input
                      id="token"
                      type="password"
                      placeholder="Enter your API token"
                      value={config.apiToken}
                      onChange={(e) => {
                        setConfig({ ...config, apiToken: e.target.value });
                        if (validationErrors.apiToken) {
                          setValidationErrors(prev => ({ ...prev, apiToken: undefined }));
                        }
                      }}
                      maxLength={500}
                      className={cn(
                        "bg-background/60 h-9 text-sm",
                        validationErrors.apiToken && "border-destructive"
                      )}
                    />
                    {validationErrors.apiToken && (
                      <p className="text-xs text-destructive">{validationErrors.apiToken}</p>
                    )}
                  </div>
                </div>

                {status && (
                  <div className="p-3 rounded-lg bg-muted/10 border border-border/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">System Status</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-sm font-semibold text-primary">{Math.floor(status.uptime / 3600)}h</div>
                        <div className="text-[10px] text-muted-foreground">Uptime</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-primary">{status.memory}%</div>
                        <div className="text-[10px] text-muted-foreground">Memory</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-primary">{status.cpu}%</div>
                        <div className="text-[10px] text-muted-foreground">CPU</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-primary">{status.modules.length}</div>
                        <div className="text-[10px] text-muted-foreground">Modules</div>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={handleSaveConnectionConfig} size="sm" className="w-full">
                  Save Connection Settings
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
