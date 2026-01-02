/**
 * Shared Validation Utilities for Edge Functions
 * 
 * Provides Zod schemas and validation helpers for input sanitization.
 */

// Simple validation functions (no external dependencies for edge functions)

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common disposable email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com',
  'mailinator.com', 'throwaway.email', 'temp-mail.org',
  'fakeinbox.com', 'tempail.com', 'discard.email',
  'yopmail.com', 'trashmail.com', 'getnada.com',
  'mohmal.com', 'maildrop.cc', 'sharklasers.com',
  'spam4.me', 'grr.la', 'guerrillamail.info',
];

// Valid IANA timezones for US
const VALID_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage',
  'America/Honolulu', 'UTC'
];

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export interface BookingInput {
  date: string;
  time: string;
  name: string;
  email: string;
  message?: string;
  handle?: string;
  timezone?: string;
}

export interface ManageBookingInput {
  eventId: string;
  action: 'get' | 'reschedule' | 'cancel';
  newDate?: string;
  newTime?: string;
  email?: string;
  timezone?: string;
}

/**
 * Validate email format and check for disposable domains
 */
export function validateEmail(email: string): ValidationResult<string> {
  if (!email || typeof email !== 'string') {
    return { success: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { success: false, error: 'Email is required' };
  }

  if (trimmed.length > 254) {
    return { success: false, error: 'Email must be less than 255 characters' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { success: false, error: 'Invalid email format' };
  }

  // Check for disposable email domains
  const domain = trimmed.split('@')[1];
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { success: false, error: 'Disposable email addresses are not allowed' };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate name (letters, spaces, hyphens, apostrophes only)
 */
export function validateName(name: string): ValidationResult<string> {
  if (!name || typeof name !== 'string') {
    return { success: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { success: false, error: 'Name is required' };
  }

  if (trimmed.length > 100) {
    return { success: false, error: 'Name must be less than 100 characters' };
  }

  // Allow letters, spaces, hyphens, apostrophes, and common international characters
  const NAME_REGEX = /^[\p{L}\s'-]+$/u;
  if (!NAME_REGEX.test(trimmed)) {
    return { success: false, error: 'Name contains invalid characters' };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate optional message field
 */
export function validateMessage(message?: string): ValidationResult<string | undefined> {
  if (!message || typeof message !== 'string') {
    return { success: true, data: undefined };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { success: true, data: undefined };
  }

  if (trimmed.length > 1000) {
    return { success: false, error: 'Message must be less than 1000 characters' };
  }

  // Basic sanitization - remove potential script tags
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, ''); // Remove HTML tags

  return { success: true, data: sanitized };
}

/**
 * Validate date format (YYYY-MM-DD or ISO date string)
 */
export function validateDate(date: string): ValidationResult<string> {
  if (!date || typeof date !== 'string') {
    return { success: false, error: 'Date is required' };
  }

  const trimmed = date.trim();
  
  // Extract date part if ISO string
  const datePart = trimmed.split('T')[0];
  
  // Check format YYYY-MM-DD
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_REGEX.test(datePart)) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }

  // Validate it's a real date
  const parsed = new Date(datePart);
  if (isNaN(parsed.getTime())) {
    return { success: false, error: 'Invalid date' };
  }

  // Check date is not in the past (allow today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) {
    return { success: false, error: 'Date cannot be in the past' };
  }

  // Check date is not too far in the future (90 days)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (parsed > maxDate) {
    return { success: false, error: 'Date cannot be more than 90 days in the future' };
  }

  return { success: true, data: datePart };
}

/**
 * Validate time format (e.g., "10:00 AM")
 */
export function validateTime(time: string): ValidationResult<string> {
  if (!time || typeof time !== 'string') {
    return { success: false, error: 'Time is required' };
  }

  const trimmed = time.trim();
  
  const TIME_REGEX = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
  if (!TIME_REGEX.test(trimmed)) {
    return { success: false, error: 'Invalid time format. Use format like "10:00 AM"' };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate timezone
 */
export function validateTimezone(timezone?: string): ValidationResult<string> {
  if (!timezone || typeof timezone !== 'string') {
    return { success: true, data: 'America/New_York' }; // Default
  }

  const trimmed = timezone.trim();
  
  if (!VALID_TIMEZONES.includes(trimmed)) {
    return { success: true, data: 'America/New_York' }; // Fallback to default
  }

  return { success: true, data: trimmed };
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string): ValidationResult<string> {
  if (!id || typeof id !== 'string') {
    return { success: false, error: 'ID is required' };
  }

  const trimmed = id.trim();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!UUID_REGEX.test(trimmed)) {
    return { success: false, error: 'Invalid ID format' };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate booking creation input
 */
export function validateBookingInput(input: unknown): ValidationResult<BookingInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Validate each field
  const nameResult = validateName(data.name as string);
  if (!nameResult.success) errors.name = nameResult.error!;

  const emailResult = validateEmail(data.email as string);
  if (!emailResult.success) errors.email = emailResult.error!;

  const dateResult = validateDate(data.date as string);
  if (!dateResult.success) errors.date = dateResult.error!;

  const timeResult = validateTime(data.time as string);
  if (!timeResult.success) errors.time = timeResult.error!;

  const messageResult = validateMessage(data.message as string | undefined);
  if (!messageResult.success) errors.message = messageResult.error!;

  const timezoneResult = validateTimezone(data.timezone as string | undefined);

  // If any errors, return them
  if (Object.keys(errors).length > 0) {
    const firstError = Object.values(errors)[0];
    return { success: false, error: firstError, errors };
  }

  return {
    success: true,
    data: {
      name: nameResult.data!,
      email: emailResult.data!,
      date: dateResult.data!,
      time: timeResult.data!,
      message: messageResult.data,
      handle: typeof data.handle === 'string' ? data.handle.trim().slice(0, 100) : undefined,
      timezone: timezoneResult.data!,
    }
  };
}

/**
 * Validate manage booking input
 */
export function validateManageBookingInput(input: unknown): ValidationResult<ManageBookingInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Validate eventId
  const eventIdResult = validateUUID(data.eventId as string);
  if (!eventIdResult.success) errors.eventId = eventIdResult.error!;

  // Validate action
  const validActions = ['get', 'reschedule', 'cancel'];
  if (!data.action || !validActions.includes(data.action as string)) {
    errors.action = 'Invalid action. Must be get, reschedule, or cancel';
  }

  // For reschedule, validate new date and time
  if (data.action === 'reschedule') {
    const newDateResult = validateDate(data.newDate as string);
    if (!newDateResult.success) errors.newDate = newDateResult.error!;

    const newTimeResult = validateTime(data.newTime as string);
    if (!newTimeResult.success) errors.newTime = newTimeResult.error!;

    const emailResult = validateEmail(data.email as string);
    if (!emailResult.success) errors.email = emailResult.error!;
  }

  // For cancel, validate email
  if (data.action === 'cancel') {
    const emailResult = validateEmail(data.email as string);
    if (!emailResult.success) errors.email = emailResult.error!;
  }

  const timezoneResult = validateTimezone(data.timezone as string | undefined);

  // If any errors, return them
  if (Object.keys(errors).length > 0) {
    const firstError = Object.values(errors)[0];
    return { success: false, error: firstError, errors };
  }

  return {
    success: true,
    data: {
      eventId: eventIdResult.data!,
      action: data.action as 'get' | 'reschedule' | 'cancel',
      newDate: data.newDate ? (validateDate(data.newDate as string).data) : undefined,
      newTime: data.newTime ? (validateTime(data.newTime as string).data) : undefined,
      email: data.email ? (validateEmail(data.email as string).data) : undefined,
      timezone: timezoneResult.data!,
    }
  };
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  error: string, 
  errors?: Record<string, string>,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ 
      error, 
      validation_errors: errors,
      code: 'VALIDATION_ERROR'
    }),
    { 
      status: 400, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}
