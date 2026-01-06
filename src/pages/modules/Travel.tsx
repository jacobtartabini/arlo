import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plane, Plus, MapPin, Calendar, DollarSign, 
  Luggage, ChevronRight, Cloud, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTravelPersistence } from "@/hooks/useTravelPersistence";
import { Trip, TripStatus } from "@/types/travel";
import { CreateTripDialog } from "@/components/travel/CreateTripDialog";
import { TripCard } from "@/components/travel/TripCard";
import { format, differenceInDays, isAfter, isBefore, isToday } from "date-fns";
import { cn } from "@/lib/utils";

export default function Travel() {
  const navigate = useNavigate();
  const { fetchTrips, createTrip, deleteTrip, updateTrip } = useTravelPersistence();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filter, setFilter] = useState<TripStatus | 'all'>('all');

  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTrips();
      setTrips(data);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrips]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

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
  
  const pastTrips = trips.filter(t => 
    t.status === 'completed' || 
    (isBefore(t.endDate, now) && t.status !== 'cancelled')
  ).sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  const filteredTrips = filter === 'all' ? trips : trips.filter(t => t.status === filter);

  const getDaysUntil = (date: Date) => {
    const days = differenceInDays(date, now);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)} days ago`;
    return `${days} days`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10">
                <Luggage className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Travel</h1>
                <p className="text-sm text-muted-foreground">
                  Plan trips, track reservations, explore destinations
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Trip
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Active Trip Banner */}
        {activeTrip && (
          <Card 
            className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-500/20 cursor-pointer hover:border-cyan-500/40 transition-colors"
            onClick={() => navigate(`/travel/${activeTrip.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-cyan-500/20">
                    <Plane className="h-6 w-6 text-cyan-500" />
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-1 bg-cyan-500/20 text-cyan-400">
                      Active Trip
                    </Badge>
                    <h2 className="text-xl font-semibold">{activeTrip.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(activeTrip.startDate, 'MMM d')} - {format(activeTrip.endDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {!isLoading && trips.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Plane className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingTrips.length}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Calendar className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {upcomingTrips[0] ? getDaysUntil(upcomingTrips[0].startDate) : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Next Trip</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <MapPin className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pastTrips.length}</p>
                  <p className="text-xs text-muted-foreground">Past Trips</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{trips.filter(t => t.status === 'planning').length}</p>
                  <p className="text-xs text-muted-foreground">Planning</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'planning', 'active', 'completed'] as const).map(status => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status === 'all' ? 'All Trips' : status}
            </Button>
          ))}
        </div>

        {/* Trips List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-32" />
              </Card>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Plane className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No trips yet</h3>
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
            {filteredTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/travel/${trip.id}`)}
                onDelete={() => handleDeleteTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTripDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTrip={handleCreateTrip}
      />
    </div>
  );
}
