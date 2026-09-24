import { api } from './client';
import type {
  CreateExtPlanPayload,
  ExtPlan,
  ExtPlansList,
  UpdateExtPlanPayload,
} from '../types/plan';

export async function listPlans(): Promise<ExtPlansList> {
  const { data } = await api.get<ExtPlansList>('/ext-admin/plans');
  return data;
}

export async function createPlan(
  payload: CreateExtPlanPayload,
): Promise<ExtPlan> {
  const { data } = await api.post<ExtPlan>('/ext-admin/plans', payload);
  return data;
}

export async function updatePlan(
  id: string,
  payload: UpdateExtPlanPayload,
): Promise<ExtPlan> {
  const { data } = await api.patch<ExtPlan>(`/ext-admin/plans/${id}`, payload);
  return data;
}

export async function deletePlan(id: string): Promise<void> {
  await api.delete(`/ext-admin/plans/${id}`);
}

export interface PlanSyncResult {
  created: number;
  updated: number;
  deactivated: number;
}

/** Imports the Stripe catalogue: Stripe owns the money, we own the features. */
export async function syncPlansFromStripe(): Promise<PlanSyncResult> {
  const { data } = await api.post<PlanSyncResult>(
    '/ext-admin/plans/sync-from-stripe',
  );
  return data;
}
