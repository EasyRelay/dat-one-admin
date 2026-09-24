import { api } from './client';
import type {
  ExtUser,
  PaginatedExtUsers,
  UpdateExtUserPayload,
} from '../types/user';

/** Fields the backend will order by; anything else falls back to newest first. */
export type UserSortField =
  | 'planExpiresAt'
  | 'lastSeenAt'
  | 'createdAt'
  | 'email';

export interface ListUsersParams {
  skip?: number;
  limit?: number;
  search?: string;
  plan?: string;
  isActive?: boolean;
  removed?: boolean;
  /** Sorting is server-side: the list is paged, so the page alone cannot be it. */
  sortBy?: UserSortField;
  sortOrder?: 'asc' | 'desc';
}

export async function listUsers(
  params: ListUsersParams = {},
): Promise<PaginatedExtUsers> {
  const { data } = await api.get<PaginatedExtUsers>('/ext-admin/users', {
    params,
  });
  return data;
}

export async function getUser(id: string): Promise<ExtUser> {
  const { data } = await api.get<ExtUser>(`/ext-admin/users/${id}`);
  return data;
}

export async function updateUser(
  id: string,
  payload: UpdateExtUserPayload,
): Promise<ExtUser> {
  const { data } = await api.patch<ExtUser>(`/ext-admin/users/${id}`, payload);
  return data;
}

/**
 * Clears the account's plan. The other direction — granting one — is a
 * payment, so that the ledger always explains what an account holds.
 */
export async function revokePlan(id: string): Promise<ExtUser> {
  const { data } = await api.delete<ExtUser>(`/ext-admin/users/${id}/plan`);
  return data;
}

export async function logoutUserEverywhere(id: string): Promise<void> {
  await api.post(`/ext-admin/users/${id}/logout-everywhere`);
}

export interface PurgeResult {
  email: string;
  payments: number;
  devices: number;
  notifications: number;
}

/**
 * Erases an account and its payments, devices and notices for good.
 *
 * The backend refuses this unless the account is archived, so the UI never has
 * to be the only thing standing between a mis-click and a lost customer.
 */
export async function purgeUser(id: string): Promise<PurgeResult> {
  const { data } = await api.delete<PurgeResult>(`/ext-admin/users/${id}`);
  return data;
}
