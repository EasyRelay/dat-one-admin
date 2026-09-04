import { api } from './client';
import type { ExtDashboard } from '../types/dashboard';

export async function getDashboard(): Promise<ExtDashboard> {
  const { data } = await api.get<ExtDashboard>('/ext-admin/dashboard');
  return data;
}
