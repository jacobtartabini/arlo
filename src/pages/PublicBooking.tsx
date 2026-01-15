"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  X,
  CheckCircle,
  Info,
  User,
  Mail,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";

// Toast Component
interface ToasterProps {
  title?: string;
  message: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
  onDismiss?: () => void;
  highlightTitle?: boolean;
}

interface ToasterRef {
  show: (props: ToasterProps) => void;
}

const variantStyles: Record<string, string> = {
  default: "bg-card border-border text-foreground",
  success: "bg-card border-emerald-600/50",
  error: "bg-card border-destructive/50",
  warning: "bg-card border-amber-600/50",
};

const titleColor: Record<string, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
};

const iconColor: Record<string, string> = {
  default: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
};

const variantIcons: Record<string, React.ElementType> = {
  default: Info,
  success: CheckCircle,
  error: Info,
  warning: Info,
};

const toastAnimation = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 50, scale: 0.95 },
};

const ToastContainer = React.forwardRef<ToasterRef>((props, ref) => {
  const [toasts, setToasts] = useState<Array<ToasterProps & { id: number }>>([]);
  const nextId = useRef(0);

  React.useImperativeHandle(ref, () => ({
    show(toastProps: ToasterProps) {
      const id = nextId.current++;
      const duration = toastProps.duration || 4000;

      setToasts((prev) => [...prev, { ...toastProps, id }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        toastProps.onDismiss?.();
      }, duration);
    },
  }));

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = variantIcons[toast.variant || "default"];
          return (
            <motion.div
              key={toast.id}
              layout
              {...toastAnimation}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm min-w-[300px] max-w-[400px]",
                variantStyles[toast.variant || "default"]
              )}
            >
              <Icon
                className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor[toast.variant || "default"])}
              />
              <div className="flex-1 space-y-1">
                {toast.title && (
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      titleColor[toast.variant || "default"]
                    )}
                  >
                    {toast.title}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

ToastContainer.displayName = "ToastContainer";

// Calendar utilities
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const formatDateDisplay = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const isSameDayUtil = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isPastDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Generate time slots based on booking slots configuration
const generateTimeSlots = (
  date: Date,
  bookingSlots: Array<{ day_of_week: number; start_time: string; end_time: string; duration_minutes: number; enabled: boolean }>
): string[] => {
  const dayOfWeek = date.getDay();

  // Find slots for this day
  const slotsForDay = bookingSlots.filter(
    (slot) => slot.day_of_week === dayOfWeek && slot.enabled
  );

  if (slotsForDay.length === 0) return [];

  const timeSlots: string[] = [];

  slotsForDay.forEach((slot) => {
    const [startHour, startMin] = slot.start_time.split(":").map(Number);
    const [endHour, endMin] = slot.end_time.split(":").map(Number);
    const duration = slot.duration_minutes || 30;

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime + duration <= endTime) {
      const hour = Math.floor(currentTime / 60);
      const min = currentTime % 60;
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      const displayMin = min.toString().padStart(2, "0");
      timeSlots.push(`${displayHour}:${displayMin} ${period}`);
      currentTime += duration;
    }
  });

  return timeSlots;
};

const DEFAULT_HANDLE = "jacob";

