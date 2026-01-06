import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/arloAuth';
import type { Task } from '@/types/productivity';

interface TaskCalendarEvent {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  source: 'arlo_task';
  external_id: string | null;
  category: 'task';
}

/**
 * Hook for syncing tasks with Google Calendar
 * - Scheduled tasks appear on Google Calendar
 * - Changes in Arlo update Google Calendar
 * - Completion before time: delete from calendar
 * - Completion after time: leave on calendar
 */
export function useTaskCalendarSync() {
  
  // Push a task to Google Calendar
  const pushTaskToCalendar = useCallback(async (
    task: Task,
    action: 'create' | 'update' | 'delete'
  ): Promise<{ success: boolean; externalId?: string; error?: string }> => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        return { success: false, error: 'Not authenticated' };
      }

      // Only sync tasks that have a scheduled date
      if (!task.scheduledDate && action !== 'delete') {
        return { success: false, error: 'Task has no scheduled date' };
      }

      // Build the event data
      const scheduledDate = task.scheduledDate 
        ? task.scheduledDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      // Determine time - use time estimate or default to 1 hour block
      const durationMinutes = task.timeEstimateMinutes || 60;
      
      // Default to 9 AM if no specific time
      const startTime = '09:00';
      const [hours, minutes] = startTime.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + durationMinutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      const eventData = {
        id: task.id,
        title: `📋 ${task.title}`,
        description: task.description || `Task from Arlo\nPriority: ${task.priority}\nEnergy: ${task.energyLevel}`,
        location: null,
        start_time: `${scheduledDate}T${startTime}:00`,
        end_time: `${scheduledDate}T${endTime}:00`,
        is_all_day: false,
        external_id: (task as any).calendarExternalId || null,
        category: 'task',
        source: 'arlo_task',
      };

      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: {
          action: 'push_task',
          task: eventData,
          taskAction: action,
        },
        headers: headers as Record<string, string>,
      });

      if (error) {
        console.error('[task-calendar-sync] Error:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        console.error('[task-calendar-sync] API error:', data.error);
        return { success: false, error: data.error };
      }

      return { success: true, externalId: data?.externalId };
    } catch (err) {
      console.error('[task-calendar-sync] Exception:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  // Handle task completion with smart calendar behavior
  const handleTaskCompletion = useCallback(async (
    task: Task,
    completed: boolean
  ): Promise<void> => {
    if (!task.scheduledDate || !(task as any).calendarExternalId) {
      return; // No calendar event to manage
    }

    const now = new Date();
    const scheduledDate = task.scheduledDate;
    
    if (completed) {
      // Check if task is completed before its scheduled time
      if (now < scheduledDate) {
        // Remove from calendar - completed before time
        await pushTaskToCalendar(task, 'delete');
      }
      // If completed after time, leave on calendar (time has passed)
    } else {
      // Task uncompleted - add back to calendar if scheduled in future
      if (scheduledDate > now) {
        await pushTaskToCalendar(task, 'create');
      }
    }
  }, [pushTaskToCalendar]);

  // Sync all scheduled tasks (batch operation)
  const syncAllScheduledTasks = useCallback(async (
    tasks: Task[]
  ): Promise<{ synced: number; errors: number }> => {
    const scheduledTasks = tasks.filter(t => t.scheduledDate && !t.done);
    let synced = 0;
    let errors = 0;

    for (const task of scheduledTasks) {
      const hasCalendarEntry = !!(task as any).calendarExternalId;
      const action = hasCalendarEntry ? 'update' : 'create';
      
      const result = await pushTaskToCalendar(task, action);
      if (result.success) {
        synced++;
      } else {
        errors++;
      }
    }

    return { synced, errors };
  }, [pushTaskToCalendar]);

  return {
    pushTaskToCalendar,
    handleTaskCompletion,
    syncAllScheduledTasks,
  };
}
