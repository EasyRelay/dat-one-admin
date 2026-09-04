import type { ExtFeatureMap } from './features';

export type Currency = 'USD' | 'UZS';

export interface ExtPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  defaultDurationDays: number;
  isActive: boolean;
  /**
   * Free days every new account gets on this plan, or null. At most one plan
   * carries it — setting it here clears it everywhere else.
   */
  trialDays: number | null;
  features: ExtFeatureMap;
  createdAt: string;
  updatedAt: string;
}

export interface ExtPlansList {
  items: ExtPlan[];
  /**
   * What an account with NO plan gets today. A plan that grants less than this
   * would downgrade a paying customer, so the UI warns about it.
   */
  freeFeatures: ExtFeatureMap;
}

export interface CreateExtPlanPayload {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: Currency;
  defaultDurationDays: number;
  isActive?: boolean;
  trialDays?: number | null;
  features: ExtFeatureMap;
}

export type UpdateExtPlanPayload = Partial<
  Omit<CreateExtPlanPayload, 'code'>
>;
