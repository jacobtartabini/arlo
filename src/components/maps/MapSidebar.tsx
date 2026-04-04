import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  Bus,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Navigation2,
  Pencil,
  Phone,
  Star,
  TrafficCone,
  Trash2,
  Waves,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MapPin as MapPinType, Place, RouteOption, LatLng } from '@/types/maps';
import type { PlaceSearchResult } from '@/services/mapService';
import { MapSearchInput } from './MapSearchInput';
import type { PlacePrediction } from '@/types/maps';

type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
type SidebarView = 'explore' | 'results' | 'place' | 'directions';

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
  onSavePlace: (place: Place) => void;
  pins: MapPinType[];
  pinsUnavailable?: boolean;
  pinsUnavailableReason?: string | null;
  selectedPinId: string | null;
  onPinSelect: (pin: MapPinType) => void;
  onPinEdit: (pin: MapPinType) => void;
  onPinDelete: (pin: MapPinType) => void;
  showTraffic: boolean;
  onToggleTraffic: () => void;
  directionsRoutes: RouteOption[];
  activeRoute: RouteOption | null;
  isGettingDirections: boolean;
  onGetDirections: (origin: string | LatLng, destination: string | LatLng, mode: TravelMode) => Promise<void>;
  onSelectRoute: (route: RouteOption) => void;
  onCancelDirections: () => void;
  userLocation: LatLng | null;
}

const TRAVEL_MODES: { mode: TravelMode; icon: React.ElementType; label: string }[] = [
  { mode: 'DRIVING', icon: Car, label: 'Drive' },
  { mode: 'WALKING', icon: () => <span className="text-xs font-bold">🚶</span>, label: 'Walk' },
  { mode: 'BICYCLING', icon: Bike, label: 'Bike' },
  { mode: 'TRANSIT', icon: Bus, label: 'Transit' },
];

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return miles < 0.1 ? `${Math.round(meters)} m` : `${miles.toFixed(1)} mi`;
}

