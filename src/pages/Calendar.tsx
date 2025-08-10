"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Settings, 
  Clock, 
  Users, 
  Briefcase, 
  Target,
  GripVertical,
  X,
  Edit3,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { 
  format, 
  addDays, 
  addWeeks, 
  addMonths, 
  startOfWeek, 
  startOfMonth, 
  startOfDay,
  endOfWeek,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  parseISO
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Types
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  category: 'personal' | 'work' | 'school' | 'meeting' | 'project';
  color: string;
  attendees?: string[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category: 'personal' | 'work' | 'school';
  dueDate?: string;
  completed: boolean;
  estimatedTime?: number; // in minutes
}

interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  milestones: Milestone[];
  color: string;
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

interface BookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  available: boolean;
  title?: string;
  bookedBy?: string;
}

type ViewMode = 'month' | 'week' | 'day';
type PanelMode = 'calendar' | 'tasks' | 'projects' | 'bookings';

// Sample data
const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    description: 'Daily team sync meeting',
    startTime: '09:00',
    endTime: '09:30',
    date: '2024-01-15',
    category: 'work',
    color: '#3B82F6',
    attendees: ['john@example.com', 'jane@example.com']
  },
  {
    id: '2',
    title: 'Project Review',
    description: 'Quarterly project review with stakeholders',
    startTime: '14:00',
    endTime: '15:30',
    date: '2024-01-15',
    category: 'work',
    color: '#8B5CF6',
    attendees: ['manager@example.com']
  },
  {
    id: '3',
    title: 'Gym Session',
    startTime: '18:00',
    endTime: '19:30',
    date: '2024-01-16',
    category: 'personal',
    color: '#10B981'
  }
];

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Complete project proposal',
    description: 'Draft and finalize the Q1 project proposal',
    priority: 'high',
    category: 'work',
    dueDate: '2024-01-20',
    completed: false,
    estimatedTime: 120
  },
  {
    id: '2',
    title: 'Review design mockups',
    priority: 'medium',
    category: 'work',
    dueDate: '2024-01-18',
    completed: false,
    estimatedTime: 60
  },
  {
    id: '3',
    title: 'Buy groceries',
    priority: 'low',
    category: 'personal',
    completed: false,
    estimatedTime: 30
  }
];

const sampleProjects: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    description: 'Complete overhaul of company website',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    progress: 35,
    color: '#F59E0B',
    milestones: [
      { id: '1', title: 'Design Phase Complete', date: '2024-01-31', completed: true },
      { id: '2', title: 'Development Phase', date: '2024-02-28', completed: false },
      { id: '3', title: 'Testing & Launch', date: '2024-03-31', completed: false }
    ]
  }
];

const sampleBookings: BookingSlot[] = [
  {
    id: '1',
    startTime: '10:00',
    endTime: '11:00',
    date: '2024-01-17',
    available: true
  },
  {
    id: '2',
    startTime: '11:00',
    endTime: '12:00',
    date: '2024-01-17',
    available: false,
    title: 'Client Meeting',
    bookedBy: 'client@example.com'
  }
];

// Event Form Component
interface EventFormProps {
  event?: CalendarEvent;
  selectedDate?: string;
  selectedTime?: string;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onCancel: () => void;
}

