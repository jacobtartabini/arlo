import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { 
  Plus, Plane, MapPin, Calendar, Utensils, Car, Coffee, 
  MoreVertical, Trash2, Edit2, Clock, CalendarPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const getItemsForDay = (day: Date) => 
    items.filter(item => isSameDay(item.startTime, day));

  const handleAddForDay = (day: Date) => {
    setSelectedDate(day);
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Daily Itinerary</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="space-y-4">
        {tripDays.map((day, dayIndex) => {
          const dayItems = getItemsForDay(day);
          
          return (
            <Card key={day.toISOString()}>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <div>
                  <p className="font-semibold">Day {dayIndex + 1}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(day, 'EEEE, MMMM d')}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAddForDay(day)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                {dayItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No activities planned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map(item => {
                      const config = ITEM_TYPE_CONFIG[item.itemType];
                      const Icon = config.icon;
                      
                      return (
                        <div 
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn("p-2 rounded-lg", config.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(item.startTime, 'h:mm a')}</span>
                                  {item.endTime && (
                                    <span>- {format(item.endTime, 'h:mm a')}</span>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
                            {item.locationName && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {item.locationName}
                              </p>
                            )}
                            {item.confirmationCode && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                Conf: {item.confirmationCode}
                              </Badge>
                            )}
                            {item.cost && (
                              <Badge variant="secondary" className="mt-2 ml-2 text-xs">
                                ${item.cost.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
        }}
      />
    </div>
  );
}
