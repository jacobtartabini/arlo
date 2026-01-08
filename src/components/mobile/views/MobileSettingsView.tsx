import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Palette,
  Bell,
  Mic,
  Plug,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/providers/ThemeProvider";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import { useArlo } from "@/providers/ArloProvider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import CalendarIntegrations from "@/components/settings/CalendarIntegrations";
import InboxSettings from "@/components/settings/InboxSettings";
import DriveIntegrations from "@/components/settings/DriveIntegrations";
import MorningWakeupSettings from "@/components/settings/MorningWakeupSettings";
import { MobilePageLayout } from "../MobilePageLayout";

type SheetType = "theme" | "notifications" | "voice" | "integrations" | null;

export function MobileSettingsView() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { settings, isLoading, isAuthenticated, updateSettings } = useUserSettings();
  const { isConnected } = useArlo();
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  const handleSettingToggle = async (key: keyof typeof settings, value: boolean) => {
    if (!isAuthenticated) {
      toast.error('Please log in to save settings');
      return;
    }
    await updateSettings({ [key]: value });
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const settingsSections = [
    {
      id: 'theme',
      icon: Palette,
      label: 'Appearance',
      description: theme === 'system' ? 'System default' : theme === 'dark' ? 'Dark mode' : 'Light mode',
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      description: 'Alerts and wake-up',
    },
    {
      id: 'voice',
      icon: Mic,
      label: 'Voice',
      description: 'Voice mode settings',
    },
    {
      id: 'integrations',
      icon: Plug,
      label: 'Integrations',
      description: 'Calendar, inbox, storage',
    },
  ];

  return (
    <MobilePageLayout 
      title="Settings"
      subtitle={isConnected ? "Connected" : "Customize Arlo"}
      headerRight={
        isConnected && (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">
            Online
          </Badge>
        )
      }
    >
      <div className="space-y-3">
        {settingsSections.map((section, index) => (
          <motion.button
            key={section.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setActiveSheet(section.id as SheetType)}
            className="w-full p-4 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{section.label}</h3>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </motion.button>
        ))}

        {/* Dashboard Settings Link */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('/settings')}
          className="w-full p-4 rounded-xl bg-muted/30 border border-border/30 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-muted">
              <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-muted-foreground">More Settings</h3>
              <p className="text-sm text-muted-foreground/70">Dashboard layout, visibility</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </motion.button>
      </div>

      {/* Theme Sheet */}
      <Sheet open={activeSheet === "theme"} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-3 gap-3 pb-6">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <Icon className={cn(
                    "h-6 w-6",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary"
                  )}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Notifications Sheet */}
      <Sheet open={activeSheet === "notifications"} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl overflow-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 pb-6">
            <MorningWakeupSettings />
            
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">General</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive push notifications</p>
                </div>
                <Switch 
                  checked={settings?.push_notifications_enabled ?? true}
                  onCheckedChange={(checked) => handleSettingToggle('push_notifications_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound</p>
                  <p className="text-sm text-muted-foreground">Play notification sounds</p>
                </div>
                <Switch 
                  checked={settings?.sound_enabled ?? true}
                  onCheckedChange={(checked) => handleSettingToggle('sound_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive email updates</p>
                </div>
                <Switch 
                  checked={settings?.email_notifications_enabled ?? false}
                  onCheckedChange={(checked) => handleSettingToggle('email_notifications_enabled', checked)}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Voice Sheet */}
      <Sheet open={activeSheet === "voice"} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl overflow-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Settings
            </SheetTitle>
          </SheetHeader>
          
          <div className="pb-6">
            <p className="text-sm text-muted-foreground mb-4">
              Configure voice mode and text-to-speech settings in the full settings page.
            </p>
            <Button variant="outline" className="w-full" onClick={() => {
              setActiveSheet(null);
              navigate('/settings');
            }}>
              Open Voice Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Integrations Sheet */}
      <Sheet open={activeSheet === "integrations"} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Integrations
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 pb-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Calendar</h3>
              <CalendarIntegrations embedded />
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Cloud Storage</h3>
              <DriveIntegrations embedded />
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Inbox</h3>
              <InboxSettings embedded />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MobilePageLayout>
  );
}
