import type { Currency } from './plan';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/** Why the account was given a plan. A trial is a zero-amount row. */
export type GrantKind = 'sale' | 'trial';

export interface ExtPayment {
  id: string;
  userId: string;
  userEmail: string | null;
  amount: number;
  currency: Currency;
  plan: string;
  status: PaymentStatus;
  note: string | null;
  kind: GrantKind;
  appliedPlanExpiresAt: string | null;
  /**
   * When this payment last became paid. The account holds whichever paid
   * payment applied most recently, so this is what decides the current plan.
   */
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedExtPayments {
  items: ExtPayment[];
  total: number;
}

/**
 * Send `durationDays` for a normal sale or renewal — the backend adds it to
 * whatever time the account has left on the same plan, so renewing early does
 * not burn the remainder. `expiresAt` is the escape hatch for setting an exact
 * date; exactly one of the two is required.
 */
export interface CreateExtPaymentPayload {
  userId?: string;
  email?: string;
  amount: number;
  currency?: Currency;
  plan: string;
  durationDays?: number;
  expiresAt?: string;
  status?: PaymentStatus;
  note?: string;
}
