import React from 'react';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import { APP_MODULES } from '@/lib/app-navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardVisibilitySettingsProps {
  embedded?: boolean;
}

export default function DashboardVisibilitySettings({ embedded = false }: DashboardVisibilitySettingsProps) {
  const { settings, updateSettings, isAuthenticated } = useUserSettings();

  const getModuleVisibility = (moduleId: string): boolean => {
    return settings?.dashboard_module_visibility?.[moduleId] !== false;
  };

  const handleToggleModule = async (moduleId: string, visible: boolean) => {
    if (!isAuthenticated || !settings) return;

    const currentVisibility = settings.dashboard_module_visibility || {};
    const newVisibility = {
      ...currentVisibility,
      [moduleId]: visible,
    };

    await updateSettings({ dashboard_module_visibility: newVisibility });
  };

  const visibleCount = APP_MODULES.filter(m => getModuleVisibility(m.id)).length;

  const content = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>{visibleCount} of {APP_MODULES.length} modules visible</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {APP_MODULES.map((module) => {
          const Icon = module.icon;
          const isVisible = getModuleVisibility(module.id);
          
          return (
            <div
              key={module.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                isVisible 
                  ? "bg-muted/10 border-border/20" 
                  : "bg-transparent border-border/10 opacity-50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn(
                  "h-4 w-4",
                  isVisible ? "text-primary" : "text-muted-foreground"
                )} />
                <Label className="text-sm cursor-pointer">
                  {module.title}
                </Label>
              </div>
              <Switch
                checked={isVisible}
                onCheckedChange={(checked) => handleToggleModule(module.id, checked)}
              />
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground pt-1">
        Hidden modules can still be accessed via search or direct navigation.
      </p>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="bg-background/40 backdrop-blur-md border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          Dashboard Visibility
        </CardTitle>
        <CardDescription>
          Choose which modules appear on your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
