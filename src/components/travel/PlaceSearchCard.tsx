import { useState, useCallback } from "react";
import { Search, MapPin, Bookmark, Star, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getArloToken } from "@/lib/arloAuth";
import { PlaceCollection } from "@/types/travel";
import { cn } from "@/lib/utils";

interface PlaceSearchCardProps {
  destinationLat?: number;
  destinationLng?: number;
  onSavePlace: (place: {
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    placeId?: string;
    placeTypes?: string[];
    rating?: number;
    photoUrl?: string;
    collection?: PlaceCollection;
  }) => Promise<void>;
}

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface PlaceDetails {
  name: string;
  address: string;
  location: { lat: number; lng: number };
  types: string[];
  rating?: number;
  photos?: string[];
}

const COLLECTIONS: { value: PlaceCollection; label: string; icon: string }[] = [
  { value: 'saved', label: 'Saved', icon: '📍' },
  { value: 'must_do', label: 'Must Do', icon: '⭐' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'rainy_day', label: 'Rainy Day', icon: '🌧️' },
  { value: 'night', label: 'Nightlife', icon: '🌙' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'nature', label: 'Nature', icon: '🌿' },
];

export function PlaceSearchCard({
  destinationLat,
  destinationLng,
  onSavePlace,
}: PlaceSearchCardProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<PlaceCollection>('saved');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const searchPlaces = useCallback(async () => {
    if (!query.trim() || query.length < 2) {
      setPredictions([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Arlo-Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            query,
            sessionToken: `trip-${Date.now()}`,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPredictions(data.predictions || []);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const fetchPlaceDetails = async (placeId: string) => {
    setIsLoadingDetails(true);
    setSelectedPlaceId(placeId);
    
    try {
      const token = await getArloToken();
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maps-api/place-details`);
      url.searchParams.set('placeId', placeId);
      
      const response = await fetch(url.toString(), {
        headers: {
          'X-Arlo-Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.place) {
          setSelectedPlace({
            name: data.place.name,
            address: data.place.address,
            location: data.place.location,
            types: data.place.types || [],
            rating: data.place.rating,
            photos: data.place.photos,
          });
        }
      }
    } catch (e) {
      console.error('Place details error:', e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPlace) return;
    
    setIsSaving(true);
    try {
      await onSavePlace({
        name: selectedPlace.name,
        address: selectedPlace.address,
        latitude: selectedPlace.location.lat,
        longitude: selectedPlace.location.lng,
        placeId: selectedPlaceId || undefined,
        placeTypes: selectedPlace.types,
        rating: selectedPlace.rating,
        photoUrl: selectedPlace.photos?.[0],
        collection: selectedCollection,
      });
      
      // Reset state
      setQuery("");
      setPredictions([]);
      setSelectedPlace(null);
      setSelectedPlaceId(null);
      setSelectedCollection('saved');
    } finally {
      setIsSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedPlace(null);
    setSelectedPlaceId(null);
    setPredictions([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Places
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search restaurants, attractions, cafes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPlaces()}
                className="pr-8"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button onClick={searchPlaces} disabled={!query.trim() || isSearching}>
              Search
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {predictions.length > 0 && !selectedPlace && (
          <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border p-1">
            {predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                onClick={() => fetchPlaceDetails(prediction.placeId)}
                className={cn(
                  "w-full text-left p-3 rounded-md hover:bg-muted transition-colors",
                  selectedPlaceId === prediction.placeId && isLoadingDetails && "bg-muted"
                )}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{prediction.mainText}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {prediction.secondaryText}
                    </p>
                  </div>
                  {selectedPlaceId === prediction.placeId && isLoadingDetails && (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Place Details */}
        {selectedPlace && (
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold">{selectedPlace.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
                {selectedPlace.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium">{selectedPlace.rating}</span>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={clearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Collection Selector */}
            <div className="flex items-center gap-2">
              <Select value={selectedCollection} onValueChange={(v) => setSelectedCollection(v as PlaceCollection)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLECTIONS.map((col) => (
                    <SelectItem key={col.value} value={col.value}>
                      <span className="flex items-center gap-2">
                        <span>{col.icon}</span>
                        <span>{col.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                className="flex-1" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save to Trip
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State Hint */}
        {!query && predictions.length === 0 && !selectedPlace && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Search for restaurants, attractions, museums, or any place you want to visit
          </p>
        )}
      </CardContent>
    </Card>
  );
}
