import { useMemo } from "react";
import { 
  MapPin, Plane, Calendar, DollarSign, Bookmark,
  CheckCircle2, Circle, ArrowRight, Sparkles, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Trip, TripDestination, TripItineraryItem, 
  TripSavedPlace, TripExpense 
} from "@/types/travel";
import { cn } from "@/lib/utils";

interface TripPlanningAssistantProps {
  trip: Trip;
  destinations: TripDestination[];
  itineraryItems: TripItineraryItem[];
  savedPlaces: TripSavedPlace[];
  expenses: TripExpense[];
  onNavigateTab: (tab: string) => void;
  onAddDestination: () => void;
}

interface PlanningStep {
  id: string;
  title: string;
  description: string;
  icon: typeof MapPin;
  isComplete: boolean;
  action?: () => void;
  actionLabel?: string;
  tab?: string;
}

export function TripPlanningAssistant({
  trip,
  destinations,
  itineraryItems,
  savedPlaces,
  expenses,
  onNavigateTab,
  onAddDestination,
}: TripPlanningAssistantProps) {
  const hasFlights = itineraryItems.some(i => i.itemType === 'flight');
  const hasLodging = itineraryItems.some(i => i.itemType === 'lodging');
  const hasActivities = itineraryItems.filter(i => 
    i.itemType === 'activity' || i.itemType === 'restaurant'
  ).length >= 3;
  const hasBudget = expenses.some(e => e.isPlanned);

  const steps: PlanningStep[] = useMemo(() => [
    {
      id: 'destination',
      title: 'Add your destination',
      description: destinations.length > 0 
        ? `${destinations.map(d => d.name).join(', ')}` 
        : 'Where are you headed? This helps us show weather, currency, and local suggestions.',
      icon: MapPin,
      isComplete: destinations.length > 0,
      action: onAddDestination,
      actionLabel: destinations.length > 0 ? 'Add another' : 'Add destination',
    },
    {
      id: 'flights',
      title: 'Plan your travel',
      description: hasFlights 
        ? `${itineraryItems.filter(i => i.itemType === 'flight').length} flight(s) added`
        : 'Search for flights or add your existing booking.',
      icon: Plane,
      isComplete: hasFlights,
      action: () => onNavigateTab('reservations'),
      actionLabel: hasFlights ? 'Manage' : 'Explore flights',
      tab: 'reservations',
    },
    {
      id: 'lodging',
      title: 'Book your stay',
      description: hasLodging 
        ? `${itineraryItems.filter(i => i.itemType === 'lodging').length} accommodation(s) added`
        : 'Add hotels, Airbnbs, or other places you\'ll stay.',
      icon: Home,
      isComplete: hasLodging,
      action: () => onNavigateTab('itinerary'),
      actionLabel: hasLodging ? 'View' : 'Add lodging',
      tab: 'itinerary',
    },
    {
      id: 'places',
      title: 'Discover places to visit',
      description: savedPlaces.length > 0
        ? `${savedPlaces.length} place(s) saved to explore`
        : 'Search and save restaurants, attractions, and hidden gems.',
      icon: Bookmark,
      isComplete: savedPlaces.length >= 5,
      action: () => onNavigateTab('map'),
      actionLabel: 'Explore map',
      tab: 'map',
    },
    {
      id: 'itinerary',
      title: 'Build your itinerary',
      description: hasActivities
        ? `${itineraryItems.length} activities planned`
        : 'Organize your days with activities, meals, and free time.',
      icon: Calendar,
      isComplete: hasActivities,
      action: () => onNavigateTab('itinerary'),
      actionLabel: 'Plan days',
      tab: 'itinerary',
    },
    {
      id: 'budget',
      title: 'Set your budget',
      description: hasBudget
        ? `$${expenses.filter(e => e.isPlanned).reduce((s, e) => s + e.amount, 0).toLocaleString()} budgeted`
        : 'Track planned expenses to stay on top of spending.',
      icon: DollarSign,
      isComplete: hasBudget,
      action: () => onNavigateTab('budget'),
      actionLabel: 'Set budget',
      tab: 'budget',
    },
  ], [destinations, itineraryItems, savedPlaces, expenses, hasFlights, hasLodging, hasActivities, hasBudget, onNavigateTab, onAddDestination]);

  const completedCount = steps.filter(s => s.isComplete).length;
  const progress = (completedCount / steps.length) * 100;
  
  // Find the next incomplete step
  const nextStep = steps.find(s => !s.isComplete);

  // If mostly complete, show minimal UI
  if (completedCount >= steps.length - 1) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold">Planning Assistant</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {completedCount} of {steps.length} complete
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2 mb-5" />

        {/* Next Step Highlight */}
        {nextStep && (
          <div className="p-4 rounded-lg bg-background border mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <nextStep.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Next: {nextStep.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {nextStep.description}
                </p>
              </div>
              {nextStep.action && (
                <Button size="sm" onClick={nextStep.action}>
                  {nextStep.actionLabel}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Steps List */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                step.isComplete ? "opacity-60" : "cursor-pointer hover:bg-muted/50",
                step.id === nextStep?.id && "hidden" // Hide the highlighted step from list
              )}
              onClick={() => step.tab && onNavigateTab(step.tab)}
            >
              <div className={cn(
                "p-1.5 rounded-full shrink-0",
                step.isComplete ? "bg-green-500/10" : "bg-muted"
              )}>
                {step.isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className={cn(
                "text-sm flex-1",
                step.isComplete && "line-through text-muted-foreground"
              )}>
                {step.title}
              </span>
              {step.isComplete && (
                <span className="text-xs text-green-600">Done</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
