import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Luggage } from "lucide-react";

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
    { label: "Next flight", value: "SFO → NYC", helper: "Apr 28 · 09:10", tone: "neutral" },
    { label: "Stay", value: "Hudson Loft", helper: "Check-in Apr 28", tone: "neutral" },
    { label: "Dining", value: "3 holds", helper: "2 confirmed", tone: "positive" },
    { label: "Packing", value: "4 items", helper: "2 required", tone: "neutral" },
  ];

  const sections: ModuleSection[] = [
    {
      title: "Bookings",
      description: "Flights and stays kept in one simple list.",
      items: bookings.map((booking) => ({
        title: `${booking.type}: ${booking.route}`,
        description: booking.date,
        badge: booking.status,
      })),
    },
    {
      title: "Trip timeline",
      description: "The next few checkpoints for this itinerary.",
      items: tripTimeline.map((stop) => ({
        title: stop.event,
        description: stop.time,
      })),
    },
    {
      title: "Food holds",
      description: "Reservations and waitlists Arlo is tracking.",
      items: restaurants.map((restaurant) => ({
        title: restaurant.name,
        description: restaurant.time,
        badge: restaurant.status,
      })),
    },
    {
      title: "Packing essentials",
      description: "The minimum list so you never repack from scratch.",
      items: packingChecklist.map((item) => ({
        title: item.item,
        badge: item.required ? "Required" : "Optional",
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
      stats={stats}
      sections={sections}
    />
  );
}

