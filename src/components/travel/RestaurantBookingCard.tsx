import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Utensils, MapPin, Star, Clock, Users, Search, Loader2,
  ExternalLink, Phone, DollarSign, Calendar, ChevronDown, X, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { getArloToken } from "@/lib/arloAuth";
import { cn } from "@/lib/utils";
import { TripDestination, TripItineraryItem, ItineraryItemType } from "@/types/travel";

interface Restaurant {
  id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  cuisine?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  imageUrl?: string;
  yelpUrl?: string;
  isOpen?: boolean;
  bookingLinks?: {
    yelp?: string;
    openTable?: string;
    google?: string;
  };
}

interface RestaurantBookingCardProps {
  tripId: string;
  destinations: TripDestination[];
  onAddToItinerary: (
    type: ItineraryItemType,
    title: string,
    startTime: Date,
    options?: {
      description?: string;
      endTime?: Date;
      locationName?: string;
      locationAddress?: string;
      latitude?: number;
      longitude?: number;
      confirmationCode?: string;
      links?: string[];
    }
  ) => Promise<TripItineraryItem | null>;
}

const CUISINE_OPTIONS = [
  { value: "restaurants", label: "All Cuisines" },
  { value: "italian", label: "Italian" },
  { value: "japanese", label: "Japanese" },
  { value: "mexican", label: "Mexican" },
  { value: "french", label: "French" },
  { value: "chinese", label: "Chinese" },
  { value: "indian", label: "Indian" },
  { value: "thai", label: "Thai" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "american", label: "American" },
  { value: "korean", label: "Korean" },
  { value: "vietnamese", label: "Vietnamese" },
  { value: "seafood", label: "Seafood" },
  { value: "steakhouses", label: "Steakhouse" },
];

const TIME_SLOTS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];

