/**
 * Promotion codes live in Stripe — created there, redeemed there. The admin
 * panel only shows what is currently on offer, so everything here is read-only.
 */
export interface StripePromoCode {
  id: string;
  code: string;
  couponName: string | null;
  percentOff: number | null;
  /** In the currency's minor unit (cents / tiyin), as Stripe reports it. */
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  firstTimeTransactionOnly: boolean;
  active: boolean;
  createdAt: string;
}

export interface StripePromoCodes {
  items: StripePromoCode[];
  /** False when the backend has no Stripe key — empty for lack of a connection. */
  configured: boolean;
}
