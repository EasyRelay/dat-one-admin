import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { ApiErrorBody } from '../types/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://one.easyrelay.us/api',
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export function extractApiError(err: unknown): string {
  const axiosErr = err as AxiosError<ApiErrorBody>;
  const msg = axiosErr?.response?.data?.message;
  if (!msg) return 'An unexpected error occurred.';
  if (Array.isArray(msg)) return msg.join('; ');
  return msg;
}
