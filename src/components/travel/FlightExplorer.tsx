import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { 
  Plane, Search, Clock, DollarSign, Star, Bookmark,
  AlertCircle, Loader2, ChevronDown, Filter, X, Hotel, MapPin,
  ExternalLink, Calendar, ArrowRight, Users, Bed, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
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

// Airline code to name mapping
const AIRLINE_NAMES: Record<string, string> = {
  'AA': 'American Airlines',
  'UA': 'United Airlines',
  'DL': 'Delta Air Lines',
  'WN': 'Southwest Airlines',
  'B6': 'JetBlue Airways',
  'AS': 'Alaska Airlines',
  'NK': 'Spirit Airlines',
  'F9': 'Frontier Airlines',
  'G4': 'Allegiant Air',
  'HA': 'Hawaiian Airlines',
  'BA': 'British Airways',
  'AF': 'Air France',
  'LH': 'Lufthansa',
  'KL': 'KLM',
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  'SQ': 'Singapore Airlines',
  'CX': 'Cathay Pacific',
  'JL': 'Japan Airlines',
  'NH': 'All Nippon Airways',
  'QF': 'Qantas',
  'AC': 'Air Canada',
  'AM': 'Aeromexico',
  'IB': 'Iberia',
  'AZ': 'ITA Airways',
  'TK': 'Turkish Airlines',
  'EY': 'Etihad Airways',
  'VS': 'Virgin Atlantic',
};

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
  const [expandedFlights, setExpandedFlights] = useState<Set<string>>(new Set());

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

  const formatDate = (isoTime: string) => {
    try {
      return format(new Date(isoTime), 'EEE, MMM d');
    } catch {
      return isoTime;
    }
  };

  const getAirlineName = (code: string) => {
    return AIRLINE_NAMES[code] || code;
  };

  const toggleFlightExpanded = (flightId: string) => {
    setExpandedFlights(prev => {
      const next = new Set(prev);
      if (next.has(flightId)) {
        next.delete(flightId);
      } else {
        next.add(flightId);
      }
      return next;
    });
  };

  // Generate booking links
  const getGoogleFlightsLink = (flight: FlightSearchResult) => {
    const dep = depDate.replace(/-/g, '');
    const ret = retDate ? retDate.replace(/-/g, '') : '';
    const base = `https://www.google.com/travel/flights?q=flights%20from%20${origin}%20to%20${destination}%20on%20${depDate}`;
    return base + (retDate ? `%20return%20${retDate}` : '');
  };

  const getKayakFlightLink = (flight: FlightSearchResult) => {
    const base = `https://www.kayak.com/flights/${origin}-${destination}/${depDate}`;
    return base + (retDate ? `/${retDate}` : '') + '?sort=price_a';
  };

  const getGoogleHotelsLink = (hotel: HotelSearchResult) => {
    const hotelName = encodeURIComponent(hotel.name);
    return `https://www.google.com/travel/hotels?q=${hotelName}%20${hotelCityCode}&dates=${checkInDate},${checkOutDate}`;
  };

  const getBookingLink = (hotel: HotelSearchResult) => {
    const hotelName = encodeURIComponent(hotel.name);
    return `https://www.booking.com/searchresults.html?ss=${hotelName}&checkin=${checkInDate}&checkout=${checkOutDate}`;
  };

  const getHotelsComLink = (hotel: HotelSearchResult) => {
    const hotelName = encodeURIComponent(hotel.name);
    return `https://www.hotels.com/search.do?q-destination=${hotelName}&q-check-in=${checkInDate}&q-check-out=${checkOutDate}`;
  };

  // Calculate nights for hotel
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      {/* Main Tabs - Now More Prominent */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'flights' | 'hotels')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="flights" className="gap-2 text-base">
            <Plane className="h-5 w-5" />
            Flights
            {flightResults.length > 0 && (
              <Badge variant="secondary" className="ml-1">{flightResults.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hotels" className="gap-2 text-base">
            <Hotel className="h-5 w-5" />
            Hotels
            {hotelResults.length > 0 && (
              <Badge variant="secondary" className="ml-1">{hotelResults.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* FLIGHTS TAB */}
        <TabsContent value="flights" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Flights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Flight Results */}
          {flightResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {flightResults.length} flight{flightResults.length !== 1 ? 's' : ''} found
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(depDate)} {retDate && `- ${formatDate(retDate)}`}
                </p>
              </div>
              
              {flightResults.map((flight) => (
                <Card 
                  key={flight.id}
                  className={cn(
                    "overflow-hidden transition-all",
                    isSaved(flight.id) && "ring-2 ring-primary/50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Flight Info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Airline & Flight Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="font-semibold">
                            {flight.airline}
                          </Badge>
                          <span className="text-sm font-medium">{getAirlineName(flight.airline)}</span>
                          <span className="text-xs text-muted-foreground">• {flight.flightNumber}</span>
                          {flight.stops === 0 ? (
                            <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">
                              Nonstop
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-500/10">
                              {flight.stops} stop{flight.stops > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Time & Route Display */}
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xl font-bold">{formatTime(flight.departureTime)}</p>
                            <p className="text-sm font-medium">{origin}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(flight.departureTime)}</p>
                          </div>
                          
                          <div className="flex-1 flex flex-col items-center gap-1 px-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(flight.duration)}
                            </div>
                            <div className="w-full flex items-center gap-1">
                              <div className="h-px flex-1 bg-border" />
                              <Plane className="h-3 w-3 text-muted-foreground rotate-90" />
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            {flight.stops > 0 && flight.segments && (
                              <p className="text-xs text-muted-foreground">
                                via {flight.segments.slice(0, -1).map(s => s.arrivalAirport).join(', ')}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-center">
                            <p className="text-xl font-bold">{formatTime(flight.arrivalTime)}</p>
                            <p className="text-sm font-medium">{destination}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(flight.arrivalTime)}</p>
                          </div>
                        </div>

                        {/* Expandable Segments */}
                        {flight.segments && flight.segments.length > 1 && (
                          <Collapsible 
                            open={expandedFlights.has(flight.id)} 
                            onOpenChange={() => toggleFlightExpanded(flight.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                <ChevronRight className={cn(
                                  "h-3 w-3 transition-transform",
                                  expandedFlights.has(flight.id) && "rotate-90"
                                )} />
                                View {flight.segments.length} flight segments
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                              <div className="space-y-2 pl-2 border-l-2 border-muted">
                                {flight.segments.map((segment, idx) => (
                                  <div key={idx} className="pl-3 py-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Badge variant="outline" className="text-xs">
                                        {segment.flightNumber}
                                      </Badge>
                                      <span className="text-muted-foreground">{getAirlineName(segment.airline)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-sm">
                                      <span className="font-medium">{segment.departureAirport}</span>
                                      <span className="text-xs text-muted-foreground">{formatTime(segment.departureTime)}</span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium">{segment.arrivalAirport}</span>
                                      <span className="text-xs text-muted-foreground">{formatTime(segment.arrivalTime)}</span>
                                      <span className="text-xs text-muted-foreground ml-auto">
                                        {formatDuration(segment.duration)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                      
                      {/* Price & Actions */}
                      <div className="text-right shrink-0 space-y-2">
                        <div>
                          <p className="text-2xl font-bold">${flight.price.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{flight.currency} • per person</p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
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

                        {/* Booking Links */}
                        <Separator className="my-2" />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Book on:</p>
                          <div className="flex flex-col gap-1">
                            <a 
                              href={getGoogleFlightsLink(flight)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Google Flights <ExternalLink className="h-3 w-3" />
                            </a>
                            <a 
                              href={getKayakFlightLink(flight)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Kayak <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Saved Flights */}
          {savedFlights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Saved for Comparison ({savedFlights.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {savedFlights.map((saved) => (
                  <div 
                    key={saved.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{saved.flightData.airline}</Badge>
                      <div>
                        <p className="font-medium">{getAirlineName(saved.flightData.airline)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(saved.flightData.duration)} • {saved.flightData.stops === 0 ? 'Nonstop' : `${saved.flightData.stops} stop${saved.flightData.stops > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">${saved.flightData.price.toLocaleString()}</span>
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
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* HOTELS TAB */}
        <TabsContent value="hotels" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Hotels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {calculateNights() > 0 && `${calculateNights()} night${calculateNights() !== 1 ? 's' : ''}`}
                </p>
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
            </CardContent>
          </Card>

          {/* Hotel Results */}
          {hotelResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {hotelResults.length} hotel{hotelResults.length !== 1 ? 's' : ''} found
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(checkInDate)} - {formatDate(checkOutDate)} • {calculateNights()} nights
                </p>
              </div>
              
              {hotelResults.map((hotel) => (
                <Card key={hotel.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Hotel Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name & Rating */}
                        <div className="flex items-start gap-2 flex-wrap">
                          <h4 className="font-semibold text-lg">{hotel.name}</h4>
                          {hotel.rating && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: hotel.rating }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                              ))}
                              <span className="text-sm text-muted-foreground ml-1">
                                {hotel.rating}-star hotel
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Address */}
                        {hotel.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4 shrink-0" />
                            {hotel.address}
                          </p>
                        )}

                        {/* Room Offers */}
                        {hotel.offers && hotel.offers.length > 0 && (
                          <div className="pt-2 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Available Rooms
                            </p>
                            <div className="space-y-2">
                              {hotel.offers.slice(0, 3).map((offer, idx) => (
                                <div 
                                  key={offer.id || idx}
                                  className="p-2 rounded-md bg-muted/50 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <Bed className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {offer.roomDescription || 'Standard Room'}
                                    </span>
                                  </div>
                                  {offer.price && (
                                    <span className="font-semibold">
                                      ${offer.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{offer.currency}</span>
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Amenities Placeholder */}
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            1 Adult
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {calculateNights()} nights
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Price & Actions */}
                      <div className="text-right shrink-0 space-y-2">
                        {hotel.offers && hotel.offers.length > 0 && hotel.offers[0].price && (
                          <div>
                            <p className="text-xs text-muted-foreground">from</p>
                            <p className="text-2xl font-bold">${hotel.offers[0].price.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {hotel.offers[0].currency} total • ${Math.round(hotel.offers[0].price / calculateNights())}/night
                            </p>
                          </div>
                        )}
                        
                        {onSaveHotel && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onSaveHotel(hotel)}
                          >
                            <Bookmark className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        )}

                        {/* Booking Links */}
                        <Separator className="my-2" />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Book on:</p>
                          <div className="flex flex-col gap-1">
                            <a 
                              href={getGoogleHotelsLink(hotel)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Google Hotels <ExternalLink className="h-3 w-3" />
                            </a>
                            <a 
                              href={getBookingLink(hotel)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Booking.com <ExternalLink className="h-3 w-3" />
                            </a>
                            <a 
                              href={getHotelsComLink(hotel)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Hotels.com <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
    </div>
  );
}
