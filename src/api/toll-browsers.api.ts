import { api } from './client';
import type { TollBrowsers } from '../types/toll-browser';

export async function listTollBrowsers(): Promise<TollBrowsers> {
  const { data } = await api.get<TollBrowsers>('/ext-admin/toll-browsers');
  return data;
}
