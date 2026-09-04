import { api } from './client';
import type {
  CreateExtPaymentPayload,
  ExtPayment,
  PaginatedExtPayments,
  PaymentStatus,
} from '../types/payment';

export interface ListPaymentsParams {
  skip?: number;
  limit?: number;
  status?: PaymentStatus;
  plan?: string;
  userId?: string;
  email?: string;
}

export async function listPayments(
  params: ListPaymentsParams = {},
): Promise<PaginatedExtPayments> {
  const { data } = await api.get<PaginatedExtPayments>('/ext-admin/payments', {
    params,
  });
  return data;
}

export async function createPayment(
  payload: CreateExtPaymentPayload,
): Promise<ExtPayment> {
  const { data } = await api.post<ExtPayment>('/ext-admin/payments', payload);
  return data;
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
): Promise<ExtPayment> {
  const { data } = await api.patch<ExtPayment>(
    `/ext-admin/payments/${id}/status`,
    { status },
  );
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  await api.delete(`/ext-admin/payments/${id}`);
}
