import React from 'react';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import { APP_MODULES } from '@/lib/app-navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Move, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModuleLayout, DashboardModuleLayouts } from '@/types/settings';

interface DashboardLayoutSettingsProps {
  embedded?: boolean;
}

const GRID_SIZE = 48;

// Default positions based on priority
const getDefaultLayout = (moduleId: string): ModuleLayout => {
  const module = APP_MODULES.find(m => m.id === moduleId);
  if (!module) return { x: 0, y: 0, size: 'medium' };
  
  const index = APP_MODULES.filter(m => m.priority === module.priority).indexOf(module);
  
  if (module.priority === 'center') {
    return index === 0 
      ? { x: -4, y: -5, size: 'large' }
      : { x: 4, y: -4, size: 'large' };
  } else if (module.priority === 'inner') {
    const positions = [
      { x: -5, y: 2, size: 'medium' as const },
      { x: 1, y: 2, size: 'medium' as const },
      { x: 7, y: 2, size: 'medium' as const },
    ];
    return positions[index] || { x: 0, y: 0, size: 'medium' };
  } else {
    const positions = [
      { x: -7, y: -2, size: 'small' as const },
      { x: 10, y: -3, size: 'small' as const },
      { x: 11, y: 1, size: 'small' as const },
      { x: -8, y: 5, size: 'small' as const },
      { x: 6, y: 6, size: 'small' as const },
    ];
    return positions[index] || { x: 0, y: 0, size: 'small' };
  }
};

export default function DashboardLayoutSettings({ embedded = false }: DashboardLayoutSettingsProps) {
  const { settings, updateSettings, isAuthenticated } = useUserSettings();

  const getModuleLayout = (moduleId: string): ModuleLayout => {
    const saved = settings?.dashboard_module_layouts?.[moduleId];
    if (saved) return saved as ModuleLayout;
    return getDefaultLayout(moduleId);
  };

  const handleUpdateLayout = async (moduleId: string, updates: Partial<ModuleLayout>) => {
    if (!isAuthenticated || !settings) return;

    const currentLayouts = settings.dashboard_module_layouts || {};
    const currentLayout = getModuleLayout(moduleId);
    const newLayouts: DashboardModuleLayouts = {
      ...currentLayouts,
      [moduleId]: { ...currentLayout, ...updates },
    };

    await updateSettings({ dashboard_module_layouts: newLayouts });
  };

  const handleResetAll = async () => {
    if (!isAuthenticated) return;
    await updateSettings({ dashboard_module_layouts: {} });
  };

  const handleResetModule = async (moduleId: string) => {
    if (!isAuthenticated || !settings) return;

    const currentLayouts = settings?.dashboard_module_layouts 
      ? { ...settings.dashboard_module_layouts } 
      : {};
    delete currentLayouts[moduleId];
    await updateSettings({ dashboard_module_layouts: currentLayouts });
  };

  // Only show visible modules
  const visibleModules = APP_MODULES.filter(module => {
    const visibility = settings?.dashboard_module_visibility;
    return visibility?.[module.id] !== false;
  });

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Position values are in grid units ({GRID_SIZE}px each). Size affects module dimensions.
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleResetAll}
          className="text-xs h-7"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset All
        </Button>
      </div>
      
      <div className="space-y-3">
        {visibleModules.map((module) => {
          const Icon = module.icon;
          const layout = getModuleLayout(module.id);
          const hasCustomLayout = settings?.dashboard_module_layouts?.[module.id] !== undefined;
          
          return (
            <div
              key={module.id}
              className={cn(
                "p-3 rounded-lg border transition-all duration-200",
                hasCustomLayout 
                  ? "bg-primary/5 border-primary/20" 
                  : "bg-muted/10 border-border/20"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">{module.title}</Label>
                {hasCustomLayout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetModule(module.id)}
                    className="ml-auto h-6 text-xs px-2"
                  >
                    Reset
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">X Position</Label>
                  <Input
                    type="number"
                    value={layout.x}
                    onChange={(e) => handleUpdateLayout(module.id, { x: parseInt(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Y Position</Label>
                  <Input
                    type="number"
                    value={layout.y}
                    onChange={(e) => handleUpdateLayout(module.id, { y: parseInt(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Size</Label>
                  <Select
                    value={layout.size}
                    onValueChange={(value: 'small' | 'medium' | 'large') => 
                      handleUpdateLayout(module.id, { size: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="bg-background/40 backdrop-blur-md border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="h-5 w-5 text-primary" />
          Module Layout
        </CardTitle>
        <CardDescription>
          Manually position and size each dashboard module.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}