function EventForm({ event, selectedDate, selectedTime, onSave, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date || selectedDate || format(new Date(), 'yyyy-MM-dd'),
    startTime: event?.startTime || selectedTime || '09:00',
    endTime: event?.endTime || '10:00',
    category: event?.category || 'work' as const,
    color: event?.color || '#3B82F6'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md bg-background/90 backdrop-blur-xl border-border/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {event ? 'Edit Event' : 'New Event'}
            </h3>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">Start Time</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">End Time</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Category</label>
              <Select value={formData.category} onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {event ? 'Update' : 'Create'} Event
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Task Panel Component
function TaskPanel({ tasks, onTaskUpdate }: { tasks: Task[], onTaskUpdate: (tasks: Task[]) => void }) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const toggleTask = (taskId: string) => {
    onTaskUpdate(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Tasks</h3>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>
      
      <div className="space-y-2">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            draggable
            onDragStart={() => handleDragStart(task)}
            onDragEnd={handleDragEnd}
            className={cn(
              "p-3 rounded-lg border bg-background/60 backdrop-blur-sm cursor-move",
              "hover:bg-background/80 transition-all",
              task.completed && "opacity-60"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn(
                    "font-medium text-sm text-foreground",
                    task.completed && "line-through"
                  )}>
                    {task.title}
                  </h4>
                  <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {task.category}
                  </Badge>
                  {task.estimatedTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.estimatedTime}m
                    </span>
                  )}
                  {task.dueDate && (
                    <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
                  )}
                </div>
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Project Panel Component
function ProjectPanel({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Projects</h3>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
      
      <div className="space-y-4">
        {projects.map((project) => (
          <Card key={project.id} className="bg-background/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: project.color }}
                />
                <h4 className="font-medium text-foreground">{project.name}</h4>
              </div>
              
              {project.description && (
                <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
              )}
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm text-foreground">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{ 
                      width: `${project.progress}%`,
                      backgroundColor: project.color 
                    }}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <h5 className="text-sm font-medium text-foreground">Milestones</h5>
                {project.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      milestone.completed ? "bg-green-500" : "bg-muted"
                    )} />
                    <span className={cn(
                      "text-foreground",
                      milestone.completed && "line-through opacity-60"
                    )}>
                      {milestone.title}
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {format(parseISO(milestone.date), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Booking Panel Component
function BookingPanel({ bookings }: { bookings: BookingSlot[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Bookings</h3>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Slot
        </Button>
      </div>
      
      <div className="space-y-2">
        {bookings.map((slot) => (
          <div
            key={slot.id}
            className={cn(
              "p-3 rounded-lg border",
              slot.available 
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-foreground">
                  {slot.startTime} - {slot.endTime}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(slot.date), 'MMM d, yyyy')}
                </div>
                {slot.title && (
                  <div className="text-sm mt-1 text-foreground">{slot.title}</div>
                )}
                {slot.bookedBy && (
                  <div className="text-xs text-muted-foreground">
                    Booked by: {slot.bookedBy}
                  </div>
                )}
              </div>
              <Badge variant={slot.available ? "default" : "destructive"}>
                {slot.available ? "Available" : "Booked"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Calendar Component
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [panelMode, setPanelMode] = useState<PanelMode>('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [projects] = useState<Project[]>(sampleProjects);
  const [bookings] = useState<BookingSlot[]>(sampleBookings);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  useEffect(() => {
    document.title = "Calendar – Arlo AI";
  }, []);

  // Calendar navigation
  const navigateCalendar = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'day':
          return direction === 'next' ? addDays(prev, 1) : addDays(prev, -1);
        case 'week':
          return direction === 'next' ? addWeeks(prev, 1) : addWeeks(prev, -1);
        case 'month':
          return direction === 'next' ? addMonths(prev, 1) : addMonths(prev, -1);
        default:
          return prev;
      }
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Get calendar days for month view
  const calendarDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    
    return eachDayOfInterval({ start, end });
  }, [currentDate, viewMode]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateStr);
  }, [events]);

  // Handle event creation/editing
  const handleSaveEvent = useCallback((eventData: Omit<CalendarEvent, 'id'>) => {
    if (editingEvent) {
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id 
          ? { ...eventData, id: editingEvent.id }
          : event
      ));
    } else {
      const newEvent: CalendarEvent = {
        ...eventData,
        id: Date.now().toString()
      };
      setEvents(prev => [...prev, newEvent]);
    }
    setShowEventForm(false);
    setEditingEvent(null);
  }, [editingEvent]);

  // Handle task drag to calendar
  const handleTaskDrop = useCallback((date: Date, time?: string) => {
    if (!draggedTask) return;
    
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: draggedTask.title,
      description: draggedTask.description,
      date: format(date, 'yyyy-MM-dd'),
      startTime: time || '09:00',
      endTime: time ? format(addDays(parseISO(`2000-01-01T${time}`), 0), 'HH:mm') : '10:00',
      category: draggedTask.category as any,
      color: draggedTask.priority === 'high' ? '#EF4444' : 
             draggedTask.priority === 'medium' ? '#F59E0B' : '#10B981'
    };
    
    setEvents(prev => [...prev, newEvent]);
    setTasks(prev => prev.filter(task => task.id !== draggedTask.id));
    setDraggedTask(null);
  }, [draggedTask]);

  // Handle day click
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    if (viewMode === 'month') {
      setShowEventForm(true);
    }
  }, [viewMode]);

  // Time slots for week/day view
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(format(new Date().setHours(hour, 0, 0, 0), 'HH:mm'));
    }
    return slots;
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="h-full flex">
        {/* Sidebar */}
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-80 bg-background/30 backdrop-blur-xl border-r border-border/20 p-6 overflow-y-auto"
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Motion Calendar</h1>
                <p className="text-sm text-muted-foreground">AI-powered scheduling</p>
              </div>
            </div>

            {/* Panel Mode Selector */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={panelMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPanelMode('calendar')}
                className="gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </Button>
              <Button
                variant={panelMode === 'tasks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPanelMode('tasks')}
                className="gap-2"
              >
                <Target className="h-4 w-4" />
                Tasks
              </Button>
              <Button
                variant={panelMode === 'projects' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPanelMode('projects')}
                className="gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Projects
              </Button>
              <Button
                variant={panelMode === 'bookings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPanelMode('bookings')}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Bookings
              </Button>
            </div>

            {/* Panel Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={panelMode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {panelMode === 'calendar' && (
                  <div className="space-y-4">
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => setShowEventForm(true)}
                    >
                      <Plus className="h-4 w-4" />
                      New Event
                    </Button>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-foreground">Upcoming Events</h3>
                      {events.slice(0, 5).map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/20"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: event.color }}
                            />
                            <span className="font-medium text-sm text-foreground">{event.title}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(event.date), 'MMM d')} • {event.startTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {panelMode === 'tasks' && (
                  <TaskPanel 
                    tasks={tasks} 
                    onTaskUpdate={setTasks}
                  />
                )}
                
                {panelMode === 'projects' && (
                  <ProjectPanel projects={projects} />
                )}
                
                {panelMode === 'bookings' && (
                  <BookingPanel bookings={bookings} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="bg-background/30 backdrop-blur-xl border-b border-border/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateCalendar('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateCalendar('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={goToToday}>
                    Today
                  </Button>
                </div>
                
                <h2 className="text-2xl font-bold text-foreground">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-background/50 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={viewMode === 'day' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('day')}
                  >
                    Day
                  </Button>
                </div>
                
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 p-6">
            {viewMode === 'month' && (
              <div className="h-full">
                {/* Week Headers */}
                <div className="grid grid-cols-7 gap-px mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-px h-full">
                  {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <motion.div
                        key={index}
                        layout
                        className={cn(
                          "bg-background/40 backdrop-blur-sm border border-border/20 p-2 cursor-pointer",
                          "hover:bg-background/60 transition-all",
                          !isCurrentMonth && "opacity-50",
                          isSelected && "ring-2 ring-primary",
                          isToday(day) && "bg-primary/10"
                        )}
                        onClick={() => handleDayClick(day)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleTaskDrop(day)}
                      >
                        <div className={cn(
                          "text-sm font-medium mb-1 text-foreground",
                          isToday(day) && "text-primary font-bold"
                        )}>
                          {format(day, 'd')}
                        </div>
                        
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <motion.div
                              key={event.id}
                              layout
                              className="text-xs p-1 rounded truncate cursor-pointer text-foreground"
                              style={{ backgroundColor: event.color + '20', color: event.color }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(event);
                                setShowEventForm(true);
                              }}
                            >
                              {event.title}
                            </motion.div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {(viewMode === 'week' || viewMode === 'day') && (
              <div className="h-full flex">
                {/* Time Column */}
                <div className="w-20 border-r border-border/20">
                  {timeSlots.map((time) => (
                    <div key={time} className="h-12 border-b border-border/10 p-2 text-xs text-muted-foreground">
                      {time}
                    </div>
                  ))}
                </div>
                
                {/* Days Columns */}
                <div className="flex-1 grid grid-cols-1 gap-px">
                  {/* Single day for now - can be extended for week view */}
                  <div className="bg-background/20 backdrop-blur-sm">
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="h-12 border-b border-border/10 p-1 hover:bg-background/30 cursor-pointer"
                        onClick={() => {
                          setSelectedDate(currentDate);
                          setShowEventForm(true);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleTaskDrop(currentDate, time)}
                      >
                        {/* Events for this time slot would go here */}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Form Modal */}
        <AnimatePresence>
          {showEventForm && (
            <EventForm
              event={editingEvent || undefined}
              selectedDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
              onSave={handleSaveEvent}
              onCancel={() => {
                setShowEventForm(false);
                setEditingEvent(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}