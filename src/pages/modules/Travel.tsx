import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plane,
  Hotel,
  Search,
  MapPin,
  Compass,
  Calendar,
  Thermometer,
  Droplets,
  UtensilsCrossed,
  ExternalLink,
  Route,
  Luggage
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const bookings = [
  { type: "Flight", route: "SFO → NYC", date: "Apr 28", status: "Confirmed" },
  { type: "Hotel", route: "Hudson Loft", date: "Apr 28 – May 2", status: "Pending" },
  { type: "Flight", route: "NYC → SFO", date: "May 2", status: "Standby" }
];

const restaurants = [
  { name: "Terra Rooftop", time: "Thu 7:30 PM", status: "Confirmed" },
  { name: "Noir Bistro", time: "Waitlist", status: "Join" },
  { name: "Green Market", time: "Fri 12:00 PM", status: "Confirmed" }
];

const tripTimeline = [
  { time: "Apr 27, 21:30", event: "Pack + sync boarding passes" },
  { time: "Apr 28, 05:45", event: "Depart home for SFO" },
  { time: "Apr 28, 07:15", event: "Security & lounge" },
  { time: "Apr 28, 09:10", event: "Flight DL204 departs" },
  { time: "Apr 28, 18:05", event: "Arrive JFK + rideshare" }
];

const packingChecklist = [
  { item: "Passport & TSA PreCheck", required: true },
  { item: "Conference badge", required: true },
  { item: "Camera kit", required: false },
  { item: "Portable charger", required: false }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.06 }
  })
};

export default function Travel() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Travel — Arlo";
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 spatial-grid opacity-30" />

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="glass rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Travel</h1>
              <p className="text-sm text-muted-foreground">Book trips, track flights, and stay ready in every city.</p>
            </div>
          </div>
        </div>
        <Button className="glass-intense">
          <Search className="w-4 h-4 mr-2" />
          Book new trip
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0} className="lg:col-span-2">
              <Card className="glass-intense p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plane className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Flight & Hotel Booking</h2>
                      <p className="text-xs text-muted-foreground">Search availability and review upcoming reservations.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                    Live deals
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="From" className="text-sm" />
                  <Input placeholder="To" className="text-sm" />
                  <Input placeholder="Depart" className="text-sm" />
                  <Input placeholder="Return" className="text-sm" />
                </div>
                <Button variant="outline" className="w-full">Search options</Button>
                <div className="space-y-3 text-sm">
                  {bookings.map((booking) => (
                    <div key={booking.route} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{booking.route}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {booking.type === "Flight" ? <Plane className="w-3 h-3" /> : <Hotel className="w-3 h-3" />}
                          {booking.date}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          booking.status === "Confirmed"
                            ? "border-emerald-500/30 text-emerald-400"
                            : booking.status === "Pending"
                            ? "border-amber-500/30 text-amber-400"
                            : "border-primary/30 text-primary"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Compass className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
                    <p className="text-xs text-muted-foreground">Routes, transit, and saved places.</p>
                  </div>
                </div>
                <div className="h-40 rounded-lg bg-gradient-to-br from-primary/10 via-transparent to-primary/5 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="w-10 h-10 text-primary/40" />
                  </div>
                  <div className="absolute bottom-3 left-3 text-xs text-muted-foreground bg-background/80 backdrop-blur rounded-full px-3 py-1">
                    SFO ⇢ JFK · 2.5k mi
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Next move</p>
                  <p className="text-foreground">Call rideshare in 20 minutes for check-in buffer.</p>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Flight Tracking</h2>
                    <p className="text-xs text-muted-foreground">Live status and gate updates.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">DL204 · SFO → JFK</span>
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                      On time
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Boarding 18:05</span>
                    <span>Gate C12</span>
                    <span>Seat 4A</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: "30%" }}
                      animate={{ width: "68%" }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <a
                      href="https://www.google.com/travel/flights?hl=en#search;flt=SFO.JFK.2024-04-28;c:USD;e:1;sd:1;t:f"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Live flight map
                    </a>
                  </Button>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Thermometer className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Weather</h2>
                    <p className="text-xs text-muted-foreground">Current and destination forecast.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground">San Francisco</p>
                    <p className="text-2xl font-semibold text-foreground">68°</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Droplets className="w-3 h-3" /> 20% chance of rain
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground">New York</p>
                    <p className="text-2xl font-semibold text-foreground">61°</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Droplets className="w-3 h-3" /> 40% chance of rain
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-xs text-primary">
                  Pack a light jacket — late evening lows reach 52°.
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Restaurant Reservations</h2>
                    <p className="text-xs text-muted-foreground">Bookings and quick table finder.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {restaurants.map((restaurant) => (
                    <div key={restaurant.name} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                      <div>
                        <p className="text-foreground font-medium">{restaurant.name}</p>
                        <p className="text-xs text-muted-foreground">{restaurant.time}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={restaurant.status === "Confirmed" ? "outline" : "default"}
                        className={restaurant.status === "Join" ? "bg-primary text-primary-foreground" : ""}
                      >
                        {restaurant.status === "Join" ? "Join waitlist" : restaurant.status}
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  Quick table finder
                </Button>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={5}>
            <Card className="glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Route className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Trip Timeline & Packing</h2>
                    <p className="text-xs text-muted-foreground">Preview travel milestones and stay checklist-ready.</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Auto-syncing itinerary
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Trip timeline</p>
                  <div className="space-y-3">
                    {tripTimeline.map((entry) => (
                      <div key={entry.time} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground">{entry.time}</span>
                          <span className="h-full w-px bg-border/60" />
                        </div>
                        <p className="text-muted-foreground leading-snug">{entry.event}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Packing checklist</p>
                  <div className="space-y-2">
                    {packingChecklist.map((item) => (
                      <div
                        key={item.item}
                        className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Luggage className="w-4 h-4 text-primary" />
                          <span className="text-foreground">{item.item}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            item.required
                              ? "bg-primary/15 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-border/40"
                          }
                        >
                          {item.required ? "Required" : "Optional"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-dashed border-primary/30 p-3 text-xs text-muted-foreground">
                    Tip: Arlo watches weather shifts and will prompt if a wardrobe change is needed.
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
