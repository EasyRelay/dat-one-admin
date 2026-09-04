export type NotificationLevel = 'info' | 'warning' | 'success';

/** A notice as the admin panel sees it: who it went to, how many opened it. */
export interface ExtAdminNotification {
  id: string;
  title: string;
  body: string;
  level: NotificationLevel;
  /** Null means it went to every extension account. */
  userId: string | null;
  userEmail: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  readCount: number;
  createdAt: string;
}

export interface PaginatedExtNotifications {
  items: ExtAdminNotification[];
  total: number;
}

export interface CreateExtNotificationPayload {
  title: string;
  body: string;
  level?: NotificationLevel;
  /** Omit or null to send to everyone. */
  userId?: string | null;
  expiresAt?: string | null;
}
