import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Activity,
  Flame,
  Clock,
  TrendingUp,
  Mountain,
  Loader2,
  RefreshCw,
  Link2,
  Unlink,
  Footprints,
  Bike,
  Waves,
  ArrowLeft,
  Zap,
  Timer,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useAuth } from "@/providers/AuthProvider";
import { invokeEdgeFunction } from "@/lib/edge-functions";

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  suffer_score?: number;
  has_heartrate: boolean;
  kudos_count: number;
  map_polyline?: string;
}

interface StravaStats {
  recent_runs: StravaTotals;
  recent_rides: StravaTotals;
  recent_swims: StravaTotals;
  ytd_runs: StravaTotals;
  ytd_rides: StravaTotals;
  all_runs: StravaTotals;
  all_rides: StravaTotals;
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
}

interface StravaTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count?: number;
}

interface HRZone {
  min: number;
  max: number;
  distribution_buckets?: { min: number; max: number; time: number }[];
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPace(speedMs: number, type: string): string {
  if (speedMs <= 0) return "—";
  if (type.toLowerCase().includes("ride") || type.toLowerCase().includes("cycle")) {
    return `${(speedMs * 3.6).toFixed(1)} km/h`;
  }
  const paceMinPerKm = 1000 / speedMs / 60;
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

function activityIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("run")) return <Footprints className="h-4 w-4" />;
  if (t.includes("ride") || t.includes("cycle")) return <Bike className="h-4 w-4" />;
  if (t.includes("swim")) return <Waves className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export default function Health() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [connected, setConnected] = useState<boolean | null>(null);
  const [athleteName, setAthleteName] = useState("");
  const [athleteAvatar, setAthleteAvatar] = useState("");

  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [stats, setStats] = useState<StravaStats | null>(null);
  const [zones, setZones] = useState<{ heart_rate?: { zones: HRZone[] } } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = "Arlo · Health";
  }, []);

  // Check connection status
  const checkStatus = useCallback(async () => {
    const result = await invokeEdgeFunction<{ connected: boolean; athlete?: { name: string; avatar: string } }>(
      "strava-api",
      { action: "status" }
    );
    if (result.ok && result.data) {
      setConnected(result.data.connected);
      if (result.data.athlete) {
        setAthleteName(result.data.athlete.name || "");
        setAthleteAvatar(result.data.athlete.avatar || "");
      }
      return result.data.connected;
    }
    setConnected(false);
    return false;
  }, []);

  // Load all Strava data
  const loadData = useCallback(async () => {
    const [actResult, statsResult, zonesResult] = await Promise.all([
      invokeEdgeFunction<{ activities: StravaActivity[] }>("strava-api", { action: "activities", per_page: 10 }),
      invokeEdgeFunction<{ stats: StravaStats }>("strava-api", { action: "stats" }),
      invokeEdgeFunction<{ zones: any }>("strava-api", { action: "zones" }),
    ]);

    if (actResult.ok && actResult.data?.activities) setActivities(actResult.data.activities);
    if (statsResult.ok && statsResult.data?.stats) setStats(statsResult.data.stats);
    if (zonesResult.ok && zonesResult.data?.zones) setZones(zonesResult.data.zones);
  }, []);

  // Initial load
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    (async () => {
      setLoading(true);
      const isConn = await checkStatus();
      if (isConn) await loadData();
      setLoading(false);
    })();
  }, [authLoading, isAuthenticated, checkStatus, loadData]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const scope = params.get("scope");
    if (!code || !scope?.includes("activity:read")) return;

    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);

    (async () => {
      setLoading(true);
      const result = await invokeEdgeFunction("strava-api", { action: "exchange-token", code });
      if (result.ok) {
        toast.success("Connected to Strava!");
        setConnected(true);
        await checkStatus();
        await loadData();
      } else {
        toast.error("Failed to connect to Strava");
      }
      setLoading(false);
    })();
  }, [checkStatus, loadData]);

  const handleConnect = () => {
    const clientId = STRAVA_CLIENT_ID || Deno?.env?.get?.("STRAVA_CLIENT_ID");
    // We need the client ID on the frontend for the OAuth redirect
    // It's stored as a secret, so we use a known value or prompt
    const redirectUri = `${window.location.origin}/health`;
    const scope = "activity:read_all,profile:read_all";
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=auto`;
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    const result = await invokeEdgeFunction("strava-api", { action: "disconnect" });
    if (result.ok) {
      setConnected(false);
      setActivities([]);
      setStats(null);
      setZones(null);
      toast.success("Disconnected from Strava");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Not connected state ---
  if (!connected) {
    return (
      <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.06),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.06),transparent_28%)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-border"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </button>
          </div>

          <Card className="flex flex-col items-center gap-6 border-border/60 bg-card/80 p-10 text-center backdrop-blur">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
              <HeartPulse className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Connect Strava</h1>
              <p className="max-w-md text-muted-foreground">
                Link your Strava account to see activities, fitness stats, heart rate zones, and training trends — all in one place.
              </p>
            </div>
            <Button onClick={handleConnect} className="gap-2 bg-[#FC4C02] hover:bg-[#e04400] text-white">
              <Link2 className="h-4 w-4" />
              Connect with Strava
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // --- Connected state ---
  const recentRuns = stats?.recent_runs;
  const recentRides = stats?.recent_rides;
  const ytdRuns = stats?.ytd_runs;
  const ytdRides = stats?.ytd_rides;
  const hrZones = zones?.heart_rate?.zones;

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.06),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.06),transparent_28%)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="absolute inset-0 opacity-50" aria-hidden>
            <div className="absolute -left-12 top-6 h-24 w-24 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="absolute right-4 top-0 h-28 w-28 rounded-full bg-muted/50 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
                </button>
                <Separator orientation="vertical" className="h-5" />
                {athleteAvatar && (
                  <img src={athleteAvatar} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span className="text-xs font-medium">{athleteName || "Strava Connected"}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 shadow-inner">
                  <HeartPulse className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">Health</h1>
                  <p className="text-base text-muted-foreground">Your fitness data, powered by Strava.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="gap-1.5 text-destructive hover:text-destructive">
                <Unlink className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Recent Runs"
                value={recentRuns?.count ? `${recentRuns.count} runs` : "—"}
                helper={recentRuns?.distance ? formatDistance(recentRuns.distance) : undefined}
                icon={<Footprints className="h-4 w-4" />}
              />
              <StatCard
                label="Recent Rides"
                value={recentRides?.count ? `${recentRides.count} rides` : "—"}
                helper={recentRides?.distance ? formatDistance(recentRides.distance) : undefined}
                icon={<Bike className="h-4 w-4" />}
              />
              <StatCard
                label="YTD Run Distance"
                value={ytdRuns?.distance ? formatDistance(ytdRuns.distance) : "—"}
                helper={ytdRuns?.count ? `${ytdRuns.count} activities` : undefined}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label="YTD Ride Distance"
                value={ytdRides?.distance ? formatDistance(ytdRides.distance) : "—"}
                helper={ytdRides?.count ? `${ytdRides.count} activities` : undefined}
                icon={<Mountain className="h-4 w-4" />}
              />
            </div>
          )}
        </header>

        {/* Content Grid */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Recent Activities */}
          <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Recent Activities</h2>
                <p className="text-sm text-muted-foreground">Your latest workouts</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {activities.length} shown
              </Badge>
            </div>

            {activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activities found</p>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 transition hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80 text-muted-foreground shadow-inner">
                      {activityIcon(act.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{act.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{format(parseISO(act.start_date), "MMM d, h:mm a")}</span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {formatDuration(act.moving_time)}
                        </span>
                        {act.distance > 0 && <span>{formatDistance(act.distance)}</span>}
                        {act.average_speed > 0 && <span>{formatPace(act.average_speed, act.type)}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {act.average_heartrate && (
                        <span className="flex items-center gap-1 text-xs font-medium text-rose-500">
                          <HeartPulse className="h-3 w-3" /> {Math.round(act.average_heartrate)} bpm
                        </span>
                      )}
                      {act.total_elevation_gain > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mountain className="h-3 w-3" /> {Math.round(act.total_elevation_gain)}m
                        </span>
                      )}
                      {act.suffer_score && act.suffer_score > 0 && (
                        <span className="flex items-center gap-1 text-xs text-orange-500">
                          <Zap className="h-3 w-3" /> {act.suffer_score}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Right Column */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            {/* Heart Rate Zones */}
            {hrZones && hrZones.length > 0 && (
              <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
                <h2 className="mb-1 text-base font-semibold text-foreground">Heart Rate Zones</h2>
                <p className="mb-4 text-sm text-muted-foreground">Your training intensity distribution</p>
                <div className="space-y-2">
                  {hrZones.map((zone, i) => {
                    const labels = ["Recovery", "Endurance", "Tempo", "Threshold", "VO2 Max"];
                    const colors = [
                      "bg-blue-400",
                      "bg-emerald-400",
                      "bg-yellow-400",
                      "bg-orange-400",
                      "bg-rose-500",
                    ];
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-20 text-xs font-medium text-muted-foreground">
                          Z{i + 1} {labels[i] || ""}
                        </span>
                        <div className="flex-1">
                          <div className="h-3 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full transition-all", colors[i] || "bg-primary")}
                              style={{ width: `${Math.min(100, ((zone.max - zone.min) / (hrZones[hrZones.length - 1]?.max || 200)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-20 text-right text-xs text-muted-foreground">
                          {zone.min}–{zone.max === -1 ? "∞" : zone.max} bpm
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* All-Time Records */}
            {stats && (
              <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
                <h2 className="mb-1 text-base font-semibold text-foreground">All-Time Records</h2>
                <p className="mb-4 text-sm text-muted-foreground">Your lifetime achievements</p>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Total Runs"
                    value={stats.all_runs?.count?.toString() || "0"}
                    icon={<Footprints className="h-3.5 w-3.5" />}
                  />
                  <MiniStat
                    label="Run Distance"
                    value={stats.all_runs?.distance ? formatDistance(stats.all_runs.distance) : "—"}
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                  />
                  <MiniStat
                    label="Total Rides"
                    value={stats.all_rides?.count?.toString() || "0"}
                    icon={<Bike className="h-3.5 w-3.5" />}
                  />
                  <MiniStat
                    label="Ride Distance"
                    value={stats.all_rides?.distance ? formatDistance(stats.all_rides.distance) : "—"}
                    icon={<Mountain className="h-3.5 w-3.5" />}
                  />
                  {stats.biggest_ride_distance > 0 && (
                    <MiniStat
                      label="Longest Ride"
                      value={formatDistance(stats.biggest_ride_distance)}
                      icon={<Trophy className="h-3.5 w-3.5" />}
                    />
                  )}
                  {stats.biggest_climb_elevation_gain > 0 && (
                    <MiniStat
                      label="Biggest Climb"
                      value={`${Math.round(stats.biggest_climb_elevation_gain)}m`}
                      icon={<Mountain className="h-3.5 w-3.5" />}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Recent Activity Summary */}
            {activities.length > 0 && (
              <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
                <h2 className="mb-1 text-base font-semibold text-foreground">Activity Insights</h2>
                <p className="mb-4 text-sm text-muted-foreground">From your recent workouts</p>
                <div className="space-y-3">
                  {(() => {
                    const withHR = activities.filter((a) => a.average_heartrate);
                    const avgHR = withHR.length
                      ? Math.round(withHR.reduce((s, a) => s + (a.average_heartrate || 0), 0) / withHR.length)
                      : null;
                    const totalCals = activities.reduce((s, a) => s + (a.calories || 0), 0);
                    const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
                    const totalElev = activities.reduce((s, a) => s + a.total_elevation_gain, 0);

                    return (
                      <>
                        {avgHR && (
                          <InsightRow
                            icon={<HeartPulse className="h-4 w-4 text-rose-500" />}
                            label="Avg Heart Rate"
                            value={`${avgHR} bpm`}
                          />
                        )}
                        <InsightRow
                          icon={<Flame className="h-4 w-4 text-orange-500" />}
                          label="Calories Burned"
                          value={totalCals > 0 ? `${totalCals.toLocaleString()} cal` : "—"}
                        />
                        <InsightRow
                          icon={<Clock className="h-4 w-4 text-blue-500" />}
                          label="Total Active Time"
                          value={formatDuration(totalTime)}
                        />
                        <InsightRow
                          icon={<Mountain className="h-4 w-4 text-emerald-500" />}
                          label="Total Elevation"
                          value={`${Math.round(totalElev).toLocaleString()}m`}
                        />
                      </>
                    );
                  })()}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-background/70 p-4 shadow-none backdrop-blur">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {helper && <span className="text-xs font-medium text-muted-foreground">{helper}</span>}
      </div>
    </Card>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function InsightRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
