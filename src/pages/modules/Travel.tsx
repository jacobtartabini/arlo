import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Backpack, Bed, Luggage, Map, Plane, Utensils } from "lucide-react";

const bookings = [
  { type: "Flight", route: "SFO → NYC", date: "Apr 28", status: "Confirmed" },
  { type: "Hotel", route: "Hudson Loft", date: "Apr 28 – May 2", status: "Pending" },
  { type: "Flight", route: "NYC → SFO", date: "May 2", status: "Standby" },
];

const restaurants = [
  { name: "Terra Rooftop", time: "Thu 7:30 PM", status: "Confirmed" },
  { name: "Noir Bistro", time: "Waitlist", status: "Join" },
  { name: "Green Market", time: "Fri 12:00 PM", status: "Confirmed" },
];

const tripTimeline = [
  { time: "Apr 27, 21:30", event: "Pack + sync boarding passes" },
  { time: "Apr 28, 05:45", event: "Depart home for SFO" },
  { time: "Apr 28, 07:15", event: "Security & lounge" },
  { time: "Apr 28, 09:10", event: "Flight DL204 departs" },
  { time: "Apr 28, 18:05", event: "Arrive JFK + rideshare" },
];

const packingChecklist = [
  { item: "Passport & TSA PreCheck", required: true },
  { item: "Conference badge", required: true },
  { item: "Camera kit", required: false },
  { item: "Portable charger", required: false },
];

export default function Travel() {
  useEffect(() => {
    document.title = "Travel — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Next flight", value: "SFO → NYC", helper: "Apr 28 · 09:10", tone: "neutral", trend: [12, 9, 6, 3] },
    { label: "Stay", value: "Hudson Loft", helper: "Check-in Apr 28", tone: "neutral", trend: [1, 1, 1, 0.5] },
    { label: "Dining", value: "3 holds", helper: "2 confirmed", tone: "positive", trend: [1, 2, 3] },
    { label: "Packing", value: "4 items", helper: "2 required", tone: "neutral", trend: [20, 40, 60, 70] },
  ];

  const sections: ModuleSection[] = [
    {
      title: "Trip brief",
      description: "A modern, visual deck for this itinerary so you see the posture, not just the list.",
      variant: "split",
      items: [
        {
          title: "Outbound",
          description: "SFO → NYC · Delta 204 · Boarding group checked",
          badge: "Confirmed",
          tone: "positive",
          icon: <Plane className="h-5 w-5" />,
          visual: { type: "progress", value: 72, label: "Gate timing" },
          spotlight: true,
        },
        {
          title: "Stay",
          description: "Hudson Loft · SoHo · Early check-in requested",
          badge: "Pending response",
          tone: "info",
          icon: <Bed className="h-5 w-5" />,
          visual: { type: "pill", label: "Hold till 6 PM", tone: "info" },
        },
        {
          title: "Return",
          description: "NYC → SFO · standby window locked",
          badge: "Standby",
          tone: "neutral",
          icon: <Plane className="h-5 w-5" />,
          visual: { type: "trend", points: [3, 2, 1], tone: "neutral" },
        },
      ],
    },
    {
      title: "Flight + stay stack",
      description: "Everything travelers need in one skinny rail: status, timing, and the nudge you should take now.",
      items: bookings.map((booking) => ({
        title: `${booking.type}: ${booking.route}`,
        description: booking.date,
        badge: booking.status,
        tone: booking.status === "Pending" ? "info" : booking.status === "Standby" ? "neutral" : "positive",
        icon: booking.type === "Flight" ? <Plane className="h-4 w-4" /> : <Bed className="h-4 w-4" />,
        visual:
          booking.status === "Confirmed"
            ? { type: "pill", label: "Boarding pass saved", tone: "positive" }
            : { type: "progress", value: booking.status === "Pending" ? 48 : 30 },
      })),
    },
    {
      title: "Itinerary timeline",
      description: "The checkpoints that matter. Arlo keeps the spacing quiet while still making order obvious.",
      variant: "timeline",
      accent: "info",
      items: tripTimeline.map((stop) => ({
        title: stop.event,
        description: stop.time,
        icon: <Map className="h-4 w-4" />,
        badge: stop.event.includes("Flight") ? "Airport" : undefined,
      })),
    },
    {
      title: "Food holds",
      description: "Reservations and waitlists rendered as signals, not paragraphs.",
      items: restaurants.map((restaurant) => ({
        title: restaurant.name,
        description: restaurant.time,
        badge: restaurant.status,
        tone: restaurant.status === "Confirmed" ? "positive" : "info",
        icon: <Utensils className="h-4 w-4" />,
        visual:
          restaurant.status === "Confirmed"
            ? { type: "pill", label: "Saved to wallet", tone: "positive" }
            : { type: "progress", value: 35, label: "Waitlist" },
      })),
    },
    {
      title: "Packing essentials",
      description: "A minimal kit so you only see the things that break the trip if forgotten.",
      items: packingChecklist.map((item) => ({
        title: item.item,
        badge: item.required ? "Required" : "Optional",
        tone: item.required ? "positive" : "neutral",
        icon: <Backpack className="h-4 w-4" />,
        visual: { type: "progress", value: item.required ? 100 : 60, label: "Check" },
      })),
    },
  ];

  return (
    <ModuleTemplate
      icon={Luggage}
      title="Travel"
      description="A light trip board: confirmed holds, a simple timeline, and the essentials you shouldn’t forget."
      primaryAction="Add booking"
      secondaryAction="Share itinerary"
      accent="cyan"
      stats={stats}
      sections={sections}
    />
  );
}

