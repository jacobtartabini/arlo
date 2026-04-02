import React from 'react';
import { ChevronLeft, ChevronRight, Compass, MapPin, Navigation2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MapPin as MapPinType, Place } from '@/types/maps';
import type { PlaceSearchResult } from '@/services/mapService';
import { MapSearchInput } from './MapSearchInput';
import type { PlacePrediction } from '@/types/maps';

interface MapSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  predictions: PlacePrediction[];
  onPredictionSelect: (prediction: PlacePrediction) => void;
  searchResults: PlaceSearchResult[];
  isSearching: boolean;
  selectedPlaceId: string | null;
  onPlaceSelect: (place: Place) => void;
  selectedPlace: Place | null;
  onDirections: (place: Place) => void;
  onSavePlace: (place: Place) => void;
  pins: MapPinType[];
  pinsUnavailable?: boolean;
  pinsUnavailableReason?: string | null;
  selectedPinId: string | null;
  onPinSelect: (pin: MapPinType) => void;
  onPinEdit: (pin: MapPinType) => void;
  onPinDelete: (pin: MapPinType) => void;
}

export function MapSidebar({
  collapsed,
  onToggle,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  predictions,
  onPredictionSelect,
  searchResults,
  isSearching,
  selectedPlaceId,
  onPlaceSelect,
  selectedPlace,
  onDirections,
  onSavePlace,
  pins,
  pinsUnavailable,
  pinsUnavailableReason,
  selectedPinId,
  onPinSelect,
  onPinEdit,
  onPinDelete,
}: MapSidebarProps) {
  return (
    <aside
      className={cn(
        'relative hidden h-full flex-col border-r border-border/60 bg-background/95 backdrop-blur-lg transition-all duration-300 lg:flex',
        collapsed ? 'w-16' : 'w-96'
      )}
    >
      <div className={cn('flex items-center justify-between px-4 py-4', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2">
              <Compass className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Explore Maps</h2>
              <p className="text-xs text-muted-foreground">Search, save, and drop pins</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-4 px-4 pb-4">
          <MapSearchInput
            value={searchQuery}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
            onClear={onSearchClear}
            isLoading={isSearching}
            predictions={predictions}
            onPredictionSelect={onPredictionSelect}
            placeholder="Search for coffee, Target, parks…"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Results</h3>
              <span className="text-xs text-muted-foreground">{searchResults.length}</span>
            </div>
            <ScrollArea className="h-56 pr-3">
              {searchResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Search for places to see results here.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((place) => (
                    <Card
                      key={place.placeId}
                      className={cn(
                        'cursor-pointer border border-transparent p-3 transition hover:border-primary/40',
                        selectedPlaceId === place.placeId && 'border-primary/70 bg-primary/5'
                      )}
                      onClick={() => onPlaceSelect(place)}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{place.name}</p>
                        <p className="text-xs text-muted-foreground">{place.address}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {place.rating !== undefined && <span>⭐ {place.rating.toFixed(1)}</span>}
                          {place.openNow !== undefined && (
                            <span className={place.openNow ? 'text-emerald-600' : 'text-rose-500'}>
                              {place.openNow ? 'Open' : 'Closed'}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saved Pins</h3>
              <span className="text-xs text-muted-foreground">{pins.length}</span>
            </div>
            <ScrollArea className="h-48 pr-3">
              {pinsUnavailable ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Saved pins are unavailable.
                  {pinsUnavailableReason ? <div className="mt-2 text-xs">{pinsUnavailableReason}</div> : null}
                </div>
              ) : pins.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                  No saved pins yet. Drop a pin to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {pins.map((pin) => (
                    <Card
                      key={pin.id}
                      className={cn(
                        'flex items-start justify-between gap-2 p-3 transition hover:border-primary/40',
                        selectedPinId === pin.id && 'border-primary/70 bg-primary/5'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onPinSelect(pin)}
                        className="flex flex-1 flex-col text-left"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold">{pin.title}</p>
                        </div>
                        {pin.note && <p className="text-xs text-muted-foreground mt-1">{pin.note}</p>}
                      </button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onPinEdit(pin)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onPinDelete(pin)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
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
              {selectedPlace.phoneNumber && (
                <p className="text-xs text-muted-foreground">{selectedPlace.phoneNumber}</p>
              )}
              {selectedPlace.website && (
                <a
                  href={selectedPlace.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  {selectedPlace.website}
                </a>
              )}
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
      )}
    </aside>
  );
}
