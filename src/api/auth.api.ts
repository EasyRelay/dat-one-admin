import { api } from './client';

export interface AuthTokenResponse {
  accessToken: string;
}

export interface AdminLoginResponse {
  totpRequired?: boolean;
  totpSetupRequired?: boolean;
  challengeToken?: string;
  qrDataUrl?: string;
  manualKey?: string;
}

export interface AdminTotpConfirmResponse {
  accessToken: string;
  backupCodes?: string[];
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AdminLoginResponse> {
  const { data } = await api.post<AdminLoginResponse>('/auth/login', {
    email: payload.email.trim(),
    password: payload.password,
  });
  return data;
}

export async function confirmAdminTotp(payload: {
  challengeToken: string;
  code: string;
}): Promise<AdminTotpConfirmResponse> {
  const { data } = await api.post<AdminTotpConfirmResponse>(
    '/auth/login/totp',
    payload,
  );
  return data;
}
