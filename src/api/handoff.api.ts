import axios from 'axios';
import { api } from './client';
import type { AuthTokenResponse } from './auth.api';

export interface AdminHandoffResponse {
  code: string;
  expiresInSeconds: number;
}

/** A single-use code (60s) that signs this admin in to the other admin panel. */
export async function issueAdminHandoff(): Promise<AdminHandoffResponse> {
  const { data } = await api.post<AdminHandoffResponse>('/auth/handoff');
  return data;
}

/**
 * Bare axios on purpose: the shared client signs out on any 401, and an
 * expired code must not sign out an admin who is already signed in here.
 */
export async function redeemAdminHandoff(
  code: string,
): Promise<AuthTokenResponse> {
  const { data } = await axios.post<AuthTokenResponse>(
    `${api.defaults.baseURL}/auth/handoff/redeem`,
    { code },
    { timeout: 30_000 },
  );
  return data;
}
