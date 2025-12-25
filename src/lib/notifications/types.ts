export type NotificationType = 'system' | 'chat' | 'calendar' | 'security';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  toastEnabled: boolean;
  pushEnabled: boolean;
  typeToggles: Record<NotificationType, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  platform: 'web' | 'pwa-ios' | 'pwa-android';
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotifyPayload {
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

// Database types
export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  source: string;
  read: boolean;
  read_at: string | null;
  archived_at: string | null;
  action_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DbNotificationPreferences {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  toast_enabled: boolean;
  push_enabled: boolean;
  type_toggles: Record<string, boolean>;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface DbPushSubscription {
  id: string;
  user_id: string;
  platform: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}
