import React, { useEffect, useState } from 'react';
import { useArlo } from '@/providers/ArloProvider';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import EnhancedThemeToggle from '@/components/EnhancedThemeToggle';
import CalendarIntegrations from '@/components/settings/CalendarIntegrations';
import InboxSettings from '@/components/settings/InboxSettings';
import MorningWakeupSettings from '@/components/settings/MorningWakeupSettings';
import DriveIntegrations from '@/components/settings/DriveIntegrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { z } from 'zod';

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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Bot, 
  Shield, 
  Server, 
  Bell,
  Cpu,
  LogIn,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Settings() {
  const { config, setConfig, status, isConnected } = useArlo();
  const { settings, isLoading, isAuthenticated, updateSettings } = useUserSettings();
  const navigate = useNavigate();
  const [validationErrors, setValidationErrors] = useState<{ apiEndpoint?: string; apiToken?: string }>({});

  // SEO
  useEffect(() => {
    document.title = "Arlo";
    const desc = "Configure Arlo AI settings including appearance, privacy, notifications, and system preferences.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    if (meta) meta.content = desc;

    if (!document.querySelector('link[rel="canonical"]')) {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = window.location.href;
      document.head.appendChild(link);
    }
  }, []);

  const handleSaveConnectionConfig = async () => {
    // Validate inputs before saving
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

  const renderSettingsContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-background/40 backdrop-blur-md border border-border/30">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <Card className="bg-background/40 backdrop-blur-md border border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <LogIn className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Tailscale login required</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Please connect via Tailscale to access settings.
            </p>
            <Button onClick={() => navigate('/login')}>
              Connect
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        {/* Appearance Settings */}
        <section>
          <Card className="bg-background/40 backdrop-blur-md border border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the visual appearance and theme of the interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedThemeToggle />
            </CardContent>
          </Card>
        </section>

        {/* Calendar Integrations */}
        <section>
          <CalendarIntegrations />
        </section>

        {/* Cloud Storage Integrations */}
        <section>
          <DriveIntegrations />
        </section>

        {/* Inbox Integrations */}
        <section>
          <Card className="bg-background/40 backdrop-blur-md border border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Inbox Integrations
              </CardTitle>
              <CardDescription>
                Connect your email and messaging accounts to view all messages in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InboxSettings />
            </CardContent>
          </Card>
        </section>

        {/* AI Assistant Settings */}
        <section>
          <Card className="bg-background/40 backdrop-blur-md border border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Configure how Arlo AI behaves and responds to your queries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Voice Responses</Label>
                    <p className="text-xs text-muted-foreground">Enable audio responses from Arlo</p>
                  </div>
                  <Switch 
                    checked={settings?.voice_responses_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('voice_responses_enabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Proactive Suggestions</Label>
                    <p className="text-xs text-muted-foreground">Show contextual suggestions</p>
                  </div>
                  <Switch 
                    checked={settings?.proactive_suggestions_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('proactive_suggestions_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Learning Mode</Label>
                    <p className="text-xs text-muted-foreground">Allow Arlo to learn from interactions</p>
                  </div>
                  <Switch 
                    checked={settings?.learning_mode_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('learning_mode_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Connection & API Settings */}
        <section>
          <Card className="bg-background/40 backdrop-blur-md border border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Connection Settings
              </CardTitle>
              <CardDescription>
                Configure your connection to the Arlo AI backend services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endpoint">API Endpoint</Label>
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
                    className={`bg-background/60 backdrop-blur-md border-border/30 ${validationErrors.apiEndpoint ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.apiEndpoint && (
                    <p className="text-xs text-destructive">{validationErrors.apiEndpoint}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">API Token</Label>
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
                    className={`bg-background/60 backdrop-blur-md border-border/30 ${validationErrors.apiToken ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.apiToken && (
                    <p className="text-xs text-destructive">{validationErrors.apiToken}</p>
                  )}
                </div>
              </div>
              
              {status && (
                <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-border/20">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    System Status
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{Math.floor(status.uptime / 3600)}h</div>
                      <div className="text-muted-foreground">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{status.memory}%</div>
                      <div className="text-muted-foreground">Memory</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{status.cpu}%</div>
                      <div className="text-muted-foreground">CPU</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{status.modules.length}</div>
                      <div className="text-muted-foreground">Modules</div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleSaveConnectionConfig} className="w-full">
                Save Connection Settings
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Privacy & Security */}
        <section>
          <Card className="bg-background/40 backdrop-blur-md border border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Control your data privacy and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Data Collection</Label>
                    <p className="text-xs text-muted-foreground">Allow usage data collection</p>
                  </div>
                  <Switch 
                    checked={settings?.data_collection_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('data_collection_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Analytics</Label>
                    <p className="text-xs text-muted-foreground">Help improve Arlo with analytics</p>
                  </div>
                  <Switch 
                    checked={settings?.analytics_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('analytics_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">End-to-End Encryption</Label>
                    <p className="text-xs text-muted-foreground">Encrypt all communications</p>
                  </div>
                  <Switch 
                    checked={settings?.encryption_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('encryption_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Notifications */}
        <section>
          <Card className="bg-background/40 backdrop-blur-md border border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Morning Wake-Up Settings */}
              <div className="pb-6 border-b border-border/20">
                <h3 className="text-sm font-medium mb-4">Morning Wake-Up</h3>
                <MorningWakeupSettings />
              </div>

              {/* General Notification Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive push notifications</p>
                  </div>
                  <Switch 
                    checked={settings?.push_notifications_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('push_notifications_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive email updates</p>
                  </div>
                  <Switch 
                    checked={settings?.email_notifications_enabled ?? false}
                    onCheckedChange={(checked) => handleSettingToggle('email_notifications_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/20">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Sound</Label>
                    <p className="text-xs text-muted-foreground">Play sound for notifications</p>
                  </div>
                  <Switch 
                    checked={settings?.sound_enabled ?? true}
                    onCheckedChange={(checked) => handleSettingToggle('sound_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="max-w-4xl mx-auto space-y-8 relative pt-20">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-full bg-background/60 backdrop-blur-md border border-border/30">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Customize your Arlo AI experience</p>
          </div>
          {isConnected && (
            <Badge className="ml-auto bg-green-500/10 text-green-500 border-green-500/20">
              Connected
            </Badge>
          )}
        </header>

        <main className="space-y-8">
          {renderSettingsContent()}
        </main>
      </div>
    </div>
  );
}
