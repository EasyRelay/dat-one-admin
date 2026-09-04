export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

/** How much life a plan has left, as one word the UI can colour by. */
export type PlanStatus = 'never' | 'expired' | 'soon' | 'ok';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function planStatus(expiresAt: string | null): PlanStatus {
  if (!expiresAt) return 'never';
  const left = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(left)) return 'never';
  if (left < 0) return 'expired';
  if (left < WEEK_MS) return 'soon';
  return 'ok';
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'UZS' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
