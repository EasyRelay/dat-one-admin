import { api } from './client';
import type { TollSiteOnline, TollSiteOnlineWindow } from '../types/toll-site-online';

export async function getTollSiteOnline(
  windowMinutes: TollSiteOnlineWindow = 5,
): Promise<TollSiteOnline> {
  const { data } = await api.get<TollSiteOnline>('/ext-admin/tolls/site-online', {
    params: { windowMinutes },
  });
  return data;
}
