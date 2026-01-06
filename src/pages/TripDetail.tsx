import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays, eachDayOfInterval } from "date-fns";
import {
  ArrowLeft, Plane, MapPin, Calendar, DollarSign, 
  List, Plus, RefreshCw,
  Bookmark, Clock, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTravelPersistence } from "@/hooks/useTravelPersistence";
import { useAuth } from "@/providers/AuthProvider";
import { 
  Trip, TripDestination, TripItineraryItem, TripSavedPlace, 
  TripExpense, TripSavedFlight, FlightSearchResult 
} from "@/types/travel";
import { TripItineraryTab } from "@/components/travel/TripItineraryTab";
import { TripMapTab } from "@/components/travel/TripMapTab";
import { TripBudgetTab } from "@/components/travel/TripBudgetTab";
import { TripReservationsTab } from "@/components/travel/TripReservationsTab";
import { TripWeatherWidget } from "@/components/travel/TripWeatherWidget";
import { TripCurrencyWidget } from "@/components/travel/TripCurrencyWidget";
import { TripPlanningAssistant } from "@/components/travel/TripPlanningAssistant";
import { FlightExplorer } from "@/components/travel/FlightExplorer";
import { AddDestinationDialog } from "@/components/travel/AddDestinationDialog";
import { MapProvider } from "@/components/maps/MapProvider";
import { cn } from "@/lib/utils";

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    fetchTrip,
    fetchDestinations,
    fetchItineraryItems,
    fetchSavedPlaces,
    fetchExpenses,
    createDestination,
    createItineraryItem,
    updateItineraryItem,
    deleteItineraryItem,
    createSavedPlace,
    updateSavedPlace,
    deleteSavedPlace,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useTravelPersistence();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [destinations, setDestinations] = useState<TripDestination[]>([]);
  const [itineraryItems, setItineraryItems] = useState<TripItineraryItem[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<TripSavedPlace[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [savedFlights, setSavedFlights] = useState<TripSavedFlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddDestination, setShowAddDestination] = useState(false);
  
  // Track if we've already loaded to prevent duplicate fetches
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const loadTripData = useCallback(async () => {
    if (!tripId) return;
    
    setIsLoading(true);
    try {
      const [tripData, destData, itinData, placesData, expData] = await Promise.all([
        fetchTrip(tripId),
        fetchDestinations(tripId),
        fetchItineraryItems(tripId),
        fetchSavedPlaces(tripId),
        fetchExpenses(tripId),
      ]);
      
      setTrip(tripData);
      setDestinations(destData);
      setItineraryItems(itinData);
      setSavedPlaces(placesData);
      setExpenses(expData);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data once when authenticated
  useEffect(() => {
    if (isAuthenticated && tripId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadTripData();
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, tripId, loadTripData]);

  // Reset loaded ref when tripId changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [tripId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
          <Button onClick={() => navigate('/travel')}>Back to Trips</Button>
        </div>
      </div>
    );
  }

  const tripDays = eachDayOfInterval({ start: trip.startDate, end: trip.endDate });
  const tripLength = differenceInDays(trip.endDate, trip.startDate) + 1;
  const primaryDestination = destinations[0];

  // Calculate budget summary
  const totalPlanned = expenses.filter(e => e.isPlanned).reduce((sum, e) => sum + e.amount, 0);

  const handleAddDestination = async (
    name: string,
    options?: {
      address?: string;
      latitude?: number;
      longitude?: number;
      placeId?: string;
      timezone?: string;
      currency?: string;
    }
  ) => {
    const dest = await createDestination(tripId!, name, {
      ...options,
      orderIndex: destinations.length,
    });
    if (dest) {
      setDestinations(prev => [...prev, dest]);
    }
    setShowAddDestination(false);
  };

  return (
    <MapProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/travel')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{trip.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')} · {tripLength} days
                  {primaryDestination && ` · ${primaryDestination.name}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                hasLoadedRef.current = false;
                loadTripData();
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview" className="gap-2">
                <List className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="gap-2">
                <Calendar className="h-4 w-4" />
                Itinerary
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-2">
                <MapPin className="h-4 w-4" />
                Places
              </TabsTrigger>
              <TabsTrigger value="reservations" className="gap-2">
                <Plane className="h-4 w-4" />
                Flights
              </TabsTrigger>
              <TabsTrigger value="budget" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Planning Assistant */}
              <TripPlanningAssistant
                trip={trip}
                destinations={destinations}
                itineraryItems={itineraryItems}
                savedPlaces={savedPlaces}
                expenses={expenses}
                onNavigateTab={setActiveTab}
                onAddDestination={() => setShowAddDestination(true)}
              />

              {/* Destinations */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Destinations</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowAddDestination(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent>
                  {destinations.length === 0 ? (
                    <div className="text-center py-4">
                      <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">Where are you going?</p>
                      <Button 
                        variant="link" 
                        className="mt-1"
                        onClick={() => setShowAddDestination(true)}
                      >
                        Add your first destination
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {destinations.map((dest) => (
                        <Badge key={dest.id} variant="secondary" className="py-1.5 px-3">
                          <MapPin className="h-3 w-3 mr-1" />
                          {dest.name}
                          {dest.currency && dest.currency !== trip.homeCurrency && (
                            <span className="ml-2 text-xs opacity-70">{dest.currency}</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Calendar className="h-4 w-4 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{itineraryItems.length}</p>
                      <p className="text-xs text-muted-foreground">Activities</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Bookmark className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{savedPlaces.length}</p>
                      <p className="text-xs text-muted-foreground">Saved Places</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <DollarSign className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        ${totalPlanned.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Budget</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{tripLength}</p>
                      <p className="text-xs text-muted-foreground">Days</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Live Utilities */}
              <div className="grid md:grid-cols-2 gap-4">
                {primaryDestination && (
                  <TripWeatherWidget
                    destination={primaryDestination}
                    tripDates={{ start: trip.startDate, end: trip.endDate }}
                  />
                )}
                {primaryDestination?.currency && primaryDestination.currency !== trip.homeCurrency && (
                  <TripCurrencyWidget
                    fromCurrency={trip.homeCurrency}
                    toCurrency={primaryDestination.currency}
                  />
                )}
              </div>

              {/* Upcoming Items */}
              {itineraryItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upcoming</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {itineraryItems.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className={cn(
                          "p-2 rounded-lg",
                          item.itemType === 'flight' && "bg-cyan-500/10",
                          item.itemType === 'lodging' && "bg-purple-500/10",
                          item.itemType === 'activity' && "bg-green-500/10",
                          item.itemType === 'restaurant' && "bg-amber-500/10",
                          item.itemType === 'transit' && "bg-blue-500/10",
                        )}>
                          {item.itemType === 'flight' && <Plane className="h-4 w-4 text-cyan-500" />}
                          {item.itemType === 'lodging' && <MapPin className="h-4 w-4 text-purple-500" />}
                          {item.itemType === 'activity' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {item.itemType === 'restaurant' && <MapPin className="h-4 w-4 text-amber-500" />}
                          {item.itemType === 'transit' && <MapPin className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(item.startTime, 'MMM d, h:mm a')}
                            {item.locationName && ` · ${item.locationName}`}
                          </p>
                        </div>
                        {item.confirmationCode && (
                          <Badge variant="outline" className="text-xs">
                            {item.confirmationCode}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Itinerary Tab */}
            <TabsContent value="itinerary">
              <TripItineraryTab
                tripId={tripId!}
                tripDays={tripDays}
                items={itineraryItems}
                destinations={destinations}
                onCreateItem={async (type, title, startTime, options) => {
                  const item = await createItineraryItem(tripId!, type, title, startTime, options);
                  if (item) {
                    setItineraryItems(prev => [...prev, item].sort((a, b) => 
                      a.startTime.getTime() - b.startTime.getTime()
                    ));
                    // Auto-add to budget if cost is specified
                    if (options?.cost) {
                      const categoryMap: Record<string, string> = {
                        flight: 'flights',
                        lodging: 'lodging',
                        activity: 'activities',
                        restaurant: 'food',
                        transit: 'transport',
                      };
                      const category = categoryMap[type] || 'miscellaneous';
                      await createExpense(tripId!, category as any, title, options.cost, {
                        currency: trip.homeCurrency,
                        isPlanned: true,
                        itineraryItemId: item.id,
                      });
                    }
                  }
                  return item;
                }}
                onUpdateItem={async (id, updates) => {
                  const success = await updateItineraryItem(id, updates);
                  if (success) {
                    setItineraryItems(prev => prev.map(i => 
                      i.id === id ? { ...i, ...updates } : i
                    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
                  }
                  return success;
                }}
                onDeleteItem={async (id) => {
                  const success = await deleteItineraryItem(id);
                  if (success) {
                    setItineraryItems(prev => prev.filter(i => i.id !== id));
                  }
                  return success;
                }}
              />
            </TabsContent>

            {/* Map & Places Tab */}
            <TabsContent value="map">
              <TripMapTab
                tripId={tripId!}
                destinations={destinations}
                savedPlaces={savedPlaces}
                itineraryItems={itineraryItems}
                onSavePlace={async (name, lat, lng, options) => {
                  const place = await createSavedPlace(tripId!, name, lat, lng, options);
                  if (place) setSavedPlaces(prev => [place, ...prev]);
                  return place;
                }}
                onUpdatePlace={async (id, updates) => {
                  const success = await updateSavedPlace(id, updates);
                  if (success) {
                    setSavedPlaces(prev => prev.map(p => 
                      p.id === id ? { ...p, ...updates } : p
                    ));
                  }
                  return success;
                }}
                onDeletePlace={async (id) => {
                  const success = await deleteSavedPlace(id);
                  if (success) setSavedPlaces(prev => prev.filter(p => p.id !== id));
                  return success;
                }}
              />
            </TabsContent>

            {/* Flights & Hotels Tab */}
            <TabsContent value="reservations" className="space-y-6">
              {/* Flight & Hotel Explorer */}
              <FlightExplorer
                tripId={tripId!}
                homeAirport={trip.homeAirport}
                destinationAirport={primaryDestination?.name?.slice(0, 3).toUpperCase()}
                destinationCityCode={primaryDestination?.name?.slice(0, 3).toUpperCase()}
                departureDate={trip.startDate}
                returnDate={trip.endDate}
                savedFlights={savedFlights}
                onSaveFlight={async (flight: FlightSearchResult) => {
                  // Save flight for comparison
                  const saved: TripSavedFlight = {
                    id: crypto.randomUUID(),
                    tripId: tripId!,
                    flightData: flight,
                    isSelected: false,
                    createdAt: new Date(),
                  };
                  setSavedFlights(prev => [...prev, saved]);
                }}
                onRemoveFlight={async (flightId: string) => {
                  setSavedFlights(prev => prev.filter(f => f.id !== flightId));
                }}
                onSelectFlight={async (flight: FlightSearchResult) => {
                  // Add flight to itinerary
                  const item = await createItineraryItem(tripId!, 'flight', 
                    `${flight.airline} ${flight.flightNumber}`, 
                    new Date(flight.departureTime), 
                    {
                      endTime: new Date(flight.arrivalTime),
                      cost: flight.price,
                      costCurrency: flight.currency,
                    }
                  );
                  if (item) {
                    setItineraryItems(prev => [...prev, item].sort((a, b) => 
                      a.startTime.getTime() - b.startTime.getTime()
                    ));
                    // Auto-add to budget
                    await createExpense(tripId!, 'flights', `${flight.airline} ${flight.flightNumber}`, flight.price, {
                      currency: flight.currency,
                      isPlanned: true,
                      itineraryItemId: item.id,
                    });
                  }
                  // Remove from saved
                  setSavedFlights(prev => prev.filter(f => f.flightData.id !== flight.id));
                }}
              />

              {/* Reservations Section */}
              <TripReservationsTab
                tripId={tripId!}
                itineraryItems={itineraryItems}
                onCreateFromReservation={async (type, title, startTime, options) => {
                  const item = await createItineraryItem(tripId!, type, title, startTime, options);
                  if (item) {
                    setItineraryItems(prev => [...prev, item].sort((a, b) => 
                      a.startTime.getTime() - b.startTime.getTime()
                    ));
                    // Auto-add to budget for flights
                    if (type === 'flight' && options?.cost) {
                      await createExpense(tripId!, 'flights', title, options.cost, {
                        currency: trip.homeCurrency,
                        isPlanned: true,
                        itineraryItemId: item.id,
                      });
                    }
                  }
                  return item;
                }}
              />
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent value="budget">
              <TripBudgetTab
                tripId={tripId!}
                expenses={expenses}
                homeCurrency={trip.homeCurrency}
                destinationCurrency={primaryDestination?.currency}
                onCreateExpense={async (category, description, amount, options) => {
                  const expense = await createExpense(tripId!, category, description, amount, options);
                  if (expense) setExpenses(prev => [expense, ...prev]);
                  return expense;
                }}
                onUpdateExpense={async (id, updates) => {
                  const success = await updateExpense(id, updates);
                  if (success) {
                    setExpenses(prev => prev.map(e => 
                      e.id === id ? { ...e, ...updates } : e
                    ));
                  }
                  return success;
                }}
                onDeleteExpense={async (id) => {
                  const success = await deleteExpense(id);
                  if (success) setExpenses(prev => prev.filter(e => e.id !== id));
                  return success;
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        <AddDestinationDialog
          open={showAddDestination}
          onOpenChange={setShowAddDestination}
          onAdd={handleAddDestination}
        />
      </div>
    </MapProvider>
  );
}
