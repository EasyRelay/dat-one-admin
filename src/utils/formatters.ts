export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

/**
 * Date without the time, for list cells.
 *
 * A plan expiry to the second is noise in a table — and long enough to wrap
 * the cell onto a second line, which is what made the rows tall. The drawer
 * still shows the full timestamp for anyone who needs it.
 */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

/**
 * Whole days from now until `value`, or null when there is no date.
 *
 * Rounded up, so the last partial day still counts as one — the plan does
 * work that day, and "0 days left" for an account that is still running reads
 * as a fault.
 */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.ceil((time - Date.now()) / 86_400_000);
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
