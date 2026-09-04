import { api } from './client';
import type {
  CreateExtNotificationPayload,
  ExtAdminNotification,
  PaginatedExtNotifications,
} from '../types/notification';

export interface ListNotificationsParams {
  skip?: number;
  limit?: number;
  userId?: string;
}

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<PaginatedExtNotifications> {
  const { data } = await api.get<PaginatedExtNotifications>(
    '/ext-admin/notifications',
    { params },
  );
  return data;
}

export async function createNotification(
  payload: CreateExtNotificationPayload,
): Promise<ExtAdminNotification> {
  const { data } = await api.post<ExtAdminNotification>(
    '/ext-admin/notifications',
    payload,
  );
  return data;
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/ext-admin/notifications/${id}`);
}
