import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import {
  Plane,
  Plus,
  MapPin,
  Calendar,
  Luggage,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTravelPersistence } from "@/hooks/useTravelPersistence";
import { Trip } from "@/types/travel";
import { CreateTripDialog } from "@/components/travel/CreateTripDialog";
import { useAuth } from "@/providers/AuthProvider";
import { MobilePageLayout } from "../MobilePageLayout";

export function MobileTravelView() {
  const navigate = useNavigate();
  const { fetchTrips, createTrip, deleteTrip } = useTravelPersistence();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  
  const hasLoadedRef = useRef(false);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTrips();
      setTrips(data);
    } catch (err) {
      console.error('[Travel] Failed to load trips:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const now = new Date();
  const upcomingTrips = trips.filter(t => 
    (t.status === 'planning' || t.status === 'active') && 
    isAfter(t.endDate, now)
  ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  const activeTrip = trips.find(t => 
    t.status === 'active' || 
    (isAfter(now, t.startDate) && isBefore(now, t.endDate))
  );
  
  const pastTrips = trips.filter(t => 
    t.status === 'completed' || 
    (isBefore(t.endDate, now) && t.status !== 'cancelled')
  ).sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  const getDaysUntil = (date: Date) => {
    const days = differenceInDays(date, now);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)}d ago`;
    return `${days}d`;
  };

  const displayTrips = activeTab === "upcoming" ? upcomingTrips : pastTrips;

  if (isLoading) {
    return (
      <MobilePageLayout title="Travel" subtitle="Your trips and adventures">
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout 
      title="Travel"
      subtitle="Your trips and adventures"
      headerRight={
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Active Trip Banner */}
        {activeTrip && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/travel/${activeTrip.id}`)}
            className="w-full p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-500/20">
                <Plane className="h-6 w-6 text-cyan-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="text-xs bg-cyan-500/20 text-cyan-400 border-0">
                    Active Trip
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold">{activeTrip.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {format(activeTrip.startDate, 'MMM d')} - {format(activeTrip.endDate, 'MMM d, yyyy')}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </motion.button>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-xl bg-card border border-border/50 text-center"
          >
            <Sparkles className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{upcomingTrips.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-3 rounded-xl bg-card border border-border/50 text-center"
          >
            <Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-bold">
              {upcomingTrips[0] ? getDaysUntil(upcomingTrips[0].startDate) : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Next trip</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 rounded-xl bg-card border border-border/50 text-center"
          >
            <MapPin className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-bold">{pastTrips.length}</p>
            <p className="text-xs text-muted-foreground">Past trips</p>
          </motion.div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1 rounded-xl bg-muted/50">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "upcoming"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "past"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Past Trips
          </button>
        </div>

        {/* Trip List */}
        <div className="space-y-3">
          {displayTrips.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 rounded-2xl border border-dashed bg-muted/20 text-center"
            >
              <Plane className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium mb-1">
                {activeTab === "upcoming" ? "No upcoming trips" : "No past trips"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {activeTab === "upcoming" 
                  ? "Start planning your next adventure" 
                  : "Your travel memories will appear here"
                }
              </p>
              {activeTab === "upcoming" && (
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Plan a Trip
                </Button>
              )}
            </motion.div>
          ) : (
            displayTrips.map((trip, index) => (
              <motion.button
                key={trip.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/travel/${trip.id}`)}
                className="w-full p-4 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Luggage className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{trip.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === "upcoming" && (
                      <Badge variant="secondary" className="text-xs">
                        {getDaysUntil(trip.startDate)}
                      </Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>

      <CreateTripDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTrip={handleCreateTrip}
      />
    </MobilePageLayout>
  );
}
