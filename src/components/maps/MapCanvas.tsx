import React, { useCallback, useMemo, useRef } from 'react';
import { GoogleMap, Polyline, TrafficLayer } from '@react-google-maps/api';
import { useMapContext } from './MapProvider';
import { AdvancedMapMarker } from './AdvancedMapMarker';
import type { LatLng, Place, MapPin, RouteOption } from '@/types/maps';

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

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
  activeRoute?: RouteOption | null;
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
  activeRoute,
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

      {activeRoute && (
        <>
          <Polyline
            path={decodePolyline(activeRoute.polyline)}
            options={{
              strokeColor: '#1a73e8',
              strokeOpacity: 0.9,
              strokeWeight: 6,
              zIndex: 10,
            }}
          />
          <Polyline
            path={decodePolyline(activeRoute.polyline)}
            options={{
              strokeColor: '#ffffff',
              strokeOpacity: 0.4,
              strokeWeight: 10,
              zIndex: 9,
            }}
          />
        </>
      )}

      {userLocation && (
        <AdvancedMapMarker
          map={mapRef.current}
          position={userLocation}
          zIndex={100}
          content={
            <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="7" fill="#2563eb" stroke="white" strokeWidth="3" />
            </svg>
          }
        />
      )}

      {places.map((place) => {
        const isSelected = place.placeId === selectedPlaceId;
        const size = isSelected ? 24 : 18;
        return (
          <AdvancedMapMarker
            key={place.placeId}
            map={mapRef.current}
            position={place.location}
            onClick={() => onPlaceClick(place)}
            zIndex={isSelected ? 50 : 20}
            title={place.name}
            content={
              <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill={isSelected ? '#ef4444' : '#38bdf8'}
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            }
          />
        );
      })}

      {pins.map((pin) => {
        const isSelected = pin.id === selectedPinId;
        return (
          <AdvancedMapMarker
            key={pin.id}
            map={mapRef.current}
            position={pin.location}
            anchor="bottom-center"
            draggable
            onDragEnd={(pos) => onPinDrag?.(pin, pos)}
            onClick={() => onPinClick(pin)}
            zIndex={isSelected ? 60 : 30}
            title={pin.title}
            content={
              <svg
                width={isSelected ? 28 : 24}
                height={isSelected ? 36 : 32}
                viewBox="0 0 24 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 0C6.48 0 2 4.48 2 10c0 7.5 10 22 10 22s10-14.5 10-22C22 4.48 17.52 0 12 0z"
                  fill={isSelected ? '#f59e0b' : '#f97316'}
                  stroke="white"
                  strokeWidth="1.5"
                />
                <circle cx="12" cy="10" r="3.5" fill="white" opacity="0.8" />
              </svg>
            }
          />
        );
      })}
    </GoogleMap>
  );
}
