import type { ExtFeatureMap } from './features';
import type { ExtPayment } from './payment';

export interface ExtUser {
  id: string;
  email: string;
  name: string | null;
  createdVia: string;
  plan: string | null;
  planExpiresAt: string | null;
  isActive: boolean;
  removed: boolean;
  hidden: boolean;
  relayEnabled: boolean;
  note: string | null;
  /** Per-account tri-state: true = forced on, false = forced off, absent = plan decides. */
  featureOverrides: Partial<ExtFeatureMap> | null;
  /** What the account actually resolves to, plan + overrides applied. */
  features: ExtFeatureMap;
  canUseCredit: boolean;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  /** Filled by the list endpoint only. */
  latestPayment: ExtPayment | null;
  /**
   * Installs (computers) of this account with a one.dat.com tab open right
   * now; 0 = DAT closed everywhere. Live — the list re-reads it on a timer.
   */
  datOpenDevices: number;
  /**
   * Installs of the account and how many Chrome reported uninstalled. null =
   * no install row yet, or an older backend (absent).
   */
  installs?: ExtInstallSummary | null;
}

export interface ExtInstallSummary {
  installs: number;
  uninstalled: number;
  lastUninstalledAt: string | null;
}

export interface PaginatedExtUsers {
  items: ExtUser[];
  total: number;
}

/**
 * No `plan` / `planExpiresAt`. A plan is granted by creating a payment and
 * removed with `revokePlan`, so there is exactly one place it can change.
 */
export interface UpdateExtUserPayload {
  name?: string | null;
  note?: string | null;
  isActive?: boolean;
  removed?: boolean;
  hidden?: boolean;
  relayEnabled?: boolean;
  featureOverrides?: Partial<ExtFeatureMap> | null;
}
