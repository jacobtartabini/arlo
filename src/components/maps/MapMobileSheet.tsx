import React from 'react';
import { ChevronDown, ChevronUp, Clock, MapPin, Navigation2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MapPin as MapPinType, Place, RouteOption } from '@/types/maps';
import type { PlaceSearchResult } from '@/services/mapService';

interface MapMobileSheetProps {
  expanded: boolean;
  onToggle: () => void;
  results: PlaceSearchResult[];
  pins: MapPinType[];
  selectedPlaceId: string | null;
  onPlaceSelect: (place: Place) => void;
  onPinSelect: (pin: MapPinType) => void;
  selectedPlace: Place | null;
  onDirections: (place: Place) => void;
  onSavePlace: (place: Place) => void;
  isNavigating?: boolean;
  activeRoute?: RouteOption | null;
  navigationState?: {
    currentStepIndex: number;
    estimatedArrival: string | null;
    remainingDistance: string | null;
    remainingDuration: string | null;
  } | null;
  onEndNavigation?: () => void;
}

export function MapMobileSheet({
  expanded,
  onToggle,
  results,
  pins,
  selectedPlaceId,
  onPlaceSelect,
  onPinSelect,
  selectedPlace,
  onDirections,
  onSavePlace,
  isNavigating,
  activeRoute,
  navigationState,
  onEndNavigation,
}: MapMobileSheetProps) {
  if (isNavigating && activeRoute && navigationState) {
    const currentStep = activeRoute.steps[navigationState.currentStepIndex];
    const nextStep = activeRoute.steps[navigationState.currentStepIndex + 1];

    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border border-border bg-background/95 shadow-2xl backdrop-blur lg:hidden">
        <div className="px-4 pb-6 pt-4 space-y-3">
          <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Navigation2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold">{currentStep?.distance || '--'}</p>
                <p className="text-sm opacity-90 truncate">
                  {currentStep?.instruction || 'Continue on route'}
                </p>
              </div>
            </div>
          </div>

          {nextStep && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                Then
              </div>
              <p className="text-xs truncate flex-1 text-muted-foreground">{nextStep.instruction}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-xl bg-secondary/50">
              <Clock className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-base font-bold">{navigationState.estimatedArrival || '--'}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Arrival</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-secondary/50">
              <Navigation2 className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-base font-bold">{navigationState.remainingDistance || '--'}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Left</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-secondary/50">
              <MapPin className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-base font-bold">{navigationState.remainingDuration || '--'}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Time</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 h-10 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={onEndNavigation}
          >
            <X className="w-4 h-4" />
            End Navigation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border border-border bg-background/95 shadow-2xl backdrop-blur transition-all duration-300 lg:hidden',
        expanded ? 'h-[65vh]' : 'h-24'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="mx-auto mt-3 flex items-center gap-2 text-xs text-muted-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
        {expanded ? 'Collapse' : 'Expand'}
      </button>
      {expanded && (
        <div className="px-4 pb-6 pt-4">
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Results</h3>
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Search for places to see results here.
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((place) => (
                    <Card
                      key={place.placeId}
                      className={cn(
                        'cursor-pointer border border-transparent p-3 transition',
                        selectedPlaceId === place.placeId && 'border-primary/70 bg-primary/5'
                      )}
                      onClick={() => onPlaceSelect(place)}
                    >
                      <p className="text-sm font-semibold">{place.name}</p>
                      <p className="text-xs text-muted-foreground">{place.address}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {place.rating !== undefined && <span>⭐ {place.rating.toFixed(1)}</span>}
                        {place.openNow !== undefined && (
                          <span className={place.openNow ? 'text-emerald-600' : 'text-rose-500'}>
                            {place.openNow ? 'Open' : 'Closed'}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saved Pins</h3>
              {pins.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Drop a pin to save your favorite spots.
                </div>
              ) : (
                <div className="space-y-2">
                  {pins.map((pin) => (
                    <Card
                      key={pin.id}
                      className="flex items-start gap-2 p-3"
                      onClick={() => onPinSelect(pin)}
                    >
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">{pin.title}</p>
                        {pin.note && <p className="text-xs text-muted-foreground">{pin.note}</p>}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {selectedPlace && (
              <Card className="space-y-3 border border-border/60 p-4">
                <div>
                  <p className="text-base font-semibold">{selectedPlace.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {selectedPlace.rating !== undefined && <span>⭐ {selectedPlace.rating.toFixed(1)}</span>}
                  {selectedPlace.openNow !== undefined && (
                    <span className={selectedPlace.openNow ? 'text-emerald-600' : 'text-rose-500'}>
                      {selectedPlace.openNow ? 'Open now' : 'Closed'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => onSavePlace(selectedPlace)} className="flex-1">
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => onDirections(selectedPlace)} className="flex-1">
                    <Navigation2 className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
