"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  ArrowLeft,
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Toast Component (reused from PublicBooking)
interface ToasterProps {
  title?: string;
  message: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
  onDismiss?: () => void;
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
  error: AlertTriangle,
  warning: AlertTriangle,
};

const ToastContainer = React.forwardRef<ToasterRef>((_, ref) => {
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
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm min-w-[300px] max-w-[400px]",
                variantStyles[toast.variant || "default"]
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor[toast.variant || "default"])} />
              <div className="flex-1 space-y-1">
                {toast.title && (
                  <p className={cn("font-semibold text-sm", titleColor[toast.variant || "default"])}>
                    {toast.title}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 hover:bg-muted/50 transition-colors"
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

interface BookingData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  guestName: string;
  guestEmail: string;
}

// Calendar utilities
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const isPastDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};
const isSameDayUtil = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

const formatDateForDisplay = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTimeForDisplay = (date: Date) =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

// Generate time slots (9 AM - 5 PM weekdays)
const generateTimeSlots = (date: Date): string[] => {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  const slots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    slots.push(`${displayHour}:00 ${period}`);
    slots.push(`${displayHour}:30 ${period}`);
  }
  return slots;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ManageBookingPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const toastRef = useRef<ToasterRef>(null);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  // Load booking data
  useEffect(() => {
    const loadBooking = async () => {
      if (!eventId) {
        setError("No booking ID provided");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.functions.invoke("manage-booking", {
          body: { eventId, action: "get" },
        });

        if (fetchError) throw new Error(fetchError.message);
        if (data?.error) throw new Error(data.error);

        setBooking(data.data);
      } catch (err: any) {
        console.error("Error loading booking:", err);
        setError(err.message || "Failed to load booking");
      } finally {
        setIsLoading(false);
      }
    };

    loadBooking();
  }, [eventId]);

  // Update available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      setAvailableSlots(generateTimeSlots(selectedDate));
      setSelectedTime(null);
    }
  }, [selectedDate]);

  const handleVerifyEmail = () => {
    if (!email || !email.includes("@")) {
      toastRef.current?.show({
        title: "Invalid Email",
        message: "Please enter a valid email address",
        variant: "error",
      });
      return;
    }
    setIsVerified(true);
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime || !email) return;

    setIsSubmitting(true);
    try {
      const { data, error: rescheduleError } = await supabase.functions.invoke("manage-booking", {
        body: {
          eventId,
          action: "reschedule",
          email,
          newDate: selectedDate.toISOString(),
          newTime: selectedTime,
        },
      });

      if (rescheduleError) throw new Error(rescheduleError.message);
      if (data?.error) throw new Error(data.error);

      toastRef.current?.show({
        title: "Booking Rescheduled",
        message: `Your meeting has been rescheduled to ${formatDateForDisplay(selectedDate)} at ${selectedTime}`,
        variant: "success",
        duration: 5000,
      });

      // Update local state
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              start_time: data.newStartTime,
              end_time: data.newEndTime,
            }
          : null
      );
      setIsRescheduling(false);
      setSelectedDate(null);
      setSelectedTime(null);
    } catch (err: any) {
      toastRef.current?.show({
        title: "Reschedule Failed",
        message: err.message || "Failed to reschedule booking",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { data, error: cancelError } = await supabase.functions.invoke("manage-booking", {
        body: { eventId, action: "cancel", email },
      });

      if (cancelError) throw new Error(cancelError.message);
      if (data?.error) throw new Error(data.error);

      toastRef.current?.show({
        title: "Booking Cancelled",
        message: "Your meeting has been cancelled successfully",
        variant: "success",
        duration: 5000,
      });

      setShowCancelDialog(false);
      setTimeout(() => navigate("/book"), 2000);
    } catch (err: any) {
      toastRef.current?.show({
        title: "Cancellation Failed",
        message: err.message || "Failed to cancel booking",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    if (!isPastDate(date)) {
      setSelectedDate(date);
    }
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = isSameDayUtil(date, today);
      const isSelected = selectedDate && isSameDayUtil(date, selectedDate);
      const isPast = isPastDate(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      days.push(
        <motion.button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={isPast || isWeekend}
          whileHover={!isPast && !isWeekend ? { scale: 1.1 } : {}}
          whileTap={!isPast && !isWeekend ? { scale: 0.95 } : {}}
          className={cn(
            "h-10 w-10 rounded-lg text-sm font-medium transition-all",
            isToday && !isSelected && "border-2 border-primary",
            isSelected && "bg-primary text-primary-foreground shadow-md",
            !isSelected && !isPast && !isWeekend && "hover:bg-accent",
            (isPast || isWeekend) && "text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          {day}
        </motion.button>
      );
    }

    return days;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading booking details...</span>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Booking Not Found</CardTitle>
            <CardDescription>
              {error || "This booking may have been cancelled or the link is invalid."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/book")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Book a New Meeting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.04),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(5,150,105,0.04),transparent_28%)]">
      <ToastContainer ref={toastRef} />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/book")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Booking
        </Button>

        <Card className="border-border/60 bg-card/90 shadow-lg backdrop-blur">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg">
              <CalendarIcon className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Manage Your Booking</CardTitle>
            <CardDescription>View, reschedule, or cancel your meeting</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Booking Details */}
            <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Meeting Details</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDateForDisplay(startDate)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {formatTimeForDisplay(startDate)} - {formatTimeForDisplay(endDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Guest</p>
                    <p className="font-medium">
                      {booking.guestName} ({booking.guestEmail})
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Verification */}
            {!isVerified && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    To make changes to this booking, please verify your email address.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleVerifyEmail}>Verify</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions (after verification) */}
            {isVerified && !isRescheduling && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsRescheduling(true)}
                >
                  Reschedule
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Booking
                </Button>
              </div>
            )}

            {/* Reschedule Calendar */}
            {isRescheduling && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Select New Date & Time</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsRescheduling(false);
                      setSelectedDate(null);
                      setSelectedTime(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>

                {/* Calendar */}
                <Card className="border-border/50 bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (currentMonth === 0) {
                            setCurrentMonth(11);
                            setCurrentYear(currentYear - 1);
                          } else {
                            setCurrentMonth(currentMonth - 1);
                          }
                        }}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold">
                        {monthNames[currentMonth]} {currentYear}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (currentMonth === 11) {
                            setCurrentMonth(0);
                            setCurrentYear(currentYear + 1);
                          } else {
                            setCurrentMonth(currentMonth + 1);
                          }
                        }}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
                  </CardContent>
                </Card>

                {/* Time slots */}
                {selectedDate && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Available times for {formatDateForDisplay(selectedDate)}
                    </p>
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                            className="text-sm"
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No available times for this date
                      </p>
                    )}
                  </div>
                )}

                {/* Confirm reschedule */}
                {selectedDate && selectedTime && (
                  <Button
                    onClick={handleReschedule}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Rescheduling...
                      </>
                    ) : (
                      `Reschedule to ${formatDateForDisplay(selectedDate)} at ${selectedTime}`
                    )}
                  </Button>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your meeting scheduled for{" "}
              {formatDateForDisplay(startDate)} at {formatTimeForDisplay(startDate)}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Booking"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageBookingPage;
