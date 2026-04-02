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
import type { LatLng, MapPin, Place, PlacePrediction } from '@/types/maps';
import { getPlaceDetails, reverseGeocode, searchPlaces } from '@/services/mapService';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_ZOOM = 13;

export default function ArloMaps() {
  const isMobile = useIsMobile();
  const geolocation = useGeolocation({ enableHighAccuracy: true });
  const mapsPersistence = useMapsPersistence();
  const { pins, createPin, updatePin, deletePin, isAvailable: arePinsAvailable, error: pinsError } = useMapPins();
  const mapRef = useRef<google.maps.Map | null>(null);
  const sessionTokenRef = useRef(crypto.randomUUID());

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

  useEffect(() => {
    if (mapsPersistence.settings.defaultMapType) {
      setMapType(mapsPersistence.settings.defaultMapType);
    }
  }, [mapsPersistence.settings.defaultMapType]);

  useEffect(() => {
    if (geolocation.position && !geolocation.error) {
      setCenter(geolocation.position);
    }
  }, [geolocation.position, geolocation.error]);

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
      // Optional address lookup failure is non-blocking.
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

  const handleDirections = useCallback((place: Place) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address || place.name)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handlePinDrag = useCallback(
    async (pin: MapPin, location: LatLng) => {
      await updatePin({ id: pin.id, location });
      toast('Pin location updated');
    },
    [updatePin]
  );

  return (
    <MapProvider>
      <div className="fixed inset-0 top-16 flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
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
          searchResults={searchResults}
          isSearching={isSearching || isAutocompleteLoading}
          selectedPlaceId={selectedPlace?.placeId ?? null}
          onPlaceSelect={handlePlaceSelect}
          selectedPlace={selectedPlace}
          onDirections={handleDirections}
          onSavePlace={handleSavePlace}
          pins={pins}
          pinsUnavailable={!arePinsAvailable}
          pinsUnavailableReason={pinsError}
          selectedPinId={selectedPin?.id ?? null}
          onPinSelect={handlePinSelect}
          onPinEdit={handleEditPin}
          onPinDelete={handleDeletePin}
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
            onMapLoad={(map) => {
              mapRef.current = map;
            }}
            onCenterChange={setCenter}
            onZoomChange={setZoom}
            onPlaceClick={handlePlaceSelect}
            onPinClick={handlePinSelect}
            onMapClick={handleMapClick}
            onPinDrag={handlePinDrag}
          />

          <div className="absolute right-4 top-4 z-30">
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
            <div className="absolute left-4 right-4 top-4 z-40">
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
            onDirections={handleDirections}
            onSavePlace={handleSavePlace}
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
