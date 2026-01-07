import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, Check, X, Clock, Route as RouteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Place, RouteOption } from '@/types/maps';

interface DirectionsSheetProps {
  routes: RouteOption[];
  selectedRouteIndex: number;
  destination: Place | null;
  waypoints: Place[];
  onRouteSelect: (index: number) => void;
  onStartNavigation: () => void;
  onClose: () => void;
}

export function DirectionsSheet({
  routes,
  selectedRouteIndex,
  destination,
  waypoints,
  onRouteSelect,
  onStartNavigation,
  onClose,
}: DirectionsSheetProps) {
  const selectedRoute = routes[selectedRouteIndex];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">Routes</h2>
          {destination && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              to {destination.name}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 -mt-1 rounded-full hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Route Options */}
      {routes.length > 0 ? (
        <div className="space-y-2">
          {routes.map((route, index) => {
            const isSelected = index === selectedRouteIndex;
            const duration = typeof route.duration === 'number' ? route.duration : parseInt(route.duration) || 0;
            const durationMinutes = Math.round(duration / 60);
            const distanceKm = (typeof route.distance === 'number' ? route.distance / 1000 : parseFloat(route.distance)).toFixed(1);

            return (
              <motion.button
                key={route.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onRouteSelect(index)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all",
                  isSelected 
                    ? "bg-primary/10 ring-2 ring-primary" 
                    : "bg-secondary/50 hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {isSelected ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <RouteIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{durationMinutes}</span>
                    <span className="text-sm text-muted-foreground">min</span>
                    {route.durationInTraffic && route.durationInTraffic !== route.duration && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                        Traffic delay
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {distanceKm} km via {route.summary}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4 animate-pulse">
            <RouteIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Calculating routes...</p>
        </div>
      )}

      {/* Start Button */}
      {selectedRoute && (
        <Button 
          size="lg" 
          className="w-full gap-2 h-14 rounded-2xl text-lg font-semibold"
          onClick={onStartNavigation}
        >
          <Navigation className="w-5 h-5" />
          Start
        </Button>
      )}

      {/* Route Preview */}
      {selectedRoute && selectedRoute.steps.length > 0 && (
        <div className="pt-3 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-3">Preview</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedRoute.steps.slice(0, 4).map((step, index) => (
              <div key={index} className="flex gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  {index + 1}
                </div>
                <p className="text-muted-foreground truncate">{step.instruction}</p>
              </div>
            ))}
            {selectedRoute.steps.length > 4 && (
              <p className="text-xs text-muted-foreground/70 pl-9">
                +{selectedRoute.steps.length - 4} more steps
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
