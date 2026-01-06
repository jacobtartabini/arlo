import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Zap, Battery, BatteryLow, Settings2, Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnergyLevel } from "@/types/productivity";

interface EnergyPattern {
  id: string;
  startHour: number;
  endHour: number;
  level: EnergyLevel;
  label: string;
}

interface EnergySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (patterns: EnergyPattern[]) => void;
}

const DEFAULT_PATTERNS: EnergyPattern[] = [
  { id: '1', startHour: 6, endHour: 9, level: 'high', label: 'Early Morning' },
  { id: '2', startHour: 9, endHour: 12, level: 'high', label: 'Morning' },
  { id: '3', startHour: 12, endHour: 14, level: 'medium', label: 'Midday' },
  { id: '4', startHour: 14, endHour: 16, level: 'low', label: 'Afternoon Dip' },
  { id: '5', startHour: 16, endHour: 19, level: 'medium', label: 'Late Afternoon' },
  { id: '6', startHour: 19, endHour: 22, level: 'low', label: 'Evening' },
  { id: '7', startHour: 22, endHour: 6, level: 'low', label: 'Night' },
];

const ENERGY_CONFIG: Record<EnergyLevel, { icon: typeof Zap; label: string; color: string; bgColor: string }> = {
  high: { icon: Zap, label: 'High', color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  medium: { icon: Battery, label: 'Medium', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  low: { icon: BatteryLow, label: 'Low', color: 'text-muted-foreground', bgColor: 'bg-muted-foreground' },
};

const STORAGE_KEY = 'arlo-energy-patterns';

export function getEnergyForHour(hour: number, patterns?: EnergyPattern[]): EnergyLevel {
  const pats = patterns || loadEnergyPatterns();
  for (const pattern of pats) {
    if (pattern.startHour <= pattern.endHour) {
      if (hour >= pattern.startHour && hour < pattern.endHour) {
        return pattern.level;
      }
    } else {
      // Wraps around midnight
      if (hour >= pattern.startHour || hour < pattern.endHour) {
        return pattern.level;
      }
    }
  }
  return 'medium';
}

export function loadEnergyPatterns(): EnergyPattern[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load energy patterns:', e);
  }
  return DEFAULT_PATTERNS;
}

export function saveEnergyPatterns(patterns: EnergyPattern[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  } catch (e) {
    console.error('Failed to save energy patterns:', e);
  }
}

export function EnergySettings({ open, onOpenChange, onSave }: EnergySettingsProps) {
  const [patterns, setPatterns] = useState<EnergyPattern[]>(DEFAULT_PATTERNS);

  useEffect(() => {
    if (open) {
      setPatterns(loadEnergyPatterns());
    }
  }, [open]);

  const handleLevelChange = (patternId: string, newLevel: EnergyLevel) => {
    setPatterns(prev => prev.map(p => 
      p.id === patternId ? { ...p, level: newLevel } : p
    ));
  };

  const handleSave = () => {
    saveEnergyPatterns(patterns);
    onSave?.(patterns);
    onOpenChange(false);
  };

  const handleReset = () => {
    setPatterns(DEFAULT_PATTERNS);
  };

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}${ampm}`;
  };

  // Generate 24-hour timeline visualization
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Energy Patterns
          </DialogTitle>
          <DialogDescription>
            Configure your typical energy levels throughout the day for better task suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Visual Timeline */}
          <div className="space-y-2">
            <Label>24-Hour Overview</Label>
            <div className="flex h-8 rounded-lg overflow-hidden border border-border">
              {hours.map((hour) => {
                const level = getEnergyForHour(hour, patterns);
                return (
                  <div
                    key={hour}
                    className={cn(
                      "flex-1 transition-colors",
                      ENERGY_CONFIG[level].bgColor,
                      level === 'high' ? 'opacity-80' : level === 'medium' ? 'opacity-50' : 'opacity-30'
                    )}
                    title={`${formatHour(hour)}: ${ENERGY_CONFIG[level].label} energy`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>12AM</span>
              <span>6AM</span>
              <span>12PM</span>
              <span>6PM</span>
              <span>12AM</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4">
            {(['high', 'medium', 'low'] as EnergyLevel[]).map((level) => {
              const config = ENERGY_CONFIG[level];
              const Icon = config.icon;
              return (
                <div key={level} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("w-3 h-3 rounded", config.bgColor, level === 'high' ? 'opacity-80' : level === 'medium' ? 'opacity-50' : 'opacity-30')} />
                  <Icon className={cn("h-3 w-3", config.color)} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              );
            })}
          </div>

          {/* Time Block Settings */}
          <div className="space-y-3">
            <Label>Time Blocks</Label>
            {patterns.map((pattern) => {
              const config = ENERGY_CONFIG[pattern.level];
              const Icon = config.icon;
              
              return (
                <Card key={pattern.id} className="p-3 border-border/60">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", config.bgColor + '/20')}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{pattern.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatHour(pattern.startHour)} – {formatHour(pattern.endHour)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {(['high', 'medium', 'low'] as EnergyLevel[]).map((level) => {
                        const levelConfig = ENERGY_CONFIG[level];
                        const LevelIcon = levelConfig.icon;
                        return (
                          <button
                            key={level}
                            onClick={() => handleLevelChange(pattern.id, level)}
                            className={cn(
                              "p-1.5 rounded-md transition-all",
                              pattern.level === level 
                                ? levelConfig.bgColor + '/20 ring-2 ring-offset-1 ring-' + levelConfig.bgColor.replace('bg-', '')
                                : "hover:bg-muted/50"
                            )}
                          >
                            <LevelIcon className={cn("h-4 w-4", pattern.level === level ? levelConfig.color : "text-muted-foreground/50")} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="h-4 w-4" />
              Save Patterns
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
