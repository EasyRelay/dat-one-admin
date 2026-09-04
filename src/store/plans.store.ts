import { create } from 'zustand';
import * as plansApi from '../api/plans.api';
import { extractApiError } from '../api/client';
import { defaultFeatures, type ExtFeatureMap } from '../types/features';
import type {
  CreateExtPlanPayload,
  ExtPlan,
  UpdateExtPlanPayload,
} from '../types/plan';

interface PlansState {
  plans: ExtPlan[];
  /** What an account with no plan resolves to — the baseline every plan is judged against. */
  freeFeatures: ExtFeatureMap;
  loading: boolean;
  loaded: boolean;
  hydrate: () => Promise<void>;
  createPlan: (payload: CreateExtPlanPayload) => Promise<ExtPlan>;
  updatePlan: (id: string, payload: UpdateExtPlanPayload) => Promise<ExtPlan>;
  deletePlan: (id: string) => Promise<void>;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  freeFeatures: defaultFeatures(true),
  loading: false,
  loaded: false,

  async hydrate() {
    set({ loading: true });
    try {
      const res = await plansApi.listPlans();
      // A backend older than this build still answers with a bare array. Read
      // it rather than white-screening every page that maps over `plans`.
      set({
        plans: Array.isArray(res) ? res : (res.items ?? []),
        freeFeatures: Array.isArray(res)
          ? defaultFeatures(true)
          : (res.freeFeatures ?? defaultFeatures(true)),
        loaded: true,
      });
    } catch {
      // Backend may be offline during local admin boot — leave prior plans.
    } finally {
      set({ loading: false });
    }
  },

  async createPlan(payload) {
    try {
      const plan = await plansApi.createPlan(payload);
      set({ plans: [...get().plans, plan] });
      return plan;
    } catch (err) {
      throw new Error(extractApiError(err), { cause: err });
    }
  },

  async updatePlan(id, payload) {
    try {
      const plan = await plansApi.updatePlan(id, payload);
      set({
        plans: get().plans.map((row) => (row.id === id ? plan : row)),
      });
      return plan;
    } catch (err) {
      throw new Error(extractApiError(err), { cause: err });
    }
  },

  async deletePlan(id) {
    try {
      await plansApi.deletePlan(id);
      set({ plans: get().plans.filter((row) => row.id !== id) });
    } catch (err) {
      throw new Error(extractApiError(err), { cause: err });
    }
  },
}));
