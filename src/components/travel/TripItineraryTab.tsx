import { useState } from "react";
import { format, isSameDay, isToday, isFuture, isPast } from "date-fns";
import { 
  Plus, Plane, MapPin, Calendar, Utensils, Car, Coffee, 
  MoreVertical, Trash2, Clock, CalendarPlus, ChevronDown, ChevronUp,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TripItineraryItem, TripDestination, ItineraryItemType } from "@/types/travel";
import { AddItineraryItemDialog } from "./AddItineraryItemDialog";
import { cn } from "@/lib/utils";

interface TripItineraryTabProps {
  tripId: string;
  tripDays: Date[];
  items: TripItineraryItem[];
  destinations: TripDestination[];
  onCreateItem: (
    type: ItineraryItemType,
    title: string,
    startTime: Date,
    options?: {
      destinationId?: string;
      description?: string;
      endTime?: Date;
      locationName?: string;
      locationAddress?: string;
      confirmationCode?: string;
      cost?: number;
      notes?: string;
    }
  ) => Promise<TripItineraryItem | null>;
  onUpdateItem: (id: string, updates: Partial<TripItineraryItem>) => Promise<boolean>;
  onDeleteItem: (id: string) => Promise<boolean>;
}

const ITEM_TYPE_CONFIG: Record<ItineraryItemType, { icon: typeof Plane; color: string; label: string }> = {
  flight: { icon: Plane, color: 'text-cyan-500 bg-cyan-500/10', label: 'Flight' },
  lodging: { icon: MapPin, color: 'text-purple-500 bg-purple-500/10', label: 'Lodging' },
  activity: { icon: Calendar, color: 'text-green-500 bg-green-500/10', label: 'Activity' },
  restaurant: { icon: Utensils, color: 'text-amber-500 bg-amber-500/10', label: 'Restaurant' },
  transit: { icon: Car, color: 'text-blue-500 bg-blue-500/10', label: 'Transit' },
  free_time: { icon: Coffee, color: 'text-gray-500 bg-gray-500/10', label: 'Free Time' },
  other: { icon: MapPin, color: 'text-gray-500 bg-gray-500/10', label: 'Other' },
};

export function TripItineraryTab({
  tripId,
  tripDays,
  items,
  destinations,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: TripItineraryTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(tripDays.slice(0, 3).map(d => d.toISOString())));

  const getItemsForDay = (day: Date) => 
    items.filter(item => isSameDay(item.startTime, day));

  const handleAddForDay = (day: Date) => {
    setSelectedDate(day);
    setShowAddDialog(true);
  };

  const toggleDay = (day: Date) => {
    const key = day.toISOString();
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const totalItems = items.length;
  const daysWithPlans = new Set(items.map(i => format(i.startTime, 'yyyy-MM-dd'))).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Daily Itinerary</h2>
          <p className="text-sm text-muted-foreground">
            {totalItems} {totalItems === 1 ? 'activity' : 'activities'} across {daysWithPlans} {daysWithPlans === 1 ? 'day' : 'days'}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Empty State */}
      {totalItems === 0 && (
        <Card className="p-8 text-center border-dashed">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Start planning your days</h3>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            Add flights, accommodations, activities, and meals to build out your trip day by day.
          </p>
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first activity
          </Button>
        </Card>
      )}

      {/* Day by Day */}
      <div className="space-y-3">
        {tripDays.map((day, dayIndex) => {
          const dayItems = getItemsForDay(day);
          const isExpanded = expandedDays.has(day.toISOString());
          const dayKey = day.toISOString();
          const isPastDay = isPast(day) && !isToday(day);
          
          return (
            <Collapsible 
              key={dayKey} 
              open={isExpanded} 
              onOpenChange={() => toggleDay(day)}
            >
              <Card className={cn(isPastDay && "opacity-60")}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                          isToday(day) 
                            ? "bg-primary text-primary-foreground" 
                            : dayItems.length > 0 
                              ? "bg-muted" 
                              : "bg-muted/50 text-muted-foreground"
                        )}>
                          {dayIndex + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{format(day, 'EEEE')}</p>
                            {isToday(day) && (
                              <Badge variant="secondary" className="text-xs">Today</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(day, 'MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {dayItems.length > 0 && (
                          <Badge variant="outline">{dayItems.length} {dayItems.length === 1 ? 'item' : 'items'}</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddForDay(day);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only">Add</span>
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 border-t">
                    {dayItems.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground mb-3">
                          No activities planned for this day
                        </p>
                        <Button variant="outline" size="sm" onClick={() => handleAddForDay(day)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add something
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-3">
                        {dayItems.map(item => {
                          const config = ITEM_TYPE_CONFIG[item.itemType];
                          const Icon = config.icon;
                          
                          return (
                            <div 
                              key={item.id}
                              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium line-clamp-1">{item.title}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(item.startTime, 'h:mm a')}
                                        {item.endTime && (
                                          <span>- {format(item.endTime, 'h:mm a')}</span>
                                        )}
                                      </span>
                                      {item.locationName && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          <span className="truncate max-w-[150px]">{item.locationName}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <CalendarPlus className="h-4 w-4 mr-2" />
                                        Add to Calendar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => onDeleteItem(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {item.confirmationCode && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.confirmationCode}
                                    </Badge>
                                  )}
                                  {item.cost && (
                                    <Badge variant="secondary" className="text-xs">
                                      ${item.cost.toLocaleString()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      <AddItineraryItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultDate={selectedDate}
        destinations={destinations}
        onAdd={async (type, title, startTime, options) => {
          await onCreateItem(type, title, startTime, options);
          setShowAddDialog(false);
          setSelectedDate(null);
          // Expand the day we just added to
          setExpandedDays(prev => new Set([...prev, startTime.toISOString().split('T')[0]]));
        }}
      />
    </div>
  );
}
