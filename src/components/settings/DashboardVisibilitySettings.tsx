import React from 'react';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import { APP_MODULES } from '@/lib/app-navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardVisibilitySettings() {
  const { settings, updateSettings, isAuthenticated } = useUserSettings();

  // Get visibility - default to true if not explicitly set
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

  return (
    <Card className="bg-background/40 backdrop-blur-md border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          Dashboard Visibility
        </CardTitle>
        <CardDescription>
          Choose which modules appear on your dashboard. Hidden modules can still be accessed via search or direct navigation.
        </CardDescription>
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
          <Eye className="h-4 w-4" />
          <span>{visibleCount} of {APP_MODULES.length} modules visible</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {APP_MODULES.map((module) => {
            const Icon = module.icon;
            const isVisible = getModuleVisibility(module.id);
            
            return (
              <div
                key={module.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-all duration-200",
                  isVisible 
                    ? "bg-muted/20 border-border/20" 
                    : "bg-muted/5 border-border/10 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isVisible ? "bg-primary/10" : "bg-muted/20"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      isVisible ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium cursor-pointer">
                      {module.title}
                    </Label>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {isVisible ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Hidden
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isVisible}
                  onCheckedChange={(checked) => handleToggleModule(module.id, checked)}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}