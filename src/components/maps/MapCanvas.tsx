import React, { useCallback, useMemo, useRef } from 'react';
import { GoogleMap, Marker, TrafficLayer } from '@react-google-maps/api';
import { useMapContext } from './MapProvider';
import type { LatLng, Place, MapPin } from '@/types/maps';

interface MapCanvasProps {
  center: LatLng;
  zoom: number;
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  mapStyle: 'light' | 'dark';
  showTraffic: boolean;
  userLocation: LatLng | null;
  dropPinMode?: boolean;
  places: Place[];
  pins: MapPin[];
  selectedPlaceId: string | null;
  selectedPinId: string | null;
  onMapLoad: (map: google.maps.Map) => void;
  onCenterChange: (center: LatLng) => void;
  onZoomChange: (zoom: number) => void;
  onPlaceClick: (place: Place) => void;
  onPinClick: (pin: MapPin) => void;
  onMapClick?: (location: LatLng) => void;
  onPinDrag?: (pin: MapPin, location: LatLng) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const lightMapStyles: google.maps.MapTypeStyle[] = [
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

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#374151' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#111827' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d1d5db' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
];

export function MapCanvas({
  center,
  zoom,
  mapType,
  mapStyle,
  showTraffic,
  userLocation,
  dropPinMode,
  places,
  pins,
  selectedPlaceId,
  selectedPinId,
  onMapLoad,
  onCenterChange,
  onZoomChange,
  onPlaceClick,
  onPinClick,
  onMapClick,
  onPinDrag,
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
    styles: mapStyle === 'dark' ? darkMapStyles : lightMapStyles,
    draggableCursor: dropPinMode ? 'crosshair' : undefined,
  }), [mapType, mapStyle, dropPinMode]);

  const handleLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    onMapLoad(map);
  }, [onMapLoad]);

  const handleIdle = useCallback(() => {
    if (!mapRef.current) return;

    const newCenter = mapRef.current.getCenter();
    const newZoom = mapRef.current.getZoom();

    if (newCenter) {
      onCenterChange({ lat: newCenter.lat(), lng: newCenter.lng() });
    }
    if (newZoom !== undefined) {
      onZoomChange(newZoom);
    }
  }, [onCenterChange, onZoomChange]);

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (!onMapClick || !event.latLng) return;
    onMapClick({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }, [onMapClick]);

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
      onClick={handleMapClick}
    >
      {showTraffic && <TrafficLayer />}

      {userLocation && (
        <Marker
          position={userLocation}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }}
          zIndex={100}
        />
      )}

      {places.map((place) => {
        const isSelected = place.placeId === selectedPlaceId;
        return (
          <Marker
            key={place.placeId}
            position={place.location}
            onClick={() => onPlaceClick(place)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: isSelected ? 10 : 7,
              fillColor: isSelected ? '#ef4444' : '#38bdf8',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            zIndex={isSelected ? 50 : 20}
            title={place.name}
          />
        );
      })}

      {pins.map((pin) => {
        const isSelected = pin.id === selectedPinId;
        return (
          <Marker
            key={pin.id}
            position={pin.location}
            draggable
            onDragEnd={(event) => {
              if (!event.latLng || !onPinDrag) return;
              onPinDrag(pin, { lat: event.latLng.lat(), lng: event.latLng.lng() });
            }}
            onClick={() => onPinClick(pin)}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: isSelected ? 6 : 5,
              fillColor: isSelected ? '#f59e0b' : '#f97316',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            zIndex={isSelected ? 60 : 30}
            title={pin.title}
          />
        );
      })}
    </GoogleMap>
  );
}
