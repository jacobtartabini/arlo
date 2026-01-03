import React from 'react';
import { motion } from 'framer-motion';
import { X, Navigation, Clock, Route, Check } from 'lucide-react';
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
          <h2 className="text-xl font-semibold">Directions</h2>
          {destination && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              To: {destination.name}
            </p>
          )}
          {waypoints.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {waypoints.length} stop{waypoints.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
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
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onRouteSelect(index)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors",
                  isSelected 
                    ? "bg-primary/10 border-2 border-primary" 
                    : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {isSelected ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Route className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{durationMinutes} min</span>
                    {route.durationInTraffic && route.durationInTraffic !== route.duration && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600">
                        Traffic
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
        <div className="text-center py-8">
          <Route className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Calculating routes...</p>
        </div>
      )}

      {/* Start Navigation Button */}
      {selectedRoute && (
        <Button 
          size="lg" 
          className="w-full gap-2" 
          onClick={onStartNavigation}
        >
          <Navigation className="w-5 h-5" />
          Start
        </Button>
      )}

      {/* Route Details Preview */}
      {selectedRoute && selectedRoute.steps.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Route Preview
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedRoute.steps.slice(0, 5).map((step, index) => (
              <div key={index} className="flex gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{step.instruction}</p>
                  <p className="text-xs text-muted-foreground">
                    {step.distance} • {step.duration}
                  </p>
                </div>
              </div>
            ))}
            {selectedRoute.steps.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{selectedRoute.steps.length - 5} more steps
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
