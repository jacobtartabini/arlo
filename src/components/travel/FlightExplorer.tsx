import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Plane, Search, Clock, DollarSign, Star, Bookmark,
  AlertCircle, Loader2, ChevronDown, Filter, X, Hotel, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getArloToken } from "@/lib/arloAuth";
import { FlightSearchResult, TripSavedFlight, HotelSearchResult } from "@/types/travel";
import { cn } from "@/lib/utils";

interface AirportSuggestion {
  code: string;
  name: string;
  type: string;
  city?: string;
  country?: string;
}

interface FlightExplorerProps {
  tripId: string;
  homeAirport?: string;
  destinationAirport?: string;
  destinationCityCode?: string;
  departureDate: Date;
  returnDate?: Date;
  savedFlights: TripSavedFlight[];
  onSaveFlight: (flight: FlightSearchResult) => Promise<void>;
  onRemoveFlight: (flightId: string) => Promise<void>;
  onSelectFlight: (flight: FlightSearchResult) => Promise<void>;
  onSaveHotel?: (hotel: HotelSearchResult) => Promise<void>;
}

export function FlightExplorer({
  tripId,
  homeAirport = "",
  destinationAirport = "",
  destinationCityCode = "",
  departureDate,
  returnDate,
  savedFlights,
  onSaveFlight,
  onRemoveFlight,
  onSelectFlight,
  onSaveHotel,
}: FlightExplorerProps) {
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels'>('flights');
  
  // Flight search state
  const [origin, setOrigin] = useState(homeAirport);
  const [destination, setDestination] = useState(destinationAirport);
  const [depDate, setDepDate] = useState(format(departureDate, 'yyyy-MM-dd'));
  const [retDate, setRetDate] = useState(returnDate ? format(returnDate, 'yyyy-MM-dd') : "");
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  
  // Hotel search state
  const [hotelCityCode, setHotelCityCode] = useState(destinationCityCode || destinationAirport);
  const [checkInDate, setCheckInDate] = useState(format(departureDate, 'yyyy-MM-dd'));
  const [checkOutDate, setCheckOutDate] = useState(returnDate ? format(returnDate, 'yyyy-MM-dd') : "");
  
  // Airport autocomplete state
  const [originSuggestions, setOriginSuggestions] = useState<AirportSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AirportSuggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [searchingAirports, setSearchingAirports] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [flightResults, setFlightResults] = useState<FlightSearchResult[]>([]);
  const [hotelResults, setHotelResults] = useState<HotelSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Debounced airport search
  useEffect(() => {
    if (origin.length >= 2 && origin.length < 4) {
      const timer = setTimeout(() => searchAirports(origin, 'origin'), 300);
      return () => clearTimeout(timer);
    } else {
      setOriginSuggestions([]);
    }
  }, [origin]);

  useEffect(() => {
    if (destination.length >= 2 && destination.length < 4) {
      const timer = setTimeout(() => searchAirports(destination, 'destination'), 300);
      return () => clearTimeout(timer);
    } else {
      setDestSuggestions([]);
    }
  }, [destination]);

  const searchAirports = async (keyword: string, field: 'origin' | 'destination') => {
    setSearchingAirports(true);
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'airport_search',
            keyword,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.locations) {
        if (field === 'origin') {
          setOriginSuggestions(data.locations);
          setShowOriginSuggestions(true);
        } else {
          setDestSuggestions(data.locations);
          setShowDestSuggestions(true);
        }
      }
    } catch (e) {
      console.error('Airport search error:', e);
    } finally {
      setSearchingAirports(false);
    }
  };

  const selectAirport = (airport: AirportSuggestion, field: 'origin' | 'destination') => {
    if (field === 'origin') {
      setOrigin(airport.code);
      setShowOriginSuggestions(false);
    } else {
      setDestination(airport.code);
      setHotelCityCode(airport.code);
      setShowDestSuggestions(false);
    }
  };

  const handleFlightSearch = async () => {
    if (!origin || !destination || !depDate) return;
    
    setIsSearching(true);
    setError(null);
    setFlightResults([]);
    
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'flight_search',
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departureDate: depDate,
            returnDate: retDate || undefined,
            nonstop: nonstopOnly,
            maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
            adults: 1,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.configured === false) {
        setIsConfigured(false);
        setError("Flight search is not configured. Contact your administrator to enable the Amadeus API.");
      } else if (data.error) {
        setError(data.error);
      } else if (data.flights) {
        setFlightResults(data.flights);
        if (data.flights.length === 0) {
          setError("No flights found for these criteria. Try adjusting your dates or filters.");
        }
      }
    } catch (e) {
      console.error('Flight search error:', e);
      setError("Failed to search flights. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleHotelSearch = async () => {
    if (!hotelCityCode || !checkInDate || !checkOutDate) return;
    
    setIsSearching(true);
    setError(null);
    setHotelResults([]);
    
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'hotel_search',
            cityCode: hotelCityCode.toUpperCase(),
            checkInDate,
            checkOutDate,
            adults: 1,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.configured === false) {
        setIsConfigured(false);
        setError("Hotel search is not configured. Contact your administrator to enable the Amadeus API.");
      } else if (data.error) {
        setError(data.error);
      } else if (data.hotels) {
        setHotelResults(data.hotels);
        if (data.hotels.length === 0) {
          setError("No hotels found for these criteria. Try adjusting your dates or city.");
        }
      }
    } catch (e) {
      console.error('Hotel search error:', e);
      setError("Failed to search hotels. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const isSaved = (flightId: string) => 
    savedFlights.some(sf => sf.flightData.id === flightId);

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+)H(?:(\d+)M)?/);
    if (match) {
      const hours = match[1];
      const mins = match[2] || '0';
      return `${hours}h ${mins}m`;
    }
    return duration;
  };

  const formatTime = (isoTime: string) => {
    try {
      return format(new Date(isoTime), 'h:mm a');
    } catch {
      return isoTime;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Explore Travel Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'flights' | 'hotels')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flights" className="gap-2">
              <Plane className="h-4 w-4" />
              Flights
            </TabsTrigger>
            <TabsTrigger value="hotels" className="gap-2">
              <Hotel className="h-4 w-4" />
              Hotels
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="flights" className="space-y-4 mt-4">
            {/* Flight Search Form */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5 relative">
                <Label className="text-xs">From</Label>
                <Input
                  placeholder="Search city or airport"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  onFocus={() => originSuggestions.length > 0 && setShowOriginSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                  className="uppercase"
                />
                {showOriginSuggestions && originSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {originSuggestions.map((airport) => (
                      <button
                        key={airport.code}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                        onMouseDown={() => selectAirport(airport, 'origin')}
                      >
                        <span className="font-medium">{airport.code}</span>
                        <span className="text-muted-foreground ml-2">
                          {airport.city || airport.name}, {airport.country}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 relative">
                <Label className="text-xs">To</Label>
                <Input
                  placeholder="Search city or airport"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.toUpperCase())}
                  onFocus={() => destSuggestions.length > 0 && setShowDestSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                  className="uppercase"
                />
                {showDestSuggestions && destSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {destSuggestions.map((airport) => (
                      <button
                        key={airport.code}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                        onMouseDown={() => selectAirport(airport, 'destination')}
                      >
                        <span className="font-medium">{airport.code}</span>
                        <span className="text-muted-foreground ml-2">
                          {airport.city || airport.name}, {airport.country}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Depart</Label>
                <Input
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Return</Label>
                <Input
                  type="date"
                  value={retDate}
                  onChange={(e) => setRetDate(e.target.value)}
                />
              </div>
            </div>

            {/* Filters Toggle */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Filters
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <Button 
                  onClick={handleFlightSearch} 
                  disabled={!origin || !destination || !depDate || isSearching}
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Flights
                    </>
                  )}
                </Button>
              </div>
              
              <CollapsibleContent className="pt-3">
                <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="nonstop"
                      checked={nonstopOnly}
                      onCheckedChange={setNonstopOnly}
                    />
                    <Label htmlFor="nonstop" className="text-sm">Nonstop only</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Max price:</Label>
                    <Input
                      type="number"
                      placeholder="Any"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Flight Results */}
            {flightResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {flightResults.length} flight{flightResults.length !== 1 ? 's' : ''} found
                </p>
                
                {flightResults.map((flight) => (
                  <div 
                    key={flight.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      isSaved(flight.id) && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{flight.airline}</Badge>
                          <span className="text-sm text-muted-foreground">{flight.flightNumber}</span>
                          {flight.stops === 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-600/30">
                              Nonstop
                            </Badge>
                          )}
                          {flight.stops > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {flight.stops} stop{flight.stops > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <p className="font-semibold">{formatTime(flight.departureTime)}</p>
                            <p className="text-muted-foreground text-xs">{origin}</p>
                          </div>
                          <div className="flex-1 flex items-center gap-2 px-2">
                            <div className="h-px flex-1 bg-border" />
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(flight.duration)}
                            </div>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatTime(flight.arrivalTime)}</p>
                            <p className="text-muted-foreground text-xs">{destination}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">${flight.price}</p>
                        <p className="text-xs text-muted-foreground">{flight.currency}</p>
                        <div className="flex gap-1 mt-2">
                          {isSaved(flight.id) ? (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => {
                                const saved = savedFlights.find(sf => sf.flightData.id === flight.id);
                                if (saved) onRemoveFlight(saved.id);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onSaveFlight(flight)}
                            >
                              <Bookmark className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Saved Flights */}
            {savedFlights.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Saved for comparison ({savedFlights.length})
                </h4>
                <div className="space-y-2">
                  {savedFlights.map((saved) => (
                    <div 
                      key={saved.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{saved.flightData.airline}</Badge>
                        <span className="font-medium">${saved.flightData.price}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(saved.flightData.duration)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => onSelectFlight(saved.flightData)}
                        >
                          Add to Trip
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => onRemoveFlight(saved.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="hotels" className="space-y-4 mt-4">
            {/* Hotel Search Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">City Code</Label>
                <Input
                  placeholder="PAR, NYC, TYO..."
                  value={hotelCityCode}
                  onChange={(e) => setHotelCityCode(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">Use airport/city code</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Check-in</Label>
                <Input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Check-out</Label>
                <Input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleHotelSearch} 
                disabled={!hotelCityCode || !checkInDate || !checkOutDate || isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Hotels
                  </>
                )}
              </Button>
            </div>

            {/* Hotel Results */}
            {hotelResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {hotelResults.length} hotel{hotelResults.length !== 1 ? 's' : ''} found
                </p>
                
                {hotelResults.map((hotel) => (
                  <div 
                    key={hotel.id}
                    className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{hotel.name}</h4>
                          {hotel.rating && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: hotel.rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          )}
                        </div>
                        {hotel.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {hotel.address}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right shrink-0">
                        {hotel.offers && hotel.offers.length > 0 && hotel.offers[0].price && (
                          <>
                            <p className="text-lg font-bold">${hotel.offers[0].price}</p>
                            <p className="text-xs text-muted-foreground">{hotel.offers[0].currency}</p>
                          </>
                        )}
                        {onSaveHotel && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="mt-2"
                            onClick={() => onSaveHotel(hotel)}
                          >
                            <Bookmark className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Error/Info Messages */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!isConfigured && (
          <div className="p-4 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            <p className="font-medium">Search unavailable</p>
            <p className="mt-1 opacity-80">
              The Amadeus API is not configured. You can still manually add items to your itinerary.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}