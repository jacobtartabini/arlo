import { useState, useCallback, useMemo } from "react";
import { MapPin, Search, Bookmark, Star, Navigation, Filter, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripDestination, TripSavedPlace, TripItineraryItem, PlaceCollection } from "@/types/travel";
import { getArloToken } from "@/lib/arloAuth";
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

const COLLECTIONS: { value: PlaceCollection; label: string; icon: string }[] = [
  { value: 'saved', label: 'Saved', icon: '📍' },
  { value: 'must_do', label: 'Must Do', icon: '⭐' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'rainy_day', label: 'Rainy Day', icon: '🌧️' },
  { value: 'night', label: 'Night', icon: '🌙' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'nature', label: 'Nature', icon: '🌿' },
];

export function TripMapTab({
  tripId,
  destinations,
  savedPlaces,
  itineraryItems,
  onSavePlace,
  onUpdatePlace,
  onDeletePlace,
}: TripMapTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<google.maps.places.PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCollection, setActiveCollection] = useState<PlaceCollection | 'all'>('all');

  const primaryDestination = destinations[0];
  
  const filteredPlaces = useMemo(() => {
    if (activeCollection === 'all') return savedPlaces;
    return savedPlaces.filter(p => p.collection === activeCollection);
  }, [savedPlaces, activeCollection]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            input: searchQuery,
            location: primaryDestination ? {
              lat: primaryDestination.latitude,
              lng: primaryDestination.longitude,
            } : undefined,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.predictions || []);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSavePlace = async (result: { place_id?: string; description?: string; structured_formatting?: { main_text?: string } }) => {
    // Get place details
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maps-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'place_details',
            placeId: result.place_id,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const place = data.result;
        
        if (place?.geometry?.location) {
          await onSavePlace(
            place.name || result.structured_formatting?.main_text || 'Unknown Place',
            place.geometry.location.lat,
            place.geometry.location.lng,
            {
              address: place.formatted_address,
              placeId: result.place_id,
              placeTypes: place.types,
              rating: place.rating,
              photoUrl: place.photos?.[0]?.photo_reference 
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
                : undefined,
            }
          );
          setSearchResults([]);
          setSearchQuery("");
        }
      }
    } catch (e) {
      console.error('Save place error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Places
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search restaurants, attractions, cafes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((result: { place_id?: string; description?: string; structured_formatting?: { main_text?: string; secondary_text?: string } }) => (
                <div 
                  key={result.place_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{result.structured_formatting?.main_text}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.structured_formatting?.secondary_text}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSavePlace(result)}
                  >
                    <Bookmark className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collections Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
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

      {/* Saved Places Grid */}
      {filteredPlaces.length === 0 ? (
        <Card className="p-8 text-center">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold">No saved places yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Search and save places you want to visit
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaces.map(place => (
            <Card key={place.id} className="overflow-hidden">
              {place.photoUrl ? (
                <div 
                  className="h-32 bg-cover bg-center"
                  style={{ backgroundImage: `url(${place.photoUrl})` }}
                />
              ) : (
                <div className="h-32 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold line-clamp-1">{place.name}</h3>
                    {place.address && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {place.address}
                      </p>
                    )}
                  </div>
                  {place.rating && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {place.rating}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <select
                    className="text-xs border rounded px-2 py-1 bg-background"
                    value={place.collection}
                    onChange={(e) => onUpdatePlace(place.id, { 
                      collection: e.target.value as PlaceCollection 
                    })}
                  >
                    {COLLECTIONS.map(col => (
                      <option key={col.value} value={col.value}>
                        {col.icon} {col.label}
                      </option>
                    ))}
                  </select>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => onDeletePlace(place.id)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
