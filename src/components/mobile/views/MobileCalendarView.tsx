import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCalendarPersistence } from "@/hooks/useCalendarPersistence";
import { MobilePageLayout } from "../MobilePageLayout";

export function MobileCalendarView() {
  const { events, isLoading } = useCalendarPersistence();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Week view days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month view days
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: addDays(startOfWeek(addDays(monthEnd, 6)), 6) });

  // Events for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateEvents = events
    .filter(e => e.date === selectedDateStr)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

  // Get events count for a specific day
  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const monthsToAdd = direction === 'next' ? 1 : -1;
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + monthsToAdd);
      return newDate;
    });
  };

  return (
    <MobilePageLayout 
      title="Calendar"
      subtitle={format(selectedDate, "MMMM yyyy")}
      headerRight={
        <div className="flex gap-1">
          <Button 
            variant={viewMode === "week" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
          <Button 
            variant={viewMode === "month" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setViewMode("month")}
          >
            Month
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => viewMode === "week" ? navigateWeek('prev') : navigateMonth('prev')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => viewMode === "week" ? navigateWeek('next') : navigateMonth('next')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Week View */}
        {viewMode === "week" && (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              const dayEvents = getEventsForDay(day);
              
              return (
                <motion.button
                  key={day.toISOString()}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-xl transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </span>
                  <span className={cn(
                    "text-lg font-semibold mt-1",
                    isSelected && "text-primary-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1",
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    )} />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Month View */}
        {viewMode === "month" && (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const dayEvents = getEventsForDay(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors",
                      !isCurrentMonth && "text-muted-foreground/40",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                    )}
                  >
                    {format(day, 'd')}
                    {dayEvents.length > 0 && (
                      <div className={cn(
                        "w-1 h-1 rounded-full mt-0.5",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Date Events */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {isSameDay(selectedDate, new Date()) 
                ? "Today" 
                : format(selectedDate, "EEEE, MMM d")
              }
            </h2>
            <Badge variant="secondary">
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {selectedDateEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 rounded-2xl border border-dashed bg-muted/20 text-center"
            >
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No events scheduled</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map((event, index) => (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full p-4 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex gap-3">
                    <div 
                      className="w-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{event.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {event.allDay ? (
                          <span>All day</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.startTime} - {event.endTime}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-3xl">
          {selectedEvent && (
            <>
              <SheetHeader className="pb-4">
                <div 
                  className="w-12 h-1 rounded-full mx-auto mb-4"
                  style={{ backgroundColor: selectedEvent.color || 'hsl(var(--primary))' }}
                />
                <SheetTitle>{selectedEvent.title}</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 pb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {selectedEvent.allDay ? (
                    <span>All day</span>
                  ) : (
                    <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                  )}
                </div>
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground pt-2 border-t">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </MobilePageLayout>
  );
}
