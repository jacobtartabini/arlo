export const WORK_START_MINUTES = 9 * 60;
export const WORK_END_MINUTES = 18 * 60;
export const DISPLAY_START_MINUTES = 6 * 60;
export const DISPLAY_END_MINUTES = 22 * 60;
export const HOURS_PER_DAY = DISPLAY_END_MINUTES - DISPLAY_START_MINUTES;
export const HOUR_HEIGHT = 52;
export const MINUTE_STEP = 30;
export const STEPS_PER_HOUR = 60 / MINUTE_STEP;
export const DEFAULT_SELECTION_DURATION = 60;
export const COLOR_PRESETS = ["#2563eb", "#7c3aed", "#22c55e", "#f97316", "#ec4899", "#14b8a6"] as const;

export const blockTypeLabels = {
  event: "Event",
  booking: "Booking",
  task: "Task"
} as const;
