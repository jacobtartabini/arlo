import { useState } from "react";
import { format, addDays } from "date-fns";
import { 
  Plane, Search, Clock, DollarSign, Star, Bookmark,
  AlertCircle, Loader2, ChevronDown, Filter, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getArloToken } from "@/lib/arloAuth";
import { FlightSearchResult, TripSavedFlight } from "@/types/travel";
import { cn } from "@/lib/utils";

interface FlightExplorerProps {
  tripId: string;
  homeAirport?: string;
  destinationAirport?: string;
  departureDate: Date;
  returnDate?: Date;
  savedFlights: TripSavedFlight[];
  onSaveFlight: (flight: FlightSearchResult) => Promise<void>;
  onRemoveFlight: (flightId: string) => Promise<void>;
  onSelectFlight: (flight: FlightSearchResult) => Promise<void>;
}

export function FlightExplorer({
  tripId,
  homeAirport = "",
  destinationAirport = "",
  departureDate,
  returnDate,
  savedFlights,
  onSaveFlight,
  onRemoveFlight,
  onSelectFlight,
}: FlightExplorerProps) {
  const [origin, setOrigin] = useState(homeAirport);
  const [destination, setDestination] = useState(destinationAirport);
  const [depDate, setDepDate] = useState(format(departureDate, 'yyyy-MM-dd'));
  const [retDate, setRetDate] = useState(returnDate ? format(returnDate, 'yyyy-MM-dd') : "");
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FlightSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!origin || !destination || !depDate) return;
    
    setIsSearching(true);
    setError(null);
    setResults([]);
    
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
        setResults(data.flights);
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

  const isSaved = (flightId: string) => 
    savedFlights.some(sf => sf.flightData.id === flightId);

  const formatDuration = (duration: string) => {
    // PT2H30M -> 2h 30m
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
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Explore Flights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              placeholder="SFO"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              maxLength={3}
              className="uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              placeholder="NRT"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              maxLength={3}
              className="uppercase"
            />
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
              onClick={handleSearch} 
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
                  Search
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

        {/* Error/Info Messages */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!isConfigured && (
          <div className="p-4 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            <p className="font-medium">Flight search unavailable</p>
            <p className="mt-1 opacity-80">
              The Amadeus API is not configured. You can still manually add flights to your itinerary.
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length} flight{results.length !== 1 ? 's' : ''} found
            </p>
            
            {results.map((flight) => (
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
      </CardContent>
    </Card>
  );
}
