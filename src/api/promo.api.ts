import { api } from './client';
import type { StripePromoCodes } from '../types/promo';

export async function listPromoCodes(): Promise<StripePromoCodes> {
  const { data } = await api.get<StripePromoCodes>('/ext-admin/promo-codes');
  return data;
}
