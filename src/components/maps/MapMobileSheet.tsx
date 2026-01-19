import React from 'react';
import { ChevronDown, ChevronUp, MapPin, Navigation2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MapPin as MapPinType, Place } from '@/types/maps';
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
}: MapMobileSheetProps) {
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
