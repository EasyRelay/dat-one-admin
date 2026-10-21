import { api } from './client';
import type { ExtOnline } from '../types/online';

export async function getOnlineUsers(): Promise<ExtOnline> {
  const { data } = await api.get<ExtOnline>('/ext-admin/online');
  return data;
}
