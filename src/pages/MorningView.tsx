import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Calendar, 
  Bell, 
  Flame, 
  ArrowRight, 
  X,
  Clock,
  MapPin,
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCalendarPersistence } from '@/hooks/useCalendarPersistence';
import { useNotificationsPersistence } from '@/hooks/useNotificationsPersistence';
import { useHabits } from '@/hooks/useHabits';
import { MorningWeatherSummary } from '@/components/MorningWeatherSummary';
import type { Notification } from '@/types/notifications';

export default function MorningView() {
  const navigate = useNavigate();
  const { events, isLoading: calendarLoading } = useCalendarPersistence();
  const { fetchNotifications } = useNotificationsPersistence();
  const { routines } = useHabits();
  
  const [overnightNotifications, setOvernightNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Get today's events
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEvents = events.filter(e => e.date === todayStr)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

  // Get morning routine
  const morningRoutine = routines.find(r => 
    r.routineType === 'morning' || 
    r.name.toLowerCase().includes('morning')
  );

  // Fetch overnight notifications (since midnight)
  useEffect(() => {
    const loadNotifications = async () => {
      setNotificationsLoading(true);
      const notifications = await fetchNotifications();
      
      // Filter to notifications from overnight (last 12 hours or since 9PM yesterday)
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 12);
      
      const overnight = notifications.filter(n => {
        const notifDate = new Date(n.createdAt);
        return notifDate >= cutoff && !n.read;
      });
      
      setOvernightNotifications(overnight);
      setNotificationsLoading(false);
    };
    
    loadNotifications();
  }, [fetchNotifications]);

  const handleStartRoutine = () => {
    if (morningRoutine) {
      navigate('/habits', { state: { startRoutine: morningRoutine.id } });
    } else {
      navigate('/habits');
    }
  };

  const handleDismiss = () => {
    navigate('/dashboard');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50"
        onClick={handleDismiss}
      >
        <X className="h-5 w-5" />
      </Button>

      <div className="container max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Sun className="h-16 w-16 mx-auto text-amber-500 mb-4" />
            </motion.div>
            <h1 className="text-3xl font-bold">{getGreeting()}</h1>
            <p className="text-muted-foreground text-lg">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>

          {/* Weather Summary */}
          <MorningWeatherSummary />

          {/* Today's Calendar */}
          <Card className="bg-background/60 backdrop-blur-md border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Today's Schedule</h2>
                </div>
                <Badge variant="secondary">
                  {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {calendarLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-muted/20 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : todayEvents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No events scheduled for today</p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {todayEvents.slice(0, 5).map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/20"
                      >
                        <div 
                          className="w-1 h-10 rounded-full"
                          style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                      </motion.div>
                    ))}
                    {todayEvents.length > 5 && (
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => navigate('/calendar')}
                      >
                        +{todayEvents.length - 5} more events
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Overnight Notifications */}
          {overnightNotifications.length > 0 && (
            <Card className="bg-background/60 backdrop-blur-md border-border/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Overnight Updates</h2>
                  </div>
                  <Badge variant="secondary">
                    {overnightNotifications.length} new
                  </Badge>
                </div>

                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {overnightNotifications.slice(0, 4).map((notif, index) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/20"
                      >
                        <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{notif.title}</p>
                          {notif.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notif.content}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {overnightNotifications.length > 4 && (
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => navigate('/notifications')}
                      >
                        +{overnightNotifications.length - 4} more
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Start Morning Routine CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Flame className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {morningRoutine ? morningRoutine.name : 'Start Your Day'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {morningRoutine 
                          ? `${morningRoutine.habits?.length || 0} habits to complete`
                          : 'Begin your morning routine'
                        }
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleStartRoutine} size="lg">
                    Start
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button variant="outline" onClick={() => navigate('/inbox')}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Inbox
            </Button>
            <Button variant="ghost" onClick={handleDismiss}>
              Skip for now
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}