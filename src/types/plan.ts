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
  /**
   * The Stripe recurring Price this plan is sold as, or null when it is not
   * on sale (free plans, or a cadence Stripe cannot bill). The backend fills
   * it in when the plan is saved; setting it here adopts a price that already
   * exists in Stripe instead.
   */
  stripePriceId: string | null;
  /**
   * Free days inside the Stripe subscription before the first charge, or null.
   * Distinct from `trialDays`, which is the card-free sign-up grant — setting
   * both on one plan hands the same person two trials.
   */
  stripeTrialDays: number | null;
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
  /** Omit to let the backend create the Stripe price for this plan. */
  stripePriceId?: string | null;
  stripeTrialDays?: number | null;
  features: ExtFeatureMap;
}

export type UpdateExtPlanPayload = Partial<
  Omit<CreateExtPlanPayload, 'code'>
>;
