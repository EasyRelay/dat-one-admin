export interface ExtCampaign {
  id: string;
  name: string;
  slug: string;
  destinationUrl: string;
  enabled: boolean;
  clickCount: number;
  uniqueClickCount: number;
  lastClickAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExtCampaignList {
  items: ExtCampaign[];
}

export interface CreateExtCampaignPayload {
  name: string;
  destinationUrl?: string;
  enabled?: boolean;
}

export interface UpdateExtCampaignPayload {
  name?: string;
  destinationUrl?: string;
  enabled?: boolean;
}
