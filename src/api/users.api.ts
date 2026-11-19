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
  hidden?: boolean;
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

/** Today's toll calculations: distinct lanes counted against the daily limit. */
export interface TollUsage {
  /** Usage day (Asia/Tashkent), YYYY-MM-DD. */
  day: string;
  used: number;
  limit: number;
  /** "DALLAS, TX → ATLANTA, GA" */
  lanes: string[];
}

export async function getUserTollUsage(id: string): Promise<TollUsage> {
  const { data } = await api.get<TollUsage>(`/ext-admin/users/${id}/tolls`);
  return data;
}

/** Clears today's toll count (and the per-minute one); returns the fresh usage. */
export async function resetUserTollUsage(id: string): Promise<TollUsage> {
  const { data } = await api.delete<TollUsage>(`/ext-admin/users/${id}/tolls`);
  return data;
}

/** Hidden-load reveals in the current 12-hour window (US Eastern 00:00 / 12:00). */
export interface RevealUsage {
  /** "2026-11-19:pm" */
  window: string;
  used: number;
  limit: number;
  /** When the window ends (ISO). */
  resetsAt: string;
  /** Posting ids revealed in this window. */
  postings: string[];
}

export async function getUserRevealUsage(id: string): Promise<RevealUsage> {
  const { data } = await api.get<RevealUsage>(`/ext-admin/users/${id}/reveals`);
  return data;
}

/** Clears this window's reveal count; returns the fresh usage. */
export async function resetUserRevealUsage(id: string): Promise<RevealUsage> {
  const { data } = await api.delete<RevealUsage>(`/ext-admin/users/${id}/reveals`);
  return data;
}

/** The hidden-load reveal for everyone (accounts keep their own switch). */
export interface RevealSwitchState {
  enabled: boolean;
  /** Accounts with their own reveal switch on. */
  allowedAccounts: number;
}

export async function getRevealSwitch(): Promise<RevealSwitchState> {
  const { data } = await api.get<RevealSwitchState>('/ext-admin/reveal');
  return data;
}

export async function setRevealSwitch(enabled: boolean): Promise<RevealSwitchState> {
  const { data } = await api.put<RevealSwitchState>('/ext-admin/reveal', { enabled });
  return data;
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
