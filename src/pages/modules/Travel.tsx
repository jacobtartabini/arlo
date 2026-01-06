import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ArrowLeft, Plane, Plus, MapPin, Calendar, 
  Luggage, Clock, RefreshCw, AlertCircle, Sparkles
} from "lucide-react";
import { useTravelPersistence } from "@/hooks/useTravelPersistence";
import { Trip, TripStatus } from "@/types/travel";
import { CreateTripDialog } from "@/components/travel/CreateTripDialog";
import { TripCard } from "@/components/travel/TripCard";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { useAuth } from "@/providers/AuthProvider";

export default function Travel() {
  const navigate = useNavigate();
  const { fetchTrips, createTrip, deleteTrip } = useTravelPersistence();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "planning" | "past" | "all">("upcoming");
  
  // Track if we've already loaded to prevent duplicate fetches
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchTrips();
      setTrips(data);
    } catch (err) {
      console.error('[Travel] Failed to load trips:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data once when authenticated
  useEffect(() => {
    if (isAuthenticated && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadTrips();
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, loadTrips]);

  const handleCreateTrip = async (
    name: string,
    startDate: Date,
    endDate: Date,
    options?: { description?: string; homeAirport?: string; homeCurrency?: string }
  ) => {
    const newTrip = await createTrip(name, startDate, endDate, options);
    if (newTrip) {
      setTrips(prev => [newTrip, ...prev]);
      navigate(`/travel/${newTrip.id}`);
    }
    setShowCreateDialog(false);
  };

  const handleDeleteTrip = async (id: string) => {
    const success = await deleteTrip(id);
    if (success) {
      setTrips(prev => prev.filter(t => t.id !== id));
    }
  };

  // Categorize trips
  const now = new Date();
  const upcomingTrips = trips.filter(t => 
    (t.status === 'planning' || t.status === 'active') && 
    isAfter(t.startDate, now)
  ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  const activeTrip = trips.find(t => 
    t.status === 'active' || 
    (isAfter(now, t.startDate) && isBefore(now, t.endDate))
  );
  
  const planningTrips = trips.filter(t => t.status === 'planning');
  
  const pastTrips = trips.filter(t => 
    t.status === 'completed' || 
    (isBefore(t.endDate, now) && t.status !== 'cancelled')
  ).sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  const getDaysUntil = (date: Date) => {
    const days = differenceInDays(date, now);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)} days ago`;
    return `${days} days`;
  };

  const getTabTrips = () => {
    switch (activeTab) {
      case "upcoming": return upcomingTrips;
      case "planning": return planningTrips;
      case "past": return pastTrips;
      default: return trips;
    }
  };

  const stats = [
    { label: "Upcoming", value: String(upcomingTrips.length), helper: upcomingTrips[0] ? getDaysUntil(upcomingTrips[0].startDate) : "Plan a trip" },
    { label: "Planning", value: String(planningTrips.length), helper: "In progress" },
    { label: "Past Trips", value: String(pastTrips.length), helper: "Memories" },
    { label: "Total", value: String(trips.length), helper: "All time" },
  ];

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Card className="p-8 text-center border-destructive/50">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Failed to load</h2>
            <p className="text-muted-foreground mb-4">{loadError}</p>
            <Button onClick={loadTrips} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="absolute inset-0 opacity-50" aria-hidden>
            <div className="absolute -left-12 top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute right-4 top-0 h-28 w-28 rounded-full bg-muted/50 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border hover:bg-background/80"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 shadow-inner">
                  <Luggage className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">Travel</h1>
                  <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
                    Plan trips, track reservations, explore destinations.
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Trip
            </Button>
          </div>

          {/* Stats */}
          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="group relative overflow-hidden border-border/50 bg-background/70 p-4 shadow-none backdrop-blur"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                  {stat.helper && (
                    <span className="text-xs font-medium text-muted-foreground">{stat.helper}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </header>

        {/* Active Trip Banner */}
        {activeTrip && (
          <Card 
            className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-500/20 cursor-pointer hover:border-cyan-500/40 transition-colors"
            onClick={() => navigate(`/travel/${activeTrip.id}`)}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-cyan-500/20">
                    <Plane className="h-6 w-6 text-cyan-500" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                        Active Trip
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold">{activeTrip.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(activeTrip.startDate, 'MMM d')} - {format(activeTrip.endDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View Trip</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="upcoming" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="planning" className="gap-2">
              <Clock className="h-4 w-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <MapPin className="h-4 w-4" />
              Past Trips
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Calendar className="h-4 w-4" />
              All Trips
            </TabsTrigger>
          </TabsList>

          {["upcoming", "planning", "past", "all"].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-6">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="p-6 animate-pulse">
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-6 w-48 bg-muted rounded mb-4" />
                      <div className="h-4 w-32 bg-muted rounded" />
                    </Card>
                  ))}
                </div>
              ) : getTabTrips().length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-muted">
                      <Plane className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {tab === "upcoming" && "No upcoming trips"}
                        {tab === "planning" && "Nothing in planning"}
                        {tab === "past" && "No past trips yet"}
                        {tab === "all" && "No trips yet"}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Start planning your next adventure
                      </p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)} className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Trip
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getTabTrips().map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onClick={() => navigate(`/travel/${trip.id}`)}
                      onDelete={() => handleDeleteTrip(trip.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <CreateTripDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTrip={handleCreateTrip}
      />
    </div>
  );
}