const PublicBookingPage = () => {
  const params = useParams();
  const handle = (params.handle ?? DEFAULT_HANDLE).toLowerCase();

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [bookingSlots, setBookingSlots] = useState<
    Array<{ day_of_week: number; start_time: string; end_time: string; duration_minutes: number; enabled: boolean }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toastRef = useRef<ToasterRef>(null);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  // Load booking slots configuration (with fallback defaults)
  useEffect(() => {
    const loadBookingSlots = async () => {
      // Use default slots since we don't have user context
      // This would fetch from the user's booking_slots table when available
      const defaultSlots = [
        { day_of_week: 1, start_time: "09:00", end_time: "17:00", duration_minutes: 30, enabled: true },
        { day_of_week: 2, start_time: "09:00", end_time: "17:00", duration_minutes: 30, enabled: true },
        { day_of_week: 3, start_time: "09:00", end_time: "17:00", duration_minutes: 30, enabled: true },
        { day_of_week: 4, start_time: "09:00", end_time: "17:00", duration_minutes: 30, enabled: true },
        { day_of_week: 5, start_time: "09:00", end_time: "17:00", duration_minutes: 30, enabled: true },
      ];
      setBookingSlots(defaultSlots);
    };
    loadBookingSlots();
  }, [handle]);

  useEffect(() => {
    if (selectedDate && bookingSlots.length > 0) {
      setIsLoadingSlots(true);
      setSelectedTime(null);

      // Fetch real availability from backend
      const fetchAvailability = async () => {
        try {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          
          const { data, error } = await supabase.functions.invoke('get-availability', {
            body: {
              date: dateStr,
              handle,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              durationMinutes: bookingSlots[0]?.duration_minutes || 30,
            },
          });

          if (error) {
            console.error('Error fetching availability:', error);
            // Fallback to generated slots if API fails
            const slots = generateTimeSlots(selectedDate, bookingSlots);
            setAvailableSlots(slots);
          } else if (data?.slots) {
            setAvailableSlots(data.slots.map((s: { time: string }) => s.time));
          } else if (data?.reason) {
            // Date is unavailable (weekend, holiday, etc.)
            setAvailableSlots([]);
          } else {
            setAvailableSlots([]);
          }
        } catch (err) {
          console.error('Failed to fetch availability:', err);
          // Fallback to generated slots
          const slots = generateTimeSlots(selectedDate, bookingSlots);
          setAvailableSlots(slots);
        } finally {
          setIsLoadingSlots(false);
        }
      };

      fetchAvailability();
    }
  }, [selectedDate, bookingSlots, handle]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);

    if (isPastDate(date)) {
      return;
    }

    setSelectedDate(date);
    setShowDetailsForm(false);
  };

  const handleTimeClick = (time: string) => {
    setSelectedTime(time);
    setShowDetailsForm(true);
  };

  const handleReset = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    setName("");
    setEmail("");
    setMessage("");
    setShowDetailsForm(false);
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !name || !email) return;

    setIsSubmitting(true);

    toastRef.current?.show({
      title: "Scheduling...",
      message: "Please wait while we schedule your meeting.",
      variant: "default",
      duration: 3000,
    });

    try {
      // Call the edge function to create the booking
      // Send the date as YYYY-MM-DD format to avoid timezone issues
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          date: dateStr,
          time: selectedTime,
          name: name.trim(),
          email: email.trim(),
          message: message.trim() || undefined,
          handle,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Send client's timezone
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to create booking");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toastRef.current?.show({
        title: "Meeting Scheduled!",
        message: `Your meeting has been confirmed for ${formatDateDisplay(selectedDate)} at ${selectedTime}. A confirmation email has been sent to ${email}.`,
        variant: "success",
        duration: 6000,
        highlightTitle: true,
      });

      // Reset form after successful booking
      setTimeout(() => {
        handleReset();
      }, 1500);
    } catch (err: any) {
      console.error("Booking error:", err);
      toastRef.current?.show({
        title: "Booking Failed",
        message: err.message || "Unable to schedule meeting. Please try again.",
        variant: "error",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = isSameDayUtil(date, today);
      const isSelected = selectedDate && isSameDayUtil(date, selectedDate);
      const isPast = isPastDate(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const hasSlots = bookingSlots.some(
        (slot) => slot.day_of_week === date.getDay() && slot.enabled
      );

      days.push(
        <motion.button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={isPast || !hasSlots}
          whileHover={!isPast && hasSlots ? { scale: 1.1 } : {}}
          whileTap={!isPast && hasSlots ? { scale: 0.95 } : {}}
          className={cn(
            "h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            isToday && !isSelected && "border-2 border-primary",
            isSelected && "bg-primary text-primary-foreground shadow-md",
            !isSelected && !isPast && hasSlots && "hover:bg-accent hover:text-accent-foreground",
            (isPast || !hasSlots) && "text-muted-foreground/40 cursor-not-allowed",
            isWeekend && !isPast && !isSelected && "text-muted-foreground/60",
            !isSelected && !isPast && !isToday && hasSlots && "text-foreground"
          )}
        >
          {day}
        </motion.button>
      );
    }

    return days;
  };

  const isConfirmDisabled =
    !selectedDate || !selectedTime || !name || !email || isSubmitting;
  const isDetailsFormValid =
    name.trim() !== "" && email.trim() !== "" && email.includes("@");

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.04),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(5,150,105,0.04),transparent_28%)]">
      <ToastContainer ref={toastRef} />

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <Card className="border-border/60 bg-card/90 shadow-lg backdrop-blur">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl sm:text-3xl font-semibold text-foreground">
              Schedule a Meeting
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Select a date and time that works for you
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Calendar Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-border/50 bg-muted/30 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevMonth}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold text-foreground">
                        {monthNames[currentMonth]} {currentYear}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNextMonth}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                          <div
                            key={day}
                            className="h-10 flex items-center justify-center text-xs font-medium text-muted-foreground"
                          >
                            {day}
                          </div>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendarDays()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Time Selection Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card className="border-border/50 bg-muted/30 shadow-none h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Available Times
                    </CardTitle>
                    {selectedDate && (
                      <CardDescription className="text-sm">
                        {formatDateDisplay(selectedDate)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!selectedDate ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Please select a date to view available times
                        </p>
                      </div>
                    ) : isLoadingSlots ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium text-foreground">
                          No available times
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Please select another date
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                        {availableSlots.map((time, index) => (
                          <motion.button
                            key={`${time}-${index}`}
                            type="button"
                            onClick={() => handleTimeClick(time)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                              selectedTime === time
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-accent/50 hover:bg-accent text-accent-foreground"
                            )}
                          >
                            {time}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Contact Details Form */}
            <AnimatePresence>
              {showDetailsForm && selectedDate && selectedTime && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-border/50 bg-muted/30 shadow-none overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Your Details
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Please provide your information to complete the booking
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="name"
                            className="flex items-center gap-1.5 text-sm"
                          >
                            <User className="h-3.5 w-3.5" />
                            Name *
                          </Label>
                          <Input
                            id="name"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-background/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="flex items-center gap-1.5 text-sm"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-background/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="message"
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message (optional)
                        </Label>
                        <Textarea
                          id="message"
                          placeholder="Share anything that will help prepare for our meeting..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={3}
                          className="bg-background/50 resize-none"
                        />
                      </div>

                      {/* Selection Summary */}
                      <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Your Selection
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {selectedDate && formatDateDisplay(selectedDate)}
                              {selectedDate && selectedTime && " at "}
                              {selectedTime}
                            </p>
                            {name && (
                              <p className="text-xs text-muted-foreground">
                                {name} ({email})
                              </p>
                            )}
                          </div>
                          {isDetailsFormValid && (
                            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={handleReset}>
                Reset
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirmDisabled || !isDetailsFormValid}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scheduling...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <p className="text-center text-xs text-muted-foreground/60">
          Powered by Arlo
        </p>
      </div>
    </div>
  );
};

export default PublicBookingPage;
