import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, TrafficLayer } from '@react-google-maps/api';
import { useMapContext } from './MapProvider';
import type { LatLng, Place, RouteOption, Incident, NavigationState } from '@/types/maps';

interface MapCanvasProps {
  center: LatLng;
  zoom: number;
  bearing: number;
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  showTraffic: boolean;
  userLocation: LatLng | null;
  userHeading: number | null;
  followMode: boolean;
  selectedPlace: Place | null;
  routes: RouteOption[];
  selectedRouteIndex: number;
  incidents: Incident[];
  navigation: NavigationState;
  onMapLoad: (map: google.maps.Map) => void;
  onCenterChange: (center: LatLng) => void;
  onZoomChange: (zoom: number) => void;
  onBearingChange: (bearing: number) => void;
  onPlaceClick: (place: Place) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Custom map styles for a cleaner look
const mapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
];

// Incident type to icon mapping
const incidentIcons: Record<string, string> = {
  police: '🚔',
  accident: '🚗',
  hazard: '⚠️',
  construction: '🚧',
  closure: '🚫',
  other: '❗',
};

export function MapCanvas({
  center,
  zoom,
  bearing,
  mapType,
  showTraffic,
  userLocation,
  userHeading,
  followMode,
  selectedPlace,
  routes,
  selectedRouteIndex,
  incidents,
  navigation,
  onMapLoad,
  onCenterChange,
  onZoomChange,
  onBearingChange,
  onPlaceClick,
}: MapCanvasProps) {
  const { isLoaded, loadError } = useMapContext();
  const mapRef = useRef<google.maps.Map | null>(null);

  const options = useMemo<google.maps.MapOptions>(() => ({
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: true,
    gestureHandling: 'greedy',
    mapTypeId: mapType,
    styles: mapStyles,
    heading: bearing,
    tilt: navigation.isNavigating ? 45 : 0,
  }), [mapType, bearing, navigation.isNavigating]);

  const handleLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    onMapLoad(map);
  }, [onMapLoad]);

  const handleIdle = useCallback(() => {
    if (!mapRef.current || followMode) return;
    
    const newCenter = mapRef.current.getCenter();
    const newZoom = mapRef.current.getZoom();
    const newHeading = mapRef.current.getHeading();
    
    if (newCenter) {
      onCenterChange({ lat: newCenter.lat(), lng: newCenter.lng() });
    }
    if (newZoom !== undefined) {
      onZoomChange(newZoom);
    }
    if (newHeading !== undefined) {
      onBearingChange(newHeading);
    }
  }, [followMode, onCenterChange, onZoomChange, onBearingChange]);

  // Update map when center/zoom changes externally
  useEffect(() => {
    if (mapRef.current && followMode) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(zoom);
    }
  }, [center, zoom, followMode]);

  // Decode polyline for route rendering
  const decodePolyline = useCallback((encoded: string): LatLng[] => {
    if (typeof google === 'undefined' || !google.maps?.geometry?.encoding) {
      return [];
    }
    const decoded = google.maps.geometry.encoding.decodePath(encoded);
    return decoded.map(point => ({ lat: point.lat(), lng: point.lng() }));
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <div className="text-center p-4">
          <p className="text-destructive font-medium">Failed to load maps</p>
          <p className="text-sm text-muted-foreground mt-1">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading maps...</span>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={options}
      onLoad={handleLoad}
      onIdle={handleIdle}
    >
      {/* Traffic Layer */}
      {showTraffic && <TrafficLayer />}

      {/* Route Polylines */}
      {routes.map((route, index) => {
        const path = decodePolyline(route.polyline);
        const isSelected = index === selectedRouteIndex;
        return (
          <Polyline
            key={route.id}
            path={path}
            options={{
              strokeColor: isSelected ? '#4285F4' : '#AAAAAA',
              strokeWeight: isSelected ? 6 : 4,
              strokeOpacity: isSelected ? 1 : 0.5,
              zIndex: isSelected ? 2 : 1,
            }}
          />
        );
      })}

      {/* Navigation Route (highlighted) */}
      {navigation.currentRoute && (
        <Polyline
          path={decodePolyline(navigation.currentRoute.polyline)}
          options={{
            strokeColor: '#4285F4',
            strokeWeight: 8,
            strokeOpacity: 1,
            zIndex: 3,
          }}
        />
      )}

      {/* User Location Marker */}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          }}
          zIndex={100}
        />
      )}

      {/* Heading Cone (when navigating or following) */}
      {userLocation && userHeading !== null && (followMode || navigation.isNavigating) && (
        <Marker
          position={userLocation}
          icon={{
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#4285F4',
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 1,
            rotation: userHeading,
          }}
          zIndex={99}
        />
      )}

      {/* Selected Place Marker */}
      {selectedPlace && (
        <Marker
          position={selectedPlace.location}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#EA4335',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          }}
          title={selectedPlace.name}
        />
      )}

      {/* Incident Markers */}
      {incidents.map(incident => (
        <Marker
          key={incident.id}
          position={incident.location}
          label={{
            text: incidentIcons[incident.type] || '❗',
            fontSize: '18px',
          }}
          title={`${incident.type}: ${incident.description || 'Reported incident'}`}
        />
      ))}
    </GoogleMap>
  );
}
