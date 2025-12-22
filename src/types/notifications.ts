export interface Notification {
  id: string;
  source: string;
  title: string;
  content?: string;
  read: boolean;
  actionType?: string;
  actionData?: Record<string, unknown>;
  createdAt: Date;
}
