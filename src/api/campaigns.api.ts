import { api } from './client';
import type {
  CreateExtCampaignPayload,
  ExtCampaign,
  ExtCampaignList,
  UpdateExtCampaignPayload,
} from '../types/campaign';

const CAMPAIGN_ORIGIN = 'https://easydat.us';

export function campaignPublicUrl(slug: string): string {
  return `${CAMPAIGN_ORIGIN}/go/${slug}`;
}

export async function listCampaigns(): Promise<ExtCampaign[]> {
  const { data } = await api.get<ExtCampaignList>('/ext-admin/campaigns');
  return data.items;
}

export async function createCampaign(
  payload: CreateExtCampaignPayload,
): Promise<ExtCampaign> {
  const { data } = await api.post<ExtCampaign>('/ext-admin/campaigns', payload);
  return data;
}

export async function updateCampaign(
  id: string,
  payload: UpdateExtCampaignPayload,
): Promise<ExtCampaign> {
  const { data } = await api.patch<ExtCampaign>(
    `/ext-admin/campaigns/${id}`,
    payload,
  );
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  await api.delete(`/ext-admin/campaigns/${id}`);
}
