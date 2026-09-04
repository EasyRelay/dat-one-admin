import { api } from './client';

export interface AuthTokenResponse {
  accessToken: string;
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthTokenResponse> {
  const { data } = await api.post<AuthTokenResponse>('/auth/login', {
    email: payload.email.trim(),
    password: payload.password,
  });
  return data;
}
