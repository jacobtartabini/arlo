import { useEffect, useState, useCallback, useMemo } from "react";
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
  Droplets,
  Moon,
  Smile,
  Plus,
  Utensils,
  BedDouble,
  CheckCircle2,
  Target,
  ChevronRight,
  Trash2,
  Star,
  BarChart3,
  SlidersHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useAuth } from "@/providers/AuthProvider";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  time: string;
}

interface SleepLog {
  date: string;
  hoursSlept: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

interface WellnessLog {
  date: string;
  energy: 1 | 2 | 3 | 4 | 5;
  mood: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

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
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
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

function activityIcon(type: string, className = "h-4 w-4") {
  const t = type.toLowerCase();
  if (t.includes("run")) return <Footprints className={className} />;
  if (t.includes("ride") || t.includes("cycle")) return <Bike className={className} />;
  if (t.includes("swim")) return <Waves className={className} />;
  return <Activity className={className} />;
}

interface HealthScoreParams {
  activitiesToday: number;
  activitiesYesterday: number;
  sleepHours: number;
  sleepQuality: number;
  waterGlasses: number;
  caloriesLogged: boolean;
  wellnessEnergy: number;
  wellnessMood: number;
  wellnessStress: number;
}

function computeHealthScore(p: HealthScoreParams): number {
  let score = 0;

  // Activity: 25 pts
  if (p.activitiesToday > 0) score += 25;
  else if (p.activitiesYesterday > 0) score += 15;

  // Sleep: 25 pts
  if (p.sleepHours > 0) {
    score += Math.min(p.sleepHours / 8, 1) * 20;
    score += (p.sleepQuality / 5) * 5;
  }

  // Hydration + nutrition: 25 pts
  score += Math.min(p.waterGlasses / 8, 1) * 15;
  if (p.caloriesLogged) score += 10;

  // Wellness: 25 pts
  if (p.wellnessEnergy > 0 && p.wellnessMood > 0 && p.wellnessStress > 0) {
    const wellnessAvg =
      ((p.wellnessEnergy + p.wellnessMood + (6 - p.wellnessStress)) / 3 / 5) * 25;
    score += wellnessAvg;
  }

  return Math.min(100, Math.round(score));
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

function scoreRingColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Health() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Strava state
  const [connected, setConnected] = useState<boolean | null>(null);
  const [athleteName, setAthleteName] = useState("");
  const [athleteAvatar, setAthleteAvatar] = useState("");
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [stats, setStats] = useState<StravaStats | null>(null);
  const [zones, setZones] = useState<{ heart_rate?: { zones: HRZone[] } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Local health state
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLog[]>([]);

  // Dialog state
  const [mealDialog, setMealDialog] = useState(false);
  const [sleepDialog, setSleepDialog] = useState(false);
  const [wellnessDialog, setWellnessDialog] = useState(false);

  // Form state
  const [mealForm, setMealForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [sleepForm, setSleepForm] = useState({ hoursSlept: "7.5", quality: 3 as 1 | 2 | 3 | 4 | 5 });
  const [wellnessForm, setWellnessForm] = useState({ energy: 3, mood: 3, stress: 3, notes: "" });

  useEffect(() => {
    document.title = "Arlo · Health";
  }, []);

  // Load local health data from storage
  useEffect(() => {
    const today = getToday();
    setMeals(loadStorage<Meal[]>(`arlo_meals_${today}`, []));
    setWaterGlasses(loadStorage<number>(`arlo_water_${today}`, 0));
    setSleepLogs(loadStorage<SleepLog[]>("arlo_sleep", []));
    setWellnessLogs(loadStorage<WellnessLog[]>("arlo_wellness", []));
  }, []);

  // Strava: check connection status
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

  const loadStravaData = useCallback(async () => {
    const [actResult, statsResult, zonesResult] = await Promise.all([
      invokeEdgeFunction<{ activities: StravaActivity[] }>("strava-api", { action: "activities", per_page: 20 }),
      invokeEdgeFunction<{ stats: StravaStats }>("strava-api", { action: "stats" }),
      invokeEdgeFunction<{ zones: { heart_rate?: { zones: HRZone[] } } }>("strava-api", { action: "zones" }),
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
      if (isConn) await loadStravaData();
      setLoading(false);
    })();
  }, [authLoading, isAuthenticated, checkStatus, loadStravaData]);

  // OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const scope = params.get("scope");
    if (!code || !scope?.includes("activity:read")) return;
    window.history.replaceState({}, "", window.location.pathname);
    (async () => {
      setLoading(true);
      const result = await invokeEdgeFunction("strava-api", { action: "exchange-token", code });
      if (result.ok) {
        toast.success("Connected to Strava!");
        setConnected(true);
        await checkStatus();
        await loadStravaData();
      } else {
        toast.error("Failed to connect to Strava");
      }
      setLoading(false);
    })();
  }, [checkStatus, loadStravaData]);

  const handleConnect = async () => {
    const result = await invokeEdgeFunction<{ client_id: string }>("strava-api", { action: "client-id" });
    if (!result.ok || !result.data?.client_id) {
      toast.error("Could not initiate Strava connection");
      return;
    }
    const redirectUri = `${window.location.origin}/health`;
    const scope = "activity:read_all,profile:read_all";
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${result.data.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=auto`;
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
    if (connected) await loadStravaData();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  // ─── Computed values ──────────────────────────────────────────────────────

  const today = getToday();
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

  const todayActivities = useMemo(
    () => activities.filter((a) => format(parseISO(a.start_date), "yyyy-MM-dd") === today),
    [activities, today]
  );
  const yesterdayActivities = useMemo(
    () => activities.filter((a) => format(parseISO(a.start_date), "yyyy-MM-dd") === yesterday),
    [activities, yesterday]
  );

  const caloriesBurned = useMemo(
    () => todayActivities.reduce((s, a) => s + (a.calories || 0), 0),
    [todayActivities]
  );
  const caloriesConsumed = useMemo(() => meals.reduce((s, m) => s + m.calories, 0), [meals]);
  const calorieTarget = 2000;
  const waterTarget = 8;
  const sleepTarget = 8;

  const lastSleep = useMemo(
    () => sleepLogs.find((s) => s.date === today) || sleepLogs[0] || null,
    [sleepLogs, today]
  );
  const todayWellness = useMemo(
    () => wellnessLogs.find((w) => w.date === today) || null,
    [wellnessLogs, today]
  );

  // Weekly chart: last 7 days
  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = format(d, "yyyy-MM-dd");
      const dayActs = activities.filter(
        (a) => format(parseISO(a.start_date), "yyyy-MM-dd") === dateStr
      );
      const minutes = Math.round(dayActs.reduce((s, a) => s + a.moving_time, 0) / 60);
      return {
        day: format(d, "EEE"),
        minutes,
        active: dayActs.length > 0,
        isToday: dateStr === today,
      };
    });
  }, [activities, today]);

  const activeDays = weeklyData.filter((d) => d.active).length;
  const weeklyMinutes = weeklyData.reduce((s, d) => s + d.minutes, 0);

  const healthScore = useMemo(
    () =>
      computeHealthScore({
        activitiesToday: todayActivities.length,
        activitiesYesterday: yesterdayActivities.length,
        sleepHours: lastSleep?.hoursSlept || 0,
        sleepQuality: lastSleep?.quality || 0,
        waterGlasses,
        caloriesLogged: caloriesConsumed > 0,
        wellnessEnergy: todayWellness?.energy || 0,
        wellnessMood: todayWellness?.mood || 0,
        wellnessStress: todayWellness?.stress || 0,
      }),
    [todayActivities, yesterdayActivities, lastSleep, waterGlasses, caloriesConsumed, todayWellness]
  );

  // Recommendations
  const recommendations = useMemo(() => {
    const list: { icon: React.ReactNode; text: string; type: "good" | "info" | "warn" }[] = [];
    if (activeDays >= 5)
      list.push({ icon: <Trophy className="h-4 w-4" />, text: `Strong week — ${activeDays} active days. Keep it up.`, type: "good" });
    if (todayActivities.length === 0 && yesterdayActivities.length === 0 && connected)
      list.push({ icon: <Activity className="h-4 w-4" />, text: "No activity logged recently. Even a short walk helps recovery.", type: "info" });
    if (lastSleep && lastSleep.hoursSlept < 7)
      list.push({ icon: <Moon className="h-4 w-4" />, text: `You slept ${lastSleep.hoursSlept}h last night. Aim for 7–9h for optimal recovery.`, type: "warn" });
    if (waterGlasses < 4)
      list.push({ icon: <Droplets className="h-4 w-4" />, text: `Only ${waterGlasses} glasses logged today. Stay on top of hydration.`, type: "info" });
    if (todayWellness?.stress && todayWellness.stress >= 4)
      list.push({ icon: <HeartPulse className="h-4 w-4" />, text: "High stress today. A light workout or walk can help significantly.", type: "warn" });
    if (caloriesConsumed === 0)
      list.push({ icon: <Utensils className="h-4 w-4" />, text: "No meals logged today. Tracking nutrition helps you see the full picture.", type: "info" });
    if (caloriesConsumed > 0 && caloriesBurned > 0)
      list.push({
        icon: <Flame className="h-4 w-4" />,
        text: `Calorie balance: ${caloriesConsumed > caloriesBurned ? "+" : ""}${caloriesConsumed - caloriesBurned} kcal (${caloriesConsumed} in, ${caloriesBurned} burned from workouts).`,
        type: caloriesConsumed - caloriesBurned > 500 ? "warn" : "good",
      });
    return list.slice(0, 4);
  }, [activeDays, todayActivities, yesterdayActivities, connected, lastSleep, waterGlasses, todayWellness, caloriesConsumed, caloriesBurned]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddMeal = () => {
    if (!mealForm.name.trim() || !mealForm.calories) return;
    const meal: Meal = {
      id: Date.now().toString(),
      name: mealForm.name.trim(),
      calories: parseInt(mealForm.calories) || 0,
      protein: mealForm.protein ? parseInt(mealForm.protein) : undefined,
      carbs: mealForm.carbs ? parseInt(mealForm.carbs) : undefined,
      fat: mealForm.fat ? parseInt(mealForm.fat) : undefined,
      time: new Date().toISOString(),
    };
    const updated = [...meals, meal];
    setMeals(updated);
    saveStorage(`arlo_meals_${today}`, updated);
    setMealForm({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    setMealDialog(false);
    toast.success("Meal logged");
  };

  const handleRemoveMeal = (id: string) => {
    const updated = meals.filter((m) => m.id !== id);
    setMeals(updated);
    saveStorage(`arlo_meals_${today}`, updated);
  };

  const handleAddWater = () => {
    const next = Math.min(waterGlasses + 1, 20);
    setWaterGlasses(next);
    saveStorage(`arlo_water_${today}`, next);
  };

  const handleRemoveWater = () => {
    const next = Math.max(waterGlasses - 1, 0);
    setWaterGlasses(next);
    saveStorage(`arlo_water_${today}`, next);
  };

  const handleLogSleep = () => {
    const hours = parseFloat(sleepForm.hoursSlept);
    if (isNaN(hours) || hours <= 0) return;
    const log: SleepLog = { date: today, hoursSlept: hours, quality: sleepForm.quality };
    const updated = [log, ...sleepLogs.filter((s) => s.date !== today)].slice(0, 30);
    setSleepLogs(updated);
    saveStorage("arlo_sleep", updated);
    setSleepDialog(false);
    toast.success("Sleep logged");
  };

  const handleLogWellness = () => {
    const log: WellnessLog = {
      date: today,
      energy: wellnessForm.energy as 1 | 2 | 3 | 4 | 5,
      mood: wellnessForm.mood as 1 | 2 | 3 | 4 | 5,
      stress: wellnessForm.stress as 1 | 2 | 3 | 4 | 5,
      notes: wellnessForm.notes || undefined,
    };
    const updated = [log, ...wellnessLogs.filter((w) => w.date !== today)].slice(0, 30);
    setWellnessLogs(updated);
    saveStorage("arlo_wellness", updated);
    setWellnessDialog(false);
    toast.success("Check-in saved");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hrZones = zones?.heart_rate?.zones;

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_15%_15%,rgba(239,68,68,0.05),transparent_35%),radial-gradient(circle_at_85%_5%,rgba(249,115,22,0.05),transparent_30%)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">

        {/* ── Header ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-border"
              >
                <ArrowLeft className="h-3 w-3" /> Dashboard
              </button>
              <span className="text-xs text-muted-foreground/50">/</span>
              <span className="text-xs text-muted-foreground">Health</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Health Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE, MMMM d")}
                  {athleteName && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className="text-muted-foreground/40">·</span>
                      {athleteAvatar && (
                        <img src={athleteAvatar} alt="" className="h-4 w-4 rounded-full" />
                      )}
                      <span>{athleteName}</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setMealDialog(true)}
            >
              <Utensils className="h-3.5 w-3.5" />
              Log Meal
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleAddWater}
            >
              <Droplets className="h-3.5 w-3.5" />
              +1 Glass
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setSleepDialog(true)}
            >
              <BedDouble className="h-3.5 w-3.5" />
              Log Sleep
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setWellnessDialog(true)}
            >
              <Smile className="h-3.5 w-3.5" />
              Check In
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Sync
            </Button>
          </div>
        </header>

        {/* ── Health Score + Overview Cards ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Score card (wider) */}
          <Card className="relative overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Daily Health Score
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className="text-5xl font-bold tabular-nums"
                    style={{ color: scoreRingColor(healthScore) }}
                  >
                    {healthScore}
                  </span>
                  <span className="text-base text-muted-foreground font-medium">
                    / 100
                  </span>
                </div>
                <p
                  className="mt-0.5 text-sm font-medium"
                  style={{ color: scoreRingColor(healthScore) }}
                >
                  {scoreLabel(healthScore)}
                </p>
              </div>
              <div className="relative h-20 w-20">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle
                    cx="18" cy="18" r="15.9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-muted/30"
                  />
                  <circle
                    cx="18" cy="18" r="15.9"
                    fill="none"
                    strokeWidth="2.5"
                    stroke={scoreRingColor(healthScore)}
                    strokeDasharray={`${healthScore} 100`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                  />
                </svg>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
              {[
                { label: "Activity", value: todayActivities.length > 0 ? "Done" : connected ? "Rest" : "—", color: todayActivities.length > 0 ? "text-emerald-500" : "text-muted-foreground" },
                { label: "Sleep", value: lastSleep ? `${lastSleep.hoursSlept}h` : "—", color: lastSleep && lastSleep.hoursSlept >= 7 ? "text-blue-500" : "text-muted-foreground" },
                { label: "Water", value: `${waterGlasses}/${waterTarget}`, color: waterGlasses >= waterTarget ? "text-cyan-500" : "text-muted-foreground" },
                { label: "Mood", value: todayWellness ? `${todayWellness.mood}/5` : "—", color: todayWellness ? "text-amber-500" : "text-muted-foreground" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/30 p-1.5">
                  <p className={cn("text-sm font-semibold", item.color)}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity */}
          <MetricCard
            label="Activity"
            icon={<Activity className="h-4 w-4" />}
            iconColor="text-orange-500"
            iconBg="bg-orange-500/10"
            value={
              todayActivities.length > 0
                ? formatDuration(todayActivities.reduce((s, a) => s + a.moving_time, 0))
                : connected
                ? "Rest day"
                : "Not synced"
            }
            sub={
              todayActivities.length > 0
                ? `${todayActivities.length} workout${todayActivities.length > 1 ? "s" : ""} today`
                : `${activeDays}/7 active days`
            }
            progress={connected ? (activeDays / 7) * 100 : undefined}
          />

          {/* Calories */}
          <MetricCard
            label="Calories"
            icon={<Flame className="h-4 w-4" />}
            iconColor="text-red-500"
            iconBg="bg-red-500/10"
            value={caloriesConsumed > 0 ? `${caloriesConsumed.toLocaleString()}` : "—"}
            sub={
              caloriesConsumed > 0
                ? caloriesBurned > 0
                  ? `${caloriesBurned} burned from workouts`
                  : `of ${calorieTarget} target`
                : "No meals logged"
            }
            progress={caloriesConsumed > 0 ? Math.min((caloriesConsumed / calorieTarget) * 100, 100) : undefined}
          />

          {/* Hydration */}
          <MetricCard
            label="Hydration"
            icon={<Droplets className="h-4 w-4" />}
            iconColor="text-cyan-500"
            iconBg="bg-cyan-500/10"
            value={`${waterGlasses}`}
            sub={`of ${waterTarget} glasses`}
            progress={(waterGlasses / waterTarget) * 100}
            action={
              <button
                onClick={handleAddWater}
                className="rounded-full p-0.5 text-cyan-500 opacity-0 transition hover:bg-cyan-500/10 group-hover:opacity-100"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          />

          {/* Sleep */}
          <MetricCard
            label="Sleep"
            icon={<Moon className="h-4 w-4" />}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-500/10"
            value={lastSleep ? `${lastSleep.hoursSlept}h` : "—"}
            sub={
              lastSleep
                ? `Quality: ${"★".repeat(lastSleep.quality)}${"☆".repeat(5 - lastSleep.quality)}`
                : "Not logged"
            }
            progress={lastSleep ? Math.min((lastSleep.hoursSlept / sleepTarget) * 100, 100) : undefined}
            action={
              <button
                onClick={() => setSleepDialog(true)}
                className="rounded-full p-0.5 text-indigo-500 opacity-0 transition hover:bg-indigo-500/10 group-hover:opacity-100"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          />

          {/* Wellness */}
          <MetricCard
            label="Wellness"
            icon={<Smile className="h-4 w-4" />}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            value={
              todayWellness
                ? `${Math.round((todayWellness.energy + todayWellness.mood + (6 - todayWellness.stress)) / 3)}/5`
                : "—"
            }
            sub={
              todayWellness
                ? `Energy ${todayWellness.energy} · Mood ${todayWellness.mood} · Stress ${todayWellness.stress}`
                : "No check-in yet"
            }
            progress={
              todayWellness
                ? ((todayWellness.energy + todayWellness.mood + (6 - todayWellness.stress)) / 15) * 100
                : undefined
            }
            action={
              <button
                onClick={() => setWellnessDialog(true)}
                className="rounded-full p-0.5 text-amber-500 opacity-0 transition hover:bg-amber-500/10 group-hover:opacity-100"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          />
        </div>

        {/* ── Strava Connect Banner (if not connected) ── */}
        {connected === false && (
          <Card className="flex items-center justify-between gap-4 border-orange-500/20 bg-orange-500/5 p-4 shadow-none">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Connect Strava to sync workouts</p>
                <p className="text-xs text-muted-foreground">
                  Automatically import runs, rides, and heart rate data into your health overview.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleConnect}
              className="shrink-0 gap-1.5 bg-[#FC4C02] text-white hover:bg-[#e04400]"
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect
            </Button>
          </Card>
        )}

        {/* ── Main Grid ── */}
        <div className="grid gap-4 lg:grid-cols-12">

          {/* ── Left Column ── */}
          <div className="flex flex-col gap-4 lg:col-span-7">

            {/* Weekly Activity Chart */}
            {connected && activities.length > 0 && (
              <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Weekly Activity</h2>
                    <p className="text-xs text-muted-foreground">
                      {activeDays} active days · {formatDuration(weeklyMinutes * 60)} total
                    </p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={weeklyData} barSize={20} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs shadow-md">
                            <p className="font-medium text-foreground">{label}</p>
                            <p className="text-muted-foreground">{payload[0].value} min</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                      {weeklyData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.isToday
                              ? "hsl(var(--primary))"
                              : entry.active
                              ? "hsl(var(--primary) / 0.5)"
                              : "hsl(var(--muted))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Recent Workouts */}
            <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Recent Workouts</h2>
                  <p className="text-xs text-muted-foreground">
                    {connected && activities.length > 0
                      ? `${activities.length} recent activities from Strava`
                      : connected
                      ? "No activities found"
                      : "Connect Strava to see workouts"}
                  </p>
                </div>
                {connected && (
                  <Badge variant="secondary" className="text-[10px]">
                    Strava
                  </Badge>
                )}
              </div>

              {!connected ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                    <Activity className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect Strava to import your workout history
                  </p>
                  <Button size="sm" variant="outline" onClick={handleConnect} className="gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Connect Strava
                  </Button>
                </div>
              ) : activities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No activities found</p>
              ) : (
                <div className="space-y-1.5">
                  {activities.slice(0, 8).map((act) => (
                    <div
                      key={act.id}
                      className="group flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 transition hover:bg-muted/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/80 text-muted-foreground shadow-inner">
                        {activityIcon(act.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{act.name}</p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{format(parseISO(act.start_date), "MMM d")}</span>
                          <span className="flex items-center gap-0.5">
                            <Timer className="h-3 w-3" />
                            {formatDuration(act.moving_time)}
                          </span>
                          {act.distance > 0 && <span>{formatDistance(act.distance)}</span>}
                          {act.average_speed > 0 && (
                            <span>{formatPace(act.average_speed, act.type)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {act.average_heartrate && (
                          <span className="flex items-center gap-1 text-xs font-medium text-rose-500">
                            <HeartPulse className="h-3 w-3" />
                            {Math.round(act.average_heartrate)} bpm
                          </span>
                        )}
                        {act.calories && act.calories > 0 && (
                          <span className="flex items-center gap-1 text-xs text-orange-500">
                            <Flame className="h-3 w-3" />
                            {act.calories} cal
                          </span>
                        )}
                        {act.total_elevation_gain > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mountain className="h-3 w-3" />
                            {Math.round(act.total_elevation_gain)}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {connected && (
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={handleDisconnect}
                      >
                        <Unlink className="h-3 w-3" />
                        Disconnect Strava
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Nutrition */}
            <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Nutrition Today</h2>
                  <p className="text-xs text-muted-foreground">
                    {caloriesConsumed > 0
                      ? `${caloriesConsumed} / ${calorieTarget} kcal`
                      : "No meals logged yet"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => setMealDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Log Meal
                </Button>
              </div>

              {caloriesConsumed > 0 && (
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Calories consumed</span>
                    <span>{Math.round((caloriesConsumed / calorieTarget) * 100)}%</span>
                  </div>
                  <Progress
                    value={Math.min((caloriesConsumed / calorieTarget) * 100, 100)}
                    className="h-2"
                  />
                  {caloriesBurned > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Net: {(caloriesConsumed - caloriesBurned).toLocaleString()} kcal after{" "}
                      {caloriesBurned} burned from workouts
                    </p>
                  )}
                </div>
              )}

              {meals.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Utensils className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Track meals to see calorie balance</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="group flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground">
                        <Utensils className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{meal.name}</p>
                        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                          <span>{meal.calories} kcal</span>
                          {meal.protein !== undefined && <span>{meal.protein}g protein</span>}
                          {meal.carbs !== undefined && <span>{meal.carbs}g carbs</span>}
                          {meal.fat !== undefined && <span>{meal.fat}g fat</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(meal.time), "h:mm a")}
                        </span>
                        <button
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="ml-1 rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Right Column ── */}
          <div className="flex flex-col gap-4 lg:col-span-5">

            {/* Goals */}
            <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Goals</h2>
                  <p className="text-xs text-muted-foreground">Weekly & daily progress</p>
                </div>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-3.5">
                <GoalRow
                  label="Active days this week"
                  value={activeDays}
                  target={5}
                  unit="/ 5 days"
                  color="bg-orange-500"
                />
                <GoalRow
                  label="Hydration"
                  value={waterGlasses}
                  target={waterTarget}
                  unit={`/ ${waterTarget} glasses`}
                  color="bg-cyan-500"
                />
                <GoalRow
                  label="Sleep last night"
                  value={lastSleep?.hoursSlept || 0}
                  target={sleepTarget}
                  unit={`/ ${sleepTarget}h`}
                  color="bg-indigo-500"
                />
                {connected && stats && (
                  <>
                    <GoalRow
                      label="Weekly run distance"
                      value={Math.round((stats.recent_runs?.distance || 0) / 1000 * 10) / 10}
                      target={20}
                      unit="/ 20 km"
                      color="bg-emerald-500"
                    />
                    <GoalRow
                      label="Calories burned (workouts)"
                      value={activities.slice(0, 7).reduce((s, a) => s + (a.calories || 0), 0)}
                      target={2500}
                      unit="/ 2500 kcal"
                      color="bg-rose-500"
                    />
                  </>
                )}
              </div>
            </Card>

            {/* Sleep & Wellness */}
            <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Sleep & Wellness</h2>
                  <p className="text-xs text-muted-foreground">Recent logs</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSleepDialog(true)}
                    className="rounded-lg border border-border/60 p-1.5 text-muted-foreground transition hover:border-border hover:text-foreground"
                  >
                    <BedDouble className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setWellnessDialog(true)}
                    className="rounded-lg border border-border/60 p-1.5 text-muted-foreground transition hover:border-border hover:text-foreground"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Sleep history */}
              {sleepLogs.length === 0 && !todayWellness ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Moon className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Log sleep and check-ins to track wellness trends
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sleepLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.date}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <Moon className="h-3.5 w-3.5 text-indigo-400" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {log.date === today ? "Last night" : format(parseISO(log.date), "EEE, MMM d")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {"★".repeat(log.quality)}{"☆".repeat(5 - log.quality)} quality
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          log.hoursSlept >= 7 ? "text-indigo-500" : "text-amber-500"
                        )}
                      >
                        {log.hoursSlept}h
                      </span>
                    </div>
                  ))}

                  {wellnessLogs.slice(0, 3).map((log) => (
                    <div
                      key={log.date + "_w"}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <Smile className="h-3.5 w-3.5 text-amber-400" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {log.date === today ? "Today's check-in" : format(parseISO(log.date), "EEE, MMM d")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Energy {log.energy} · Mood {log.mood} · Stress {log.stress}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-amber-500">
                        {Math.round((log.energy + log.mood + (6 - log.stress)) / 3)}/5
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Hydration */}
            <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Hydration</h2>
                  <p className="text-xs text-muted-foreground">
                    {waterGlasses} of {waterTarget} glasses today
                  </p>
                </div>
                <Droplets className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Array.from({ length: waterTarget }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-8 w-8 rounded-lg border-2 transition-all",
                      i < waterGlasses
                        ? "border-cyan-500 bg-cyan-500/20"
                        : "border-border/50 bg-muted/20"
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleAddWater}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add glass
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={handleRemoveWater}
                  disabled={waterGlasses === 0}
                >
                  Undo
                </Button>
              </div>
            </Card>

            {/* HR Zones */}
            {hrZones && hrZones.length > 0 && (
              <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Heart Rate Zones</h2>
                  <p className="text-xs text-muted-foreground">Your training intensity bands</p>
                </div>
                <div className="space-y-2">
                  {hrZones.map((zone, i) => {
                    const labels = ["Recovery", "Endurance", "Tempo", "Threshold", "VO2 Max"];
                    const colors = ["bg-blue-400", "bg-emerald-400", "bg-yellow-400", "bg-orange-400", "bg-rose-500"];
                    const maxBpm = hrZones[hrZones.length - 1]?.max || 200;
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="w-8 text-[10px] font-semibold text-muted-foreground">Z{i + 1}</span>
                        <span className="w-16 text-[10px] text-muted-foreground">{labels[i] || ""}</span>
                        <div className="flex-1">
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", colors[i] || "bg-primary")}
                              style={{
                                width: `${Math.min(100, ((zone.max - zone.min) / maxBpm) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="w-20 text-right text-[10px] text-muted-foreground">
                          {zone.min}–{zone.max === -1 ? "∞" : zone.max} bpm
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* All-time Strava records */}
            {stats && (
              <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">All-Time Records</h2>
                    <p className="text-xs text-muted-foreground">Lifetime Strava stats</p>
                  </div>
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total Runs", value: stats.all_runs?.count?.toString() || "0", icon: <Footprints className="h-3.5 w-3.5" /> },
                    { label: "Run Distance", value: stats.all_runs?.distance ? formatDistance(stats.all_runs.distance) : "—", icon: <TrendingUp className="h-3.5 w-3.5" /> },
                    { label: "Total Rides", value: stats.all_rides?.count?.toString() || "0", icon: <Bike className="h-3.5 w-3.5" /> },
                    { label: "Ride Distance", value: stats.all_rides?.distance ? formatDistance(stats.all_rides.distance) : "—", icon: <Mountain className="h-3.5 w-3.5" /> },
                    ...(stats.biggest_ride_distance > 0 ? [{ label: "Longest Ride", value: formatDistance(stats.biggest_ride_distance), icon: <Trophy className="h-3.5 w-3.5" /> }] : []),
                    ...(stats.biggest_climb_elevation_gain > 0 ? [{ label: "Biggest Climb", value: `${Math.round(stats.biggest_climb_elevation_gain)}m`, icon: <Mountain className="h-3.5 w-3.5" /> }] : []),
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5"
                    >
                      <div className="text-muted-foreground">{item.icon}</div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-xs font-semibold text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ── Recommendations ── */}
        {recommendations.length > 0 && (
          <Card className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Insights & Recommendations</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-sm",
                    rec.type === "good"
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : rec.type === "warn"
                      ? "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                      : "border-border/50 bg-muted/20 text-muted-foreground"
                  )}
                >
                  <div className="mt-0.5 shrink-0">{rec.icon}</div>
                  <p className="leading-relaxed">{rec.text}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Log Meal Dialog ── */}
      <Dialog open={mealDialog} onOpenChange={setMealDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log a Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Meal name</Label>
              <Input
                placeholder="e.g. Oatmeal with berries"
                value={mealForm.name}
                onChange={(e) => setMealForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddMeal()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Calories (kcal) *</Label>
                <Input
                  type="number"
                  placeholder="450"
                  value={mealForm.calories}
                  onChange={(e) => setMealForm((f) => ({ ...f, calories: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Protein (g)</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={mealForm.protein}
                  onChange={(e) => setMealForm((f) => ({ ...f, protein: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Carbs (g)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={mealForm.carbs}
                  onChange={(e) => setMealForm((f) => ({ ...f, carbs: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fat (g)</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={mealForm.fat}
                  onChange={(e) => setMealForm((f) => ({ ...f, fat: e.target.value }))}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAddMeal}
              disabled={!mealForm.name.trim() || !mealForm.calories}
            >
              Log Meal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Log Sleep Dialog ── */}
      <Dialog open={sleepDialog} onOpenChange={setSleepDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Sleep</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Hours slept</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="7.5"
                value={sleepForm.hoursSlept}
                onChange={(e) => setSleepForm((f) => ({ ...f, hoursSlept: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sleep quality</Label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setSleepForm((f) => ({ ...f, quality: n }))}
                    className={cn(
                      "flex-1 rounded-lg border py-2 text-sm font-medium transition",
                      sleepForm.quality === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleLogSleep}>
              Save Sleep
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Check-In Dialog ── */}
      <Dialog open={wellnessDialog} onOpenChange={setWellnessDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Daily Check-In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {(
              [
                { key: "energy", label: "Energy level", low: "Exhausted", high: "Energized" },
                { key: "mood", label: "Mood", low: "Low", high: "Great" },
                { key: "stress", label: "Stress level", low: "None", high: "Very high" },
              ] as const
            ).map(({ key, label, low, high }) => (
              <div key={key} className="space-y-2">
                <Label className="text-xs">{label}</Label>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setWellnessForm((f) => ({ ...f, [key]: n }))}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-sm font-medium transition",
                        wellnessForm[key] === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                  <span>{low}</span>
                  <span>{high}</span>
                </div>
              </div>
            ))}
            <Button className="w-full" onClick={handleLogWellness}>
              Save Check-In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  icon,
  iconColor,
  iconBg,
  value,
  sub,
  progress,
  action,
}: {
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  value: string;
  sub?: string;
  progress?: number;
  action?: React.ReactNode;
}) {
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg, iconColor)}>
          {icon}
        </div>
        {action}
      </div>
      <div className="mt-2">
        <p className="text-xl font-semibold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{sub}</p>}
      </div>
      {progress !== undefined && (
        <Progress value={Math.min(progress, 100)} className="mt-2 h-1.5" />
      )}
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
    </Card>
  );
}

function GoalRow({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min((value / target) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
