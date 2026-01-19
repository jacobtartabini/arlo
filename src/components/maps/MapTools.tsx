import React from 'react';
import { LocateFixed, Moon, Pin, Sun, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MapToolsProps {
  dropPinMode: boolean;
  onToggleDropPin: () => void;
  onLocateMe: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  mapStyle: 'light' | 'dark';
  onToggleStyle: () => void;
  isLocating?: boolean;
}

export function MapTools({
  dropPinMode,
  onToggleDropPin,
  onLocateMe,
  onZoomIn,
  onZoomOut,
  mapStyle,
  onToggleStyle,
  isLocating,
}: MapToolsProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background/90 p-2 shadow-lg backdrop-blur">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">Map Tools</span>
      <div className="flex flex-col gap-2">
        <Button
          variant={dropPinMode ? 'default' : 'outline'}
          size="icon"
          onClick={onToggleDropPin}
          className={cn(dropPinMode && 'shadow-md')}
        >
          <Pin className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLocateMe}
          disabled={isLocating}
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onToggleStyle}>
          {mapStyle === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
