import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapProvider } from '@/components/maps/MapProvider';
import { MapCanvas } from '@/components/maps/MapCanvas';
import { MapSearchBar } from '@/components/maps/MapSearchBar';
import { MapControls } from '@/components/maps/MapControls';
import { MapBottomSheet } from '@/components/maps/MapBottomSheet';
import { useMapsPersistence } from '@/hooks/useMapsPersistence';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { 
  Place, 
  BottomSheetState, 
  MapMode, 
  LatLng, 
  NavigationState,
  RouteOption 
} from '@/types/maps';

const DEFAULT_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 }; // San Francisco
const DEFAULT_ZOOM = 14;

export default function ArloMaps() {
  // Map state
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [bearing, setBearing] = useState(0);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  
  // UI state
  const [mode, setMode] = useState<MapMode>('explore');
  const [sheetState, setSheetState] = useState<BottomSheetState>('collapsed');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [followMode, setFollowMode] = useState(false);

  // Navigation state
  const [navigation, setNavigation] = useState<NavigationState>({
    isNavigating: false,
    currentRoute: null,
    currentStepIndex: 0,
    origin: null,
    destination: null,
    waypoints: [],
    followMode: true,
    voiceMuted: false,
    estimatedArrival: null,
    remainingDistance: null,
    remainingDuration: null,
  });
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // Hooks
  const mapsPersistence = useMapsPersistence();
  const geolocation = useGeolocation({ enableHighAccuracy: true });
  const mapRef = useRef<google.maps.Map | null>(null);

  // Request user location immediately on page load (otherwise we stay on DEFAULT_CENTER)
  useEffect(() => {
    geolocation.getCurrentPosition();
  }, [geolocation.getCurrentPosition]);

  // Initialize with user location
  useEffect(() => {
    if (geolocation.position && !geolocation.error) {
      setCenter(geolocation.position);
    }
  }, [geolocation.position, geolocation.error]);

  // Follow mode: update center when position changes
  useEffect(() => {
    if (followMode && geolocation.position) {
      setCenter(geolocation.position);
    }
  }, [followMode, geolocation.position]);

  // Load user's default map type
  useEffect(() => {
    if (mapsPersistence.settings.defaultMapType) {
      setMapType(mapsPersistence.settings.defaultMapType);
    }
  }, [mapsPersistence.settings.defaultMapType]);

  // Handlers
  const handleLocateMe = useCallback(() => {
    if (geolocation.position) {
      if (center.lat === geolocation.position.lat && center.lng === geolocation.position.lng) {
        // Second press: enable follow mode
        setFollowMode(true);
        geolocation.startWatching();
      } else {
        // First press: center on location
        setCenter(geolocation.position);
        setZoom(16);
      }
    } else {
      geolocation.getCurrentPosition();
    }
  }, [geolocation, center]);

  const handleResetBearing = useCallback(() => {
    setBearing(0);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 1, 21));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 1, 1));
  }, []);

  const handleMapTypeChange = useCallback((type: typeof mapType) => {
    setMapType(type);
  }, []);

  const handlePlaceSelect = useCallback((place: Place) => {
    setSelectedPlace(place);
    setCenter(place.location);
    setZoom(17);
    setMode('place-details');
    setSheetState('half');

    // Record for pattern learning
    mapsPersistence.recordDestinationVisit({
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      location: place.location,
    });
  }, [mapsPersistence]);

  const handleGetDirections = useCallback((place: Place) => {
    setNavigation(prev => ({
      ...prev,
      origin: null, // Will use current location
      destination: place,
    }));
    setMode('directions');
    setSheetState('half');
  }, []);

  const handleStartNavigation = useCallback((route: RouteOption) => {
    if (!navigation.destination) return;

    const now = new Date();
    const durationMs = typeof route.duration === 'number' ? route.duration * 1000 : 0;
    const arrivalTime = new Date(now.getTime() + durationMs);

    setNavigation(prev => ({
      ...prev,
      isNavigating: true,
      currentRoute: route,
      currentStepIndex: 0,
      followMode: true,
      estimatedArrival: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      remainingDistance: route.distance,
      remainingDuration: route.durationInTraffic?.toString() || route.duration,
    }));
    setMode('navigation');
    setSheetState('collapsed');
    setFollowMode(true);
    geolocation.startWatching();
  }, [navigation.destination, geolocation]);

  const handleEndNavigation = useCallback(() => {
    setNavigation({
      isNavigating: false,
      currentRoute: null,
      currentStepIndex: 0,
      origin: null,
      destination: null,
      waypoints: [],
      followMode: false,
      voiceMuted: false,
      estimatedArrival: null,
      remainingDistance: null,
      remainingDuration: null,
    });
    setRoutes([]);
    setMode('explore');
    setSheetState('collapsed');
    setFollowMode(false);
    geolocation.stopWatching();
  }, [geolocation]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      setMode('search');
      setSheetState('half');
    } else {
      setMode('explore');
      setSheetState('collapsed');
    }
  }, []);

  const handleSearchResultSelect = useCallback((place: Place) => {
    handlePlaceSelect(place);
    mapsPersistence.addRecentSearch({
      query: searchQuery,
      placeId: place.placeId,
      placeName: place.name,
      placeAddress: place.address,
      location: place.location,
    });
    setSearchQuery('');
    setSearchResults([]);
  }, [handlePlaceSelect, mapsPersistence, searchQuery]);

  const handleSheetStateChange = useCallback((state: BottomSheetState) => {
    setSheetState(state);
    if (state === 'collapsed' && mode !== 'navigation') {
      if (mode === 'search') {
        setSearchQuery('');
        setSearchResults([]);
      }
      setMode('explore');
    }
  }, [mode]);

  return (
    <MapProvider>
      <div className="fixed inset-0 overflow-hidden bg-background">
        {/* Main Map */}
        <MapCanvas
          center={center}
          zoom={zoom}
          bearing={bearing}
          mapType={mapType}
          showTraffic={mapsPersistence.settings.showTraffic}
          userLocation={geolocation.position}
          userHeading={geolocation.heading}
          followMode={followMode}
          selectedPlace={selectedPlace}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          incidents={mapsPersistence.settings.showIncidents ? mapsPersistence.incidents : []}
          navigation={navigation}
          onMapLoad={(map) => { mapRef.current = map; }}
          onCenterChange={setCenter}
          onZoomChange={setZoom}
          onBearingChange={setBearing}
          onPlaceClick={handlePlaceSelect}
        />

        {/* Search Bar */}
        <MapSearchBar
          value={searchQuery}
          onChange={handleSearch}
          onResultSelect={handleSearchResultSelect}
          recentSearches={mapsPersistence.recentSearches}
          onClearRecent={mapsPersistence.clearRecentSearches}
          homePlace={mapsPersistence.homePlace}
          workPlace={mapsPersistence.workPlace}
          currentLocation={geolocation.position}
        />

        {/* Right-side Controls */}
        <MapControls
          onLocateMe={handleLocateMe}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetBearing={handleResetBearing}
          onMapTypeChange={handleMapTypeChange}
          isFollowing={followMode}
          bearing={bearing}
          currentMapType={mapType}
          isLocating={geolocation.isLoading}
          hasLocation={!!geolocation.position}
        />

        {/* Bottom Sheet */}
        <MapBottomSheet
          state={sheetState}
          onStateChange={handleSheetStateChange}
          mode={mode}
          selectedPlace={selectedPlace}
          searchResults={searchResults}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          navigation={navigation}
          smartSuggestions={mapsPersistence.getSmartSuggestions()}
          homePlace={mapsPersistence.homePlace}
          workPlace={mapsPersistence.workPlace}
          incidents={mapsPersistence.incidents}
          onPlaceSelect={handlePlaceSelect}
          onGetDirections={handleGetDirections}
          onRouteSelect={setSelectedRouteIndex}
          onStartNavigation={() => routes[selectedRouteIndex] && handleStartNavigation(routes[selectedRouteIndex])}
          onEndNavigation={handleEndNavigation}
          onReportIncident={mapsPersistence.reportIncident}
          onVoteIncident={mapsPersistence.voteIncident}
          onSavePlace={mapsPersistence.savePlace}
        />
      </div>
    </MapProvider>
  );
}
