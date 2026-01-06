import { useState, useCallback, useMemo, useRef } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { MapPin, Search, Bookmark, Star, Trash2, Layers, List, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripDestination, TripSavedPlace, TripItineraryItem, PlaceCollection } from "@/types/travel";
import { PlaceSearchCard } from "./PlaceSearchCard";
import { useMapContext } from "@/components/maps/MapProvider";
import { cn } from "@/lib/utils";

interface TripMapTabProps {
  tripId: string;
  destinations: TripDestination[];
  savedPlaces: TripSavedPlace[];
  itineraryItems: TripItineraryItem[];
  onSavePlace: (
    name: string,
    latitude: number,
    longitude: number,
    options?: {
      address?: string;
      placeId?: string;
      placeTypes?: string[];
      rating?: number;
      photoUrl?: string;
      collection?: PlaceCollection;
    }
  ) => Promise<TripSavedPlace | null>;
  onUpdatePlace: (id: string, updates: Partial<TripSavedPlace>) => Promise<boolean>;
  onDeletePlace: (id: string) => Promise<boolean>;
}

const COLLECTIONS: { value: PlaceCollection; label: string; icon: string; color: string }[] = [
  { value: 'saved', label: 'Saved', icon: '📍', color: '#6366f1' },
  { value: 'must_do', label: 'Must Do', icon: '⭐', color: '#eab308' },
  { value: 'food', label: 'Food', icon: '🍽️', color: '#f97316' },
  { value: 'rainy_day', label: 'Rainy Day', icon: '🌧️', color: '#06b6d4' },
  { value: 'night', label: 'Nightlife', icon: '🌙', color: '#8b5cf6' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { value: 'nature', label: 'Nature', icon: '🌿', color: '#22c55e' },
];

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const defaultCenter = { lat: 35.6762, lng: 139.6503 }; // Tokyo as fallback

export function TripMapTab({
  tripId,
  destinations,
  savedPlaces,
  itineraryItems,
  onSavePlace,
  onUpdatePlace,
  onDeletePlace,
}: TripMapTabProps) {
  const { isLoaded, apiKeyMissing } = useMapContext();
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const [activeCollection, setActiveCollection] = useState<PlaceCollection | 'all'>('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');

  const primaryDestination = destinations[0];
  
  // Calculate map center from destination or saved places
  const mapCenter = useMemo(() => {
    if (primaryDestination?.latitude && primaryDestination?.longitude) {
      return { lat: primaryDestination.latitude, lng: primaryDestination.longitude };
    }
    if (savedPlaces.length > 0) {
      return { lat: savedPlaces[0].latitude, lng: savedPlaces[0].longitude };
    }
    return defaultCenter;
  }, [primaryDestination, savedPlaces]);

  const filteredPlaces = useMemo(() => {
    if (activeCollection === 'all') return savedPlaces;
    return savedPlaces.filter(p => p.collection === activeCollection);
  }, [savedPlaces, activeCollection]);

  const selectedPlace = useMemo(() => 
    savedPlaces.find(p => p.id === selectedPlaceId),
    [savedPlaces, selectedPlaceId]
  );

  const getCollectionConfig = (collection: PlaceCollection) => 
    COLLECTIONS.find(c => c.value === collection) || COLLECTIONS[0];

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMarkerClick = (placeId: string) => {
    setSelectedPlaceId(placeId);
  };

  const handleSavePlace = async (place: {
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    placeId?: string;
    placeTypes?: string[];
    rating?: number;
    photoUrl?: string;
    collection?: PlaceCollection;
  }) => {
    await onSavePlace(place.name, place.latitude, place.longitude, {
      address: place.address,
      placeId: place.placeId,
      placeTypes: place.placeTypes,
      rating: place.rating,
      photoUrl: place.photoUrl,
      collection: place.collection,
    });
  };

  const fitBoundsToPlaces = useCallback(() => {
    if (!mapRef.current || filteredPlaces.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    filteredPlaces.forEach(place => {
      bounds.extend({ lat: place.latitude, lng: place.longitude });
    });
    if (primaryDestination?.latitude && primaryDestination?.longitude) {
      bounds.extend({ lat: primaryDestination.latitude, lng: primaryDestination.longitude });
    }
    mapRef.current.fitBounds(bounds, 50);
  }, [filteredPlaces, primaryDestination]);

  // Places Grid Component
  const PlacesGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {filteredPlaces.length === 0 ? (
        <div className="col-span-full text-center py-8">
          <Bookmark className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No saved places</p>
          <p className="text-sm text-muted-foreground mt-1">
            Search and save places you want to visit
          </p>
        </div>
      ) : (
        filteredPlaces.map(place => {
          const config = getCollectionConfig(place.collection);
          const isSelected = place.id === selectedPlaceId;
          
          return (
            <div 
              key={place.id}
              onClick={() => setSelectedPlaceId(place.id)}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                isSelected 
                  ? "ring-2 ring-primary border-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-start gap-3">
                {place.photoUrl ? (
                  <div 
                    className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url(${place.photoUrl})` }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-2xl">{config.icon}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-1">{place.name}</h4>
                  {place.address && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {place.address}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {config.icon} {config.label}
                    </Badge>
                    {place.rating && (
                      <span className="flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {place.rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // Map Component
  const MapView = () => {
    if (apiKeyMissing) {
      return (
        <div className="h-[400px] rounded-lg bg-muted flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Map unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">Google Maps API not configured</p>
          </div>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="h-[400px] rounded-lg bg-muted animate-pulse flex items-center justify-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      );
    }

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={13}
        onLoad={handleMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        }}
      >
        {/* Destination marker */}
        {primaryDestination?.latitude && primaryDestination?.longitude && (
          <Marker
            position={{ lat: primaryDestination.latitude, lng: primaryDestination.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            title={primaryDestination.name}
          />
        )}

        {/* Saved place markers */}
        {filteredPlaces.map(place => {
          const config = getCollectionConfig(place.collection);
          const isSelected = place.id === selectedPlaceId;
          
          return (
            <Marker
              key={place.id}
              position={{ lat: place.latitude, lng: place.longitude }}
              onClick={() => handleMarkerClick(place.id)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isSelected ? 12 : 8,
                fillColor: config.color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: isSelected ? 3 : 2,
              }}
              zIndex={isSelected ? 100 : 1}
            />
          );
        })}

        {/* Info window for selected place */}
        {selectedPlace && (
          <InfoWindow
            position={{ lat: selectedPlace.latitude, lng: selectedPlace.longitude }}
            onCloseClick={() => setSelectedPlaceId(null)}
          >
            <div className="p-1 min-w-[200px]">
              <h4 className="font-semibold">{selectedPlace.name}</h4>
              {selectedPlace.address && (
                <p className="text-sm text-gray-600 mt-1">{selectedPlace.address}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Select
                  value={selectedPlace.collection}
                  onValueChange={(v) => onUpdatePlace(selectedPlace.id, { collection: v as PlaceCollection })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLECTIONS.map(col => (
                      <SelectItem key={col.value} value={col.value}>
                        {col.icon} {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    onDeletePlace(selectedPlace.id);
                    setSelectedPlaceId(null);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Card */}
      <PlaceSearchCard
        destinationLat={primaryDestination?.latitude}
        destinationLng={primaryDestination?.longitude}
        onSavePlace={handleSavePlace}
      />

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={activeCollection === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCollection('all')}
          >
            All ({savedPlaces.length})
          </Button>
          {COLLECTIONS.map(col => {
            const count = savedPlaces.filter(p => p.collection === col.value).length;
            if (count === 0) return null;
            return (
              <Button
                key={col.value}
                variant={activeCollection === col.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCollection(col.value)}
              >
                {col.icon} {col.label} ({count})
              </Button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('map')}
            title="Map view"
          >
            <MapIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('split')}
            title="Split view"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          {filteredPlaces.length > 1 && viewMode !== 'list' && (
            <Button
              variant="outline"
              size="sm"
              onClick={fitBoundsToPlaces}
              className="ml-2"
            >
              Fit all
            </Button>
          )}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'map' && (
        <MapView />
      )}
      
      {viewMode === 'list' && (
        <PlacesGrid />
      )}
      
      {viewMode === 'split' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="order-2 lg:order-1">
            <PlacesGrid />
          </div>
          <div className="order-1 lg:order-2 lg:sticky lg:top-4">
            <MapView />
          </div>
        </div>
      )}
    </div>
  );
}
