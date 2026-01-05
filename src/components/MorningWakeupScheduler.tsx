import { useMorningWakeup } from '@/hooks/useMorningWakeup';

/**
 * Background component that schedules morning wake-up notifications.
 * This component renders nothing visible but sets up the notification scheduling.
 */
export function MorningWakeupScheduler() {
  // Just invoke the hook to set up scheduling
  useMorningWakeup();
  return null;
}