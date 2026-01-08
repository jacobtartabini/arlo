import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Utensils, MapPin, Clock, Users, Search, Loader2,
  ExternalLink, Calendar, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TripDestination, TripItineraryItem, ItineraryItemType } from "@/types/travel";

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
  { value: "restaurant", label: "All Cuisines" },
  { value: "italian restaurant", label: "Italian" },
  { value: "japanese restaurant", label: "Japanese" },
  { value: "mexican restaurant", label: "Mexican" },
  { value: "french restaurant", label: "French" },
  { value: "chinese restaurant", label: "Chinese" },
  { value: "indian restaurant", label: "Indian" },
  { value: "thai restaurant", label: "Thai" },
  { value: "mediterranean restaurant", label: "Mediterranean" },
  { value: "american restaurant", label: "American" },
  { value: "korean restaurant", label: "Korean" },
  { value: "vietnamese restaurant", label: "Vietnamese" },
  { value: "seafood restaurant", label: "Seafood" },
  { value: "steakhouse", label: "Steakhouse" },
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
  const [restaurantName, setRestaurantName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [partySize, setPartySize] = useState(2);
  const [cuisine, setCuisine] = useState("restaurant");
  const [addingToItinerary, setAddingToItinerary] = useState(false);

  // Generate booking links
  const generateBookingLinks = useCallback(() => {
    const query = restaurantName.trim() || cuisine;
    const location = searchLocation.trim();
    const encodedQuery = encodeURIComponent(`${query} ${location}`);
    const encodedName = encodeURIComponent(restaurantName || query);
    
    const dateParam = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
    
    return {
      openTable: `https://www.opentable.com/s?term=${encodedName}&covers=${partySize}${dateParam ? `&dateTime=${dateParam}T${selectedTime}` : ''}`,
      google: `https://www.google.com/maps/search/${encodedQuery}`,
      yelp: `https://www.yelp.com/search?find_desc=${encodedQuery}`,
    };
  }, [restaurantName, cuisine, searchLocation, selectedDate, selectedTime, partySize]);

  const handleOpenBookingLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddToItinerary = async () => {
    if (!selectedDate || !restaurantName.trim()) return;
    
    setAddingToItinerary(true);
    
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);
      
      const links = generateBookingLinks();
      
      await onAddToItinerary('restaurant', restaurantName, startTime, {
        description: `${partySize} guests`,
        endTime,
        locationName: restaurantName,
        locationAddress: searchLocation,
        links: [links.openTable, links.google],
      });
      
      // Reset form
      setRestaurantName("");
    } finally {
      setAddingToItinerary(false);
    }
  };

  const bookingLinks = generateBookingLinks();
  const canSearch = searchLocation.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Restaurant Search & Booking Form */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Utensils className="h-5 w-5 text-amber-500" />
            Find & Book Restaurants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location & Restaurant Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <Label className="text-xs text-muted-foreground">Restaurant Name (optional)</Label>
              <Input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Search by name..."
              />
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          </div>

          {/* Cuisine Filter */}
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

          {/* Booking Links */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Book via</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!canSearch}
                onClick={() => handleOpenBookingLink(bookingLinks.openTable)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                OpenTable
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!canSearch}
                onClick={() => handleOpenBookingLink(bookingLinks.google)}
              >
                <MapPin className="h-3.5 w-3.5" />
                Google Maps
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!canSearch}
                onClick={() => handleOpenBookingLink(bookingLinks.yelp)}
              >
                <Search className="h-3.5 w-3.5" />
                Yelp
              </Button>
            </div>
          </div>

          {/* Add to Itinerary */}
          {restaurantName.trim() && selectedDate && (
            <Button 
              onClick={handleAddToItinerary} 
              disabled={addingToItinerary}
              className="w-full"
            >
              {addingToItinerary ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Itinerary
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-border/40 bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Use the booking links above to search for restaurants and make reservations.
            Once you've booked, enter the restaurant name and add it to your itinerary to keep track.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