function getPlaceTypeLabel(types?: string[]): string {
  if (!types?.length) return '';
  const labels: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Café',
    bar: 'Bar',
    store: 'Store',
    gym: 'Gym',
    hospital: 'Hospital',
    pharmacy: 'Pharmacy',
    park: 'Park',
    school: 'School',
    bank: 'Bank',
    gas_station: 'Gas Station',
    hotel: 'Hotel',
    museum: 'Museum',
    shopping_mall: 'Mall',
    supermarket: 'Supermarket',
    convenience_store: 'Convenience',
    movie_theater: 'Theater',
    library: 'Library',
  };
  for (const type of types) {
    if (labels[type]) return labels[type];
  }
  return types[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
  onSavePlace,
  pins,
  pinsUnavailable,
  pinsUnavailableReason,
  selectedPinId,
  onPinSelect,
  onPinEdit,
  onPinDelete,
  showTraffic,
  onToggleTraffic,
  directionsRoutes,
  activeRoute,
  isGettingDirections,
  onGetDirections,
  onSelectRoute,
  onCancelDirections,
  userLocation,
}: MapSidebarProps) {
  const [view, setView] = useState<SidebarView>('explore');
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');
  const [directionsOrigin, setDirectionsOrigin] = useState('Your location');
  const [directionsDestination, setDirectionsDestination] = useState('');
  const [directionsDestinationLocation, setDirectionsDestinationLocation] = useState<LatLng | null>(null);
  const hasInitiatedDirections = useRef(false);

  // Sync view based on parent state
  useEffect(() => {
    if (selectedPlace && view !== 'directions') {
      setView('place');
    }
  }, [selectedPlace]);

  useEffect(() => {
    if (!selectedPlace && searchResults.length === 0 && !isSearching && view === 'place') {
      setView('explore');
    }
  }, [selectedPlace, searchResults, isSearching]);

  useEffect(() => {
    if ((searchResults.length > 0 || isSearching) && view === 'explore') {
      setView('results');
    }
  }, [searchResults.length, isSearching]);

  useEffect(() => {
    if (searchResults.length === 0 && !isSearching && !selectedPlace && view === 'results') {
      setView('explore');
    }
  }, [searchResults.length, isSearching, selectedPlace]);

  const handleDirectionsClick = (place: Place) => {
    setDirectionsDestination(place.name);
    setDirectionsDestinationLocation(place.location);
    setDirectionsOrigin(userLocation ? 'Your location' : '');
    hasInitiatedDirections.current = false;
    setView('directions');
  };

  const handleGetDirections = async () => {
    if (!directionsDestination) return;
    const origin: string | LatLng = directionsOrigin === 'Your location' && userLocation
      ? userLocation
      : directionsOrigin;
    // Use stored coordinates when coming from a place selection; fall back to the string
    const destination: string | LatLng = directionsDestinationLocation ?? directionsDestination;
    await onGetDirections(origin, destination, travelMode);
    hasInitiatedDirections.current = true;
  };

  const handleCancelDirections = () => {
    onCancelDirections();
    setView(selectedPlace ? 'place' : searchResults.length > 0 ? 'results' : 'explore');
  };

  const handleBackToResults = () => {
    setView(searchResults.length > 0 ? 'results' : 'explore');
  };

  return (
    <aside
      className={cn(
        'relative hidden h-full flex-col border-r border-border/40 bg-background/98 backdrop-blur-xl transition-all duration-300 lg:flex shadow-sm',
        collapsed ? 'w-14' : 'w-[360px]'
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 pt-20 pb-3', collapsed && 'px-2 pt-20 justify-center')}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-1.5">
              <Compass className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Explore Maps</h2>
              <p className="text-[11px] text-muted-foreground">Search, save, and navigate</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 shrink-0">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search bar (always visible) */}
          <div className="px-4 pb-3">
            <MapSearchInput
              value={searchQuery}
              onChange={onSearchChange}
              onSubmit={() => { onSearchSubmit(); setView('results'); }}
              onClear={() => {
                onSearchClear();
                setView('explore');
              }}
              isLoading={isSearching}
              predictions={predictions}
              onPredictionSelect={(p) => { onPredictionSelect(p); }}
              placeholder="Search for coffee, Target, parks…"
            />
          </div>

          <ScrollArea className="flex-1 px-4 pb-6">
            {/* ── EXPLORE VIEW ── */}
            {view === 'explore' && (
              <div className="space-y-5">
                {/* Traffic Overview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Traffic
                    </h3>
                    <button
                      onClick={onToggleTraffic}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                        showTraffic ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform',
                          showTraffic ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                  <Card className="p-3 border-border/50">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                        showTraffic ? 'bg-emerald-500/15' : 'bg-muted'
                      )}>
                        <TrafficCone className={cn('h-4 w-4', showTraffic ? 'text-emerald-600' : 'text-muted-foreground')} />
                      </div>
                      <div>
                        <p className="text-xs font-medium">
                          {showTraffic ? 'Live traffic enabled' : 'Traffic layer off'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {showTraffic ? 'Traffic conditions shown on map' : 'Toggle to see real-time traffic'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Saved Pins */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Saved Pins
                    </h3>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{pins.length}</span>
                  </div>
                  {pinsUnavailable ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
                      Saved pins are unavailable.
                      {pinsUnavailableReason && <div className="mt-1 opacity-70">{pinsUnavailableReason}</div>}
                    </div>
                  ) : pins.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center">
                      <MapPin className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1.5" />
                      <p className="text-xs text-muted-foreground">No saved pins yet.</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">Drop a pin to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {pins.map((pin) => (
                        <Card
                          key={pin.id}
                          className={cn(
                            'flex items-start justify-between gap-2 p-2.5 cursor-pointer transition-all hover:border-primary/40',
                            selectedPinId === pin.id && 'border-primary/60 bg-primary/5'
                          )}
                          onClick={() => onPinSelect(pin)}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
                              <MapPin className="h-3.5 w-3.5 text-orange-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{pin.title}</p>
                              {pin.note && <p className="text-[11px] text-muted-foreground truncate">{pin.note}</p>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); onPinEdit(pin); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); onPinDelete(pin); }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── RESULTS VIEW ── */}
            {view === 'results' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Results
                  </h3>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{searchResults.length}</span>
                </div>
                {isSearching && searchResults.length === 0 ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-[72px] rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 text-center">
                    <Waves className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
                    <p className="text-sm text-muted-foreground">No results found.</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Try a different search term.</p>
                  </div>
                ) : (
                  searchResults.map((place) => {
                    const isSelected = place.placeId === selectedPlaceId;
                    const typeLabel = getPlaceTypeLabel(place.types);
                    return (
                      <Card
                        key={place.placeId}
                        className={cn(
                          'cursor-pointer p-3 transition-all hover:border-primary/40 hover:shadow-sm',
                          isSelected && 'border-primary/60 bg-primary/5 shadow-sm'
                        )}
                        onClick={() => { onPlaceSelect(place); setView('place'); }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 mt-0.5">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight truncate">{place.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{place.address}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {typeLabel && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {typeLabel}
                                </Badge>
                              )}
                              {place.rating !== undefined && (
                                <span className="flex items-center gap-0.5 text-[11px] text-amber-500 font-medium">
                                  <Star className="h-2.5 w-2.5 fill-current" />
                                  {place.rating.toFixed(1)}
                                </span>
                              )}
                              {place.openNow !== undefined && (
                                <span className={cn(
                                  'text-[11px] font-medium',
                                  place.openNow ? 'text-emerald-600' : 'text-rose-500'
                                )}>
                                  {place.openNow ? 'Open' : 'Closed'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* ── PLACE DETAILS VIEW ── */}
            {view === 'place' && selectedPlace && (
              <div className="space-y-4">
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleBackToResults}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {searchResults.length > 0 ? 'Back to results' : 'Explore'}
                </button>

                {/* Photos strip */}
                {selectedPlace.photos && selectedPlace.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {selectedPlace.photos.slice(0, 4).map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt={selectedPlace.name}
                        className="h-28 w-40 shrink-0 rounded-xl object-cover"
                      />
                    ))}
                  </div>
                )}

                {/* Place info */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-tight">{selectedPlace.name}</h3>
                      {selectedPlace.types && selectedPlace.types.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {getPlaceTypeLabel(selectedPlace.types)}
                        </p>
                      )}
                    </div>
                    {selectedPlace.rating !== undefined && (
                      <div className="flex items-center gap-1 shrink-0 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {selectedPlace.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {selectedPlace.openNow !== undefined && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={cn(
                          'text-xs font-medium',
                          selectedPlace.openNow ? 'text-emerald-600' : 'text-rose-500'
                        )}>
                          {selectedPlace.openNow ? 'Open now' : 'Closed'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{selectedPlace.address}</p>
                    </div>
                    {selectedPlace.phoneNumber && (
                      <a
                        href={`tel:${selectedPlace.phoneNumber}`}
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {selectedPlace.phoneNumber}
                      </a>
                    )}
                    {selectedPlace.website && (
                      <a
                        href={selectedPlace.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {selectedPlace.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-9"
                    onClick={() => handleDirectionsClick(selectedPlace)}
                  >
                    <Navigation2 className="h-4 w-4 mr-1.5" />
                    Directions
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-9"
                    onClick={() => onSavePlace(selectedPlace)}
                  >
                    <MapPin className="h-4 w-4 mr-1.5" />
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* ── DIRECTIONS VIEW ── */}
            {view === 'directions' && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleCancelDirections}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <h3 className="text-sm font-semibold">Directions</h3>
                  <button onClick={handleCancelDirections}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>

                {/* Travel mode selector */}
                <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                  {TRAVEL_MODES.map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setTravelMode(mode)}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 px-1 text-[10px] font-medium transition-all',
                        travelMode === mode
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Origin / Destination inputs */}
                <div className="space-y-2 relative">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary border-2 border-background ring-2 ring-primary/30" />
                    </div>
                    <Input
                      value={directionsOrigin}
                      onChange={(e) => setDirectionsOrigin(e.target.value)}
                      placeholder="Starting point"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="absolute left-3 top-6 bottom-6 w-px bg-border/60" />
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                      <MapPin className="h-4 w-4 text-rose-500" />
                    </div>
                    <Input
                      value={directionsDestination}
                      onChange={(e) => {
                        setDirectionsDestination(e.target.value);
                        setDirectionsDestinationLocation(null);
                      }}
                      placeholder="Destination"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-9"
                  onClick={handleGetDirections}
                  disabled={isGettingDirections || !directionsDestination}
                >
                  {isGettingDirections ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      Getting directions…
                    </div>
                  ) : (
                    <>
                      <Navigation2 className="h-4 w-4 mr-1.5" />
                      Get Directions
                    </>
                  )}
                </Button>

                {/* Route options */}
                {directionsRoutes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Routes
                    </h4>
                    {directionsRoutes.map((route, i) => {
                      const isActive = activeRoute?.id === route.id;
                      const trafficDuration = route.durationInTraffic ?? route.duration;
                      const diffSeconds = trafficDuration - route.duration;
                      return (
                        <Card
                          key={route.id}
                          className={cn(
                            'cursor-pointer p-3 transition-all hover:border-primary/40',
                            isActive && 'border-primary/60 bg-primary/5'
                          )}
                          onClick={() => onSelectRoute(route)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold">
                                  {formatDuration(trafficDuration)}
                                </span>
                                {i === 0 && (
                                  <Badge className="text-[9px] px-1 py-0 h-3.5 bg-primary/15 text-primary border-0">
                                    Fastest
                                  </Badge>
                                )}
                                {diffSeconds > 120 && (
                                  <span className="text-[10px] text-rose-500 font-medium">
                                    +{Math.round(diffSeconds / 60)} min traffic
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDistance(route.distance)} • {route.summary}
                              </p>
                              {route.warnings && route.warnings.length > 0 && (
                                <p className="text-[11px] text-amber-500 mt-0.5">{route.warnings[0]}</p>
                              )}
                            </div>
                            {isActive && (
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <div className="h-2 w-2 rounded-full bg-white" />
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Turn-by-turn steps */}
                {activeRoute && activeRoute.steps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Turn-by-turn
                    </h4>
                    <div className="space-y-1">
                      {activeRoute.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground mt-0.5">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs leading-snug">{step.instruction}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {step.distance} · {step.duration}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </aside>
  );
}