export function RestaurantBookingCard({
  tripId,
  destinations,
  onAddToItinerary,
}: RestaurantBookingCardProps) {
  const [searchLocation, setSearchLocation] = useState(destinations[0]?.name || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [partySize, setPartySize] = useState(2);
  const [cuisine, setCuisine] = useState("restaurants");
  const [priceRange, setPriceRange] = useState<number[]>([1, 2, 3, 4]);
  
  const [isSearching, setIsSearching] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingToItinerary, setAddingToItinerary] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchLocation.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setRestaurants([]);
    setSelectedRestaurant(null);
    
    try {
      const token = await getArloToken();
      const destination = destinations.find(d => 
        d.name.toLowerCase().includes(searchLocation.toLowerCase())
      );
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'restaurant_search',
            location: searchLocation,
            latitude: destination?.latitude,
            longitude: destination?.longitude,
            date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
            time: selectedTime,
            partySize,
            cuisine: cuisine !== "restaurants" ? cuisine : undefined,
            priceRange: priceRange.length < 4 ? priceRange : undefined,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else if (data.restaurants) {
        setRestaurants(data.restaurants);
      }
    } catch (e) {
      setError("Failed to search restaurants");
      console.error('[RestaurantBooking] Search error:', e);
    } finally {
      setIsSearching(false);
    }
  }, [searchLocation, selectedDate, selectedTime, partySize, cuisine, priceRange, destinations]);

  const handleAddToItinerary = async (restaurant: Restaurant) => {
    if (!selectedDate) return;
    
    setAddingToItinerary(restaurant.id);
    
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2); // 2 hour reservation
      
      const links = [
        restaurant.yelpUrl,
        restaurant.bookingLinks?.openTable,
      ].filter(Boolean) as string[];
      
      await onAddToItinerary('restaurant', restaurant.name, startTime, {
        description: `${partySize} guests · ${restaurant.cuisine || 'Restaurant'}`,
        endTime,
        locationName: restaurant.name,
        locationAddress: restaurant.address,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        links,
      });
      
      setSelectedRestaurant(null);
    } finally {
      setAddingToItinerary(null);
    }
  };

  const togglePriceRange = (price: number) => {
    setPriceRange(prev => 
      prev.includes(price) 
        ? prev.filter(p => p !== price)
        : [...prev, price].sort()
    );
  };

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return (
      <span className="text-muted-foreground">
        {'$'.repeat(level)}
        <span className="opacity-30">{'$'.repeat(4 - level)}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Utensils className="h-5 w-5 text-amber-500" />
            Find Restaurants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location & Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="City or neighborhood"
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarUI
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(time => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Party Size & Cuisine Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Party Size</Label>
              <Select value={partySize.toString()} onValueChange={(v) => setPartySize(parseInt(v))}>
                <SelectTrigger>
                  <Users className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} {n === 1 ? 'guest' : 'guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cuisine</Label>
              <Select value={cuisine} onValueChange={setCuisine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUISINE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Price Range</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(price => (
                  <Button
                    key={price}
                    variant={priceRange.includes(price) ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => togglePriceRange(price)}
                  >
                    {'$'.repeat(price)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Button */}
          <Button 
            onClick={handleSearch} 
            disabled={!searchLocation.trim() || isSearching}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Restaurants
              </>
            )}
          </Button>
          
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {restaurants.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {restaurants.length} restaurants found
          </h3>
          
          <div className="grid gap-3">
            {restaurants.map((restaurant) => (
              <Card 
                key={restaurant.id}
                className={cn(
                  "overflow-hidden transition-all cursor-pointer hover:border-primary/50",
                  selectedRestaurant?.id === restaurant.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedRestaurant(
                  selectedRestaurant?.id === restaurant.id ? null : restaurant
                )}
              >
                <div className="flex">
                  {/* Image */}
                  {restaurant.imageUrl && (
                    <div className="w-24 h-24 md:w-32 md:h-32 shrink-0">
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 p-3 md:p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{restaurant.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {restaurant.cuisine}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {restaurant.rating && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {restaurant.rating}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {renderPriceLevel(restaurant.priceLevel)}
                      {restaurant.reviewCount && (
                        <span>({restaurant.reviewCount} reviews)</span>
                      )}
                      {restaurant.isOpen !== undefined && (
                        <Badge variant={restaurant.isOpen ? "default" : "secondary"} className="text-xs">
                          {restaurant.isOpen ? "Open" : "Closed"}
                        </Badge>
                      )}
                    </div>
                    
                    {restaurant.address && (
                      <p className="mt-1.5 text-xs text-muted-foreground truncate">
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {restaurant.address}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Expanded Actions */}
                {selectedRestaurant?.id === restaurant.id && (
                  <div className="border-t p-3 md:p-4 bg-muted/30 space-y-3">
                    {/* Booking Links */}
                    <div className="flex flex-wrap gap-2">
                      {restaurant.bookingLinks?.openTable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(restaurant.bookingLinks!.openTable, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          OpenTable
                        </Button>
                      )}
                      {restaurant.yelpUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(restaurant.yelpUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Yelp
                        </Button>
                      )}
                      {restaurant.bookingLinks?.google && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(restaurant.bookingLinks!.google, '_blank');
                          }}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Google Maps
                        </Button>
                      )}
                      {restaurant.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${restaurant.phone}`, '_blank');
                          }}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </Button>
                      )}
                    </div>
                    
                    {/* Add to Itinerary */}
                    {selectedDate && (
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToItinerary(restaurant);
                        }}
                        disabled={addingToItinerary === restaurant.id}
                      >
                        {addingToItinerary === restaurant.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Itinerary for {format(selectedDate, 'MMM d')} at {format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}
                          </>
                        )}
                      </Button>
                    )}
                    
                    {!selectedDate && (
                      <p className="text-sm text-center text-muted-foreground">
                        Select a date above to add this reservation to your trip
                      </p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isSearching && restaurants.length === 0 && !error && (
        <Card className="p-8 text-center">
          <Utensils className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">Find the perfect restaurant</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Search for restaurants at your destination, then book through OpenTable, Yelp, or Google Maps
          </p>
        </Card>
      )}
    </div>
  );
}