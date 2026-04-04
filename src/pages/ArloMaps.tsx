import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MapProvider } from '@/components/maps/MapProvider';
import { MapCanvas } from '@/components/maps/MapCanvas';
import { MapSidebar } from '@/components/maps/MapSidebar';
import { MapTools } from '@/components/maps/MapTools';
import { MapMobileSheet } from '@/components/maps/MapMobileSheet';
import { MapSearchInput } from '@/components/maps/MapSearchInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapsPersistence } from '@/hooks/useMapsPersistence';
import { useMapPins } from '@/hooks/useMapPins';
import { cn } from '@/lib/utils';
import type { LatLng, MapPin, Place, PlacePrediction, RouteOption } from '@/types/maps';
import { getDirections, getPlaceDetails, reverseGeocode, searchPlaces } from '@/services/mapService';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_ZOOM = 13;

type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';

export default function ArloMaps() {
  const isMobile = useIsMobile();
  const geolocation = useGeolocation({ enableHighAccuracy: true });
  const mapsPersistence = useMapsPersistence();
  const { pins, createPin, updatePin, deletePin, isAvailable: arePinsAvailable, error: pinsError } = useMapPins();
  const mapRef = useRef<google.maps.Map | null>(null);
  const sessionTokenRef = useRef(crypto.randomUUID());
  const locationStartedRef = useRef(false);

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [mapStyle, setMapStyle] = useState<'light' | 'dark'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);

  const [dropPinMode, setDropPinMode] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ title: '', note: '', location: null as LatLng | null, id: null as string | null });
  const [isPinSaving, setIsPinSaving] = useState(false);

  // Directions state
  const [directionsMode, setDirectionsMode] = useState(false);
  const [directionsRoutes, setDirectionsRoutes] = useState<RouteOption[]>([]);
  const [directionsRoutesByMode, setDirectionsRoutesByMode] = useState<Partial<Record<TravelMode, RouteOption[]>>>({});
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [isGettingDirections, setIsGettingDirections] = useState(false);
  const lastDirectionsArgs = useRef<{ origin: string | LatLng; destination: string | LatLng } | null>(null);

  // Destination autocomplete state
  const [destPredictions, setDestPredictions] = useState<PlacePrediction[]>([]);
  const destSessionTokenRef = useRef(crypto.randomUUID());
  const destDebounceRef = useRef<number | null>(null);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [navETA, setNavETA] = useState<string | null>(null);
  const [navRemainingDist, setNavRemainingDist] = useState<string | null>(null);
  const [navRemainingTime, setNavRemainingTime] = useState<string | null>(null);
  const [followMode, setFollowMode] = useState(false);

  // Auto-start geolocation on mount
  useEffect(() => {
    if (!locationStartedRef.current) {
      locationStartedRef.current = true;
      geolocation.getCurrentPosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapsPersistence.settings.defaultMapType) {
      setMapType(mapsPersistence.settings.defaultMapType);
    }
  }, [mapsPersistence.settings.defaultMapType]);

  useEffect(() => {
    if (geolocation.position && !geolocation.error && !isNavigating) {
      setCenter(geolocation.position);
    }
  }, [geolocation.position, geolocation.error, isNavigating]);

  // Follow-mode: keep map centered on user while navigating
  useEffect(() => {
    if (!isNavigating || !followMode || !geolocation.position) return;
    setCenter(geolocation.position);
    mapRef.current?.panTo(geolocation.position);
  }, [isNavigating, followMode, geolocation.position]);

  // Step advancement during navigation
  useEffect(() => {
    if (!isNavigating || !activeRoute || !geolocation.position) return;

    const pos = geolocation.position;
    const steps = activeRoute.steps;
    if (navStepIndex >= steps.length) return;

    const currentEnd = steps[navStepIndex].endLocation;
    const dLat = pos.lat - currentEnd.lat;
    const dLng = pos.lng - currentEnd.lng;
    const distMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111_320;

    if (distMeters < 30 && navStepIndex < steps.length - 1) {
      const nextIdx = navStepIndex + 1;
      setNavStepIndex(nextIdx);

      let remainingSeconds = 0;
      let remainingMeters = 0;
      for (let i = nextIdx; i < steps.length; i++) {
        const durMatch = steps[i].duration.match(/(\d+)/);
        const distMatch = steps[i].distance.match(/([\d.]+)/);
        if (durMatch) remainingSeconds += parseInt(durMatch[1], 10) * 60;
        if (distMatch) remainingMeters += parseFloat(distMatch[1]) * 1609.34;
      }

      const miles = remainingMeters / 1609.34;
      setNavRemainingDist(miles < 0.1 ? `${Math.round(remainingMeters)} m` : `${miles.toFixed(1)} mi`);

      const mins = Math.round(remainingSeconds / 60);
      if (mins < 60) {
        setNavRemainingTime(`${mins} min`);
      } else {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        setNavRemainingTime(m > 0 ? `${h} hr ${m} min` : `${h} hr`);
      }

      const arrivalMs = Date.now() + remainingSeconds * 1000;
      setNavETA(new Date(arrivalMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }

    if (distMeters < 30 && navStepIndex === steps.length - 1) {
      toast('You have arrived!');
      handleEndNavigation();
    }
  }, [isNavigating, activeRoute, geolocation.position, navStepIndex, handleEndNavigation]);

  const searchCenter = useMemo(() => geolocation.position ?? center, [geolocation.position, center]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setPredictions([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setIsAutocompleteLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('places-autocomplete', {
          body: {
            query: searchQuery,
            sessionToken: sessionTokenRef.current,
            location: `${searchCenter.lat},${searchCenter.lng}`,
            radius: 40000,
          },
        });
        if (!error && data?.predictions) {
          setPredictions(data.predictions);
        } else {
          setPredictions([]);
        }
      } catch {
        setPredictions([]);
      } finally {
        setIsAutocompleteLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchQuery, searchCenter]);

  // Destination autocomplete handler
  const handleDestinationQueryChange = useCallback((query: string) => {
    if (destDebounceRef.current !== null) {
      window.clearTimeout(destDebounceRef.current);
    }
    if (query.trim().length < 2) {
      setDestPredictions([]);
      return;
    }
    destDebounceRef.current = window.setTimeout(async () => {
      destDebounceRef.current = null;
      try {
        const { data, error } = await supabase.functions.invoke('places-autocomplete', {
          body: {
            query,
            sessionToken: destSessionTokenRef.current,
            location: `${searchCenter.lat},${searchCenter.lng}`,
            radius: 40000,
          },
        });
        if (!error && data?.predictions) {
          setDestPredictions(data.predictions);
        } else {
          setDestPredictions([]);
        }
      } catch {
        setDestPredictions([]);
      }
    }, 300);
  }, [searchCenter]);

  const handleDestPredictionSelect = useCallback(async (prediction: PlacePrediction): Promise<LatLng | null> => {
    setDestPredictions([]);
    destSessionTokenRef.current = crypto.randomUUID();
    try {
      const details = await getPlaceDetails(prediction.placeId);
      if (details) {
        return details.location;
      }
    } catch {
      // fall through
    }
    return null;
  }, []);

  const handleSearchSubmit = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setPredictions([]);
    try {
      const results = await searchPlaces(searchQuery, searchCenter);
      setSearchResults(results);
      setSelectedPlace(null);
      setSelectedPin(null);
      if (results.length === 0) {
        toast('No results found', { description: 'Try a different search or zoom the map.' });
      }
    } catch (error) {
      toast('Search failed', { description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchCenter]);

  const handlePredictionSelect = useCallback(
    async (prediction: PlacePrediction) => {
      setSearchQuery(prediction.description);
      setPredictions([]);
      setIsSearching(true);
      try {
        const details = await getPlaceDetails(prediction.placeId);
        if (details) {
          setSearchResults([details]);
          setSelectedPlace(details);
          setSelectedPin(null);
          setCenter(details.location);
          setZoom(16);
          mapRef.current?.panTo(details.location);
          mapRef.current?.setZoom(16);
        }
      } catch (error) {
        toast('Place lookup failed', { description: error instanceof Error ? error.message : 'Please try again.' });
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handlePlaceSelect = useCallback(
    async (place: Place) => {
      setSelectedPlace(place);
      setSelectedPin(null);
      setCenter(place.location);
      setZoom(16);
      mapRef.current?.panTo(place.location);
      mapRef.current?.setZoom(16);

      try {
        const details = await getPlaceDetails(place.placeId);
        if (details) {
          setSelectedPlace(details);
        }
      } catch (error) {
        toast('Details unavailable', { description: error instanceof Error ? error.message : 'Unable to fetch details.' });
      }
    },
    []
  );

  const handlePinSelect = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
    setSelectedPlace(null);
    setCenter(pin.location);
    setZoom(16);
    mapRef.current?.panTo(pin.location);
    mapRef.current?.setZoom(16);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (geolocation.position) {
      setCenter(geolocation.position);
      setZoom(15);
      mapRef.current?.panTo(geolocation.position);
      mapRef.current?.setZoom(15);
    } else {
      geolocation.getCurrentPosition();
    }
  }, [geolocation]);

  const handleMapClick = useCallback(async (location: LatLng) => {
    if (!dropPinMode) return;

    setPinDialogOpen(true);
    setIsPinSaving(false);
    setPinDraft({ title: 'Dropped Pin', note: '', location, id: null });

    try {
      const address = await reverseGeocode(location);
      if (address) {
        setPinDraft((prev) => ({ ...prev, note: address }));
      }
    } catch {
      // Non-blocking
    }
  }, [dropPinMode]);

  const handleSavePin = useCallback(async () => {
    if (!pinDraft.location || !pinDraft.title.trim()) return;

    setIsPinSaving(true);
    try {
      if (pinDraft.id) {
        const updated = await updatePin({
          id: pinDraft.id,
          title: pinDraft.title,
          note: pinDraft.note,
          location: pinDraft.location,
        });
        if (updated) {
          toast('Pin updated');
          setSelectedPin(updated);
        }
      } else {
        const created = await createPin({
          title: pinDraft.title,
          note: pinDraft.note,
          location: pinDraft.location,
        });
        if (created) {
          toast('Pin saved');
          setSelectedPin(created);
        }
      }
      setPinDialogOpen(false);
      setDropPinMode(false);
    } catch (error) {
      toast('Unable to save pin', { description: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setIsPinSaving(false);
    }
  }, [pinDraft, createPin, updatePin]);

  const handleEditPin = useCallback((pin: MapPin) => {
    setPinDraft({ title: pin.title, note: pin.note ?? '', location: pin.location, id: pin.id });
    setPinDialogOpen(true);
  }, []);

  const handleDeletePin = useCallback(
    async (pin: MapPin) => {
      const success = await deletePin(pin.id);
      if (success) {
        toast('Pin removed');
        if (selectedPin?.id === pin.id) {
          setSelectedPin(null);
        }
      }
    },
    [deletePin, selectedPin]
  );

  const handleSavePlace = useCallback(
    async (place: Place) => {
      const existing = pins.find((pin) => pin.title === place.name && pin.location.lat === place.location.lat && pin.location.lng === place.location.lng);
      if (existing) {
        toast('Already saved');
        return;
      }

      const created = await createPin({
        title: place.name,
        note: place.address,
        location: place.location,
      });

      if (created) {
        toast('Saved to pins');
        setSelectedPin(created);
      }
    },
    [createPin, pins]
  );

  const resolveToCoordinates = useCallback(async (loc: string | LatLng): Promise<LatLng | string> => {
    if (typeof loc !== 'string') return loc;
    try {
      const results = await searchPlaces(loc, searchCenter, 40000);
      if (results.length > 0) return results[0].location;
    } catch {
      // fall through to string
    }
    return loc;
  }, [searchCenter]);

  const fitRouteBounds = useCallback((route: RouteOption) => {
    if (mapRef.current && route.steps.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      route.steps.forEach((step) => {
        bounds.extend(step.startLocation);
        bounds.extend(step.endLocation);
      });
      mapRef.current.fitBounds(bounds, 80);
    }
  }, []);

  const handleGetDirections = useCallback(
    async (origin: string | LatLng, destination: string | LatLng, travelMode: TravelMode) => {
      setDirectionsMode(true);
      setDirectionsRoutes([]);
      setDirectionsRoutesByMode({});
      setActiveRoute(null);
      setIsGettingDirections(true);
      try {
        const resolvedDest = await resolveToCoordinates(destination);
        const resolvedOrigin = await resolveToCoordinates(origin);
        lastDirectionsArgs.current = { origin: resolvedOrigin, destination: resolvedDest };

        const routes = await getDirections(resolvedOrigin, resolvedDest, { travelMode, alternatives: true });
        setDirectionsRoutes(routes);
        setDirectionsRoutesByMode((prev) => ({ ...prev, [travelMode]: routes }));
        if (routes.length > 0) {
          setActiveRoute(routes[0]);
          fitRouteBounds(routes[0]);
        } else {
          toast('No routes found', { description: 'Try a different destination or travel mode.' });
        }

        // Fetch the alternate mode in the background (driving <-> walking)
        const altMode: TravelMode = travelMode === 'DRIVING' ? 'WALKING' : 'DRIVING';
        getDirections(resolvedOrigin, resolvedDest, { travelMode: altMode, alternatives: false })
          .then((altRoutes) => {
            setDirectionsRoutesByMode((prev) => ({ ...prev, [altMode]: altRoutes }));
          })
          .catch(() => { /* non-blocking */ });
      } catch (error) {
        toast('Directions failed', { description: error instanceof Error ? error.message : 'Please try again.' });
      } finally {
        setIsGettingDirections(false);
      }
    },
    [resolveToCoordinates, fitRouteBounds]
  );

  const handleSwitchTravelMode = useCallback((_mode: TravelMode, cachedRoutes: RouteOption[]) => {
    setDirectionsRoutes(cachedRoutes);
    if (cachedRoutes.length > 0) {
      setActiveRoute(cachedRoutes[0]);
      fitRouteBounds(cachedRoutes[0]);
    }
  }, [fitRouteBounds]);

  const handleSelectRoute = useCallback((route: RouteOption) => {
    setActiveRoute(route);
    if (mapRef.current && route.steps.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      route.steps.forEach((step) => {
        bounds.extend(step.startLocation);
        bounds.extend(step.endLocation);
      });
      mapRef.current.fitBounds(bounds, 80);
    }
  }, []);

  const handleCancelDirections = useCallback(() => {
    setDirectionsMode(false);
    setDirectionsRoutes([]);
    setDirectionsRoutesByMode({});
    setActiveRoute(null);
    setIsNavigating(false);
    setFollowMode(false);
  }, []);

  const handleStartNavigation = useCallback(() => {
    if (!activeRoute) return;
    setIsNavigating(true);
    setFollowMode(true);
    setNavStepIndex(0);

    const totalDist = activeRoute.distanceText;
    const totalTime = activeRoute.durationText;
    const arrivalMs = Date.now() + activeRoute.duration * 1000;
    const arrival = new Date(arrivalMs);
    const arrivalStr = arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    setNavRemainingDist(totalDist);
    setNavRemainingTime(totalTime);
    setNavETA(arrivalStr);

    if (geolocation.position) {
      setCenter(geolocation.position);
      setZoom(18);
      mapRef.current?.panTo(geolocation.position);
      mapRef.current?.setZoom(18);
    }

    geolocation.startWatching();
  }, [activeRoute, geolocation]);

  const handleEndNavigation = useCallback(() => {
    setIsNavigating(false);
    setFollowMode(false);
    setNavStepIndex(0);
    setNavETA(null);
    setNavRemainingDist(null);
    setNavRemainingTime(null);
    if (activeRoute) {
      fitRouteBounds(activeRoute);
    }
  }, [activeRoute, fitRouteBounds]);

  const handlePinDrag = useCallback(
    async (pin: MapPin, location: LatLng) => {
      await updatePin({ id: pin.id, location });
      toast('Pin location updated');
    },
    [updatePin]
  );

  const handleToggleTraffic = useCallback(() => {
    mapsPersistence.updateSettings({ showTraffic: !mapsPersistence.settings.showTraffic });
  }, [mapsPersistence]);

  return (
    <MapProvider>
      {/* Full-screen map layout — extends behind the navbar */}
      <div className="fixed inset-0 flex overflow-hidden">
        <MapSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onSearchClear={() => {
            setSearchQuery('');
            setPredictions([]);
            setSearchResults([]);
          }}
          predictions={predictions}
          onPredictionSelect={handlePredictionSelect}
          onDismissPredictions={() => setPredictions([])}
          searchResults={searchResults}
          isSearching={isSearching || isAutocompleteLoading}
          selectedPlaceId={selectedPlace?.placeId ?? null}
          onPlaceSelect={handlePlaceSelect}
          selectedPlace={selectedPlace}
          onSavePlace={handleSavePlace}
          pins={pins}
          pinsUnavailable={!arePinsAvailable}
          pinsUnavailableReason={pinsError}
          selectedPinId={selectedPin?.id ?? null}
          onPinSelect={handlePinSelect}
          onPinEdit={handleEditPin}
          onPinDelete={handleDeletePin}
          showTraffic={mapsPersistence.settings.showTraffic}
          onToggleTraffic={handleToggleTraffic}
          directionsRoutes={directionsRoutes}
          directionsRoutesByMode={directionsRoutesByMode}
          activeRoute={activeRoute}
          isGettingDirections={isGettingDirections}
          onGetDirections={handleGetDirections}
          onSelectRoute={handleSelectRoute}
          onCancelDirections={handleCancelDirections}
          onStartNavigation={handleStartNavigation}
          onSwitchTravelMode={handleSwitchTravelMode}
          userLocation={geolocation.position}
          destinationPredictions={destPredictions}
          onDestinationQueryChange={handleDestinationQueryChange}
          onDestinationPredictionSelect={handleDestPredictionSelect}
          onDismissDestinationPredictions={() => setDestPredictions([])}
          isNavigating={isNavigating}
          navigationState={isNavigating ? {
            currentStepIndex: navStepIndex,
            estimatedArrival: navETA,
            remainingDistance: navRemainingDist,
            remainingDuration: navRemainingTime,
          } : null}
          onEndNavigation={handleEndNavigation}
        />

        <div className="relative flex-1">
          <MapCanvas
            center={center}
            zoom={zoom}
            mapType={mapType}
            mapStyle={mapStyle}
            showTraffic={mapsPersistence.settings.showTraffic}
            userLocation={geolocation.position}
            dropPinMode={dropPinMode}
            places={searchResults}
            pins={arePinsAvailable ? pins : []}
            selectedPlaceId={selectedPlace?.placeId ?? null}
            selectedPinId={selectedPin?.id ?? null}
            activeRoute={activeRoute}
            isNavigating={isNavigating}
            onMapLoad={(map) => {
              mapRef.current = map;
            }}
            onCenterChange={setCenter}
            onZoomChange={setZoom}
            onPlaceClick={handlePlaceSelect}
            onPinClick={handlePinSelect}
            onMapClick={handleMapClick}
            onPinDrag={handlePinDrag}
            onUserPan={() => { if (isNavigating) setFollowMode(false); }}
          />

          {isNavigating && !followMode && (
            <button
              onClick={() => {
                setFollowMode(true);
                if (geolocation.position) {
                  mapRef.current?.panTo(geolocation.position);
                  mapRef.current?.setZoom(18);
                }
              }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
            >
              Re-center
            </button>
          )}

          <div className="absolute right-4 top-20 z-30">
            <MapTools
              dropPinMode={dropPinMode}
              onToggleDropPin={() => setDropPinMode((prev) => !prev)}
              onLocateMe={handleLocateMe}
              onZoomIn={() => setZoom((prev) => Math.min(prev + 1, 20))}
              onZoomOut={() => setZoom((prev) => Math.max(prev - 1, 2))}
              mapStyle={mapStyle}
              onToggleStyle={() => setMapStyle((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              isLocating={geolocation.isLoading}
            />
          </div>

          {isMobile && (
            <div className="absolute left-4 right-16 top-20 z-40">
              <MapSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearchSubmit}
                onClear={() => {
                  setSearchQuery('');
                  setPredictions([]);
                  setSearchResults([]);
                }}
                isLoading={isSearching || isAutocompleteLoading}
                predictions={predictions}
                onPredictionSelect={handlePredictionSelect}
                onDismissPredictions={() => setPredictions([])}
                placeholder="Search nearby places"
                variant="floating"
              />
            </div>
          )}

          {geolocation.error && (
            <div className={cn(
              'absolute left-4 bottom-6 z-30 rounded-2xl border border-border bg-background/90 px-4 py-3 text-xs text-muted-foreground shadow-lg backdrop-blur',
              isMobile && 'bottom-28'
            )}>
              Location permission denied. Search still works without it.
            </div>
          )}

          {!arePinsAvailable && (
            <div
              className={cn(
                'absolute left-4 bottom-20 z-30 rounded-2xl border border-border bg-background/90 px-4 py-3 text-xs text-muted-foreground shadow-lg backdrop-blur',
                isMobile && 'bottom-40'
              )}
            >
              Saved pins are unavailable in this environment. {pinsError ? `(${pinsError})` : null}
            </div>
          )}
        </div>

        {isMobile && (
          <MapMobileSheet
            expanded={mobileSheetExpanded}
            onToggle={() => setMobileSheetExpanded((prev) => !prev)}
            results={searchResults}
            pins={pins}
            selectedPlaceId={selectedPlace?.placeId ?? null}
            onPlaceSelect={handlePlaceSelect}
            onPinSelect={handlePinSelect}
            selectedPlace={selectedPlace}
            onDirections={(place) => handleGetDirections(
              geolocation.position ?? 'My Location',
              place.location,
              'DRIVING'
            )}
            onSavePlace={handleSavePlace}
            isNavigating={isNavigating}
            activeRoute={activeRoute}
            navigationState={isNavigating ? {
              currentStepIndex: navStepIndex,
              estimatedArrival: navETA,
              remainingDistance: navRemainingDist,
              remainingDuration: navRemainingTime,
            } : null}
            onEndNavigation={handleEndNavigation}
          />
        )}
      </div>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pinDraft.id ? 'Edit Pin' : 'Save Pin'}</DialogTitle>
            <DialogDescription>Give this pin a title and optional note.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={pinDraft.title}
              onChange={(event) => setPinDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Pin title"
            />
            <Textarea
              value={pinDraft.note}
              onChange={(event) => setPinDraft((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Add a note or address"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePin} disabled={!pinDraft.title.trim() || isPinSaving}>
              {isPinSaving ? 'Saving...' : 'Save Pin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MapProvider>
  );
}
