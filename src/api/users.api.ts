import { api } from './client';
import type {
  ExtUser,
  PaginatedExtUsers,
  UpdateExtUserPayload,
} from '../types/user';

export interface ListUsersParams {
  skip?: number;
  limit?: number;
  search?: string;
  plan?: string;
  isActive?: boolean;
  removed?: boolean;
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
