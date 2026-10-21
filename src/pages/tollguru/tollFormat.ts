import type { TollBrowser, TollBrowserStatus } from '../../types/toll-browser';

export const STATUS_META: Record<
  TollBrowserStatus,
  { label: string; tag: string; order: number }
> = {
  signed_out: { label: 'Signed out', tag: 'red', order: 0 },
  session_expiring: { label: 'Session expiring', tag: 'orange', order: 1 },
  busy: { label: 'Busy', tag: 'blue', order: 2 },
  ready: { label: 'Ready', tag: 'green', order: 3 },
};

/** Problems first, then busy, then ready; oldest connection first inside a group. */
export function sortByUrgency(items: TollBrowser[]): TollBrowser[] {
  return [...items].sort(
    (a, b) =>
      STATUS_META[a.status].order - STATUS_META[b.status].order ||
      a.connectedAt.localeCompare(b.connectedAt),
  );
}

export function needsAttention(row: TollBrowser): boolean {
  return row.status === 'signed_out' || row.status === 'session_expiring';
}

/** "1d 4h", "3h 12m", "8m", "expired". */
export function formatLeft(ms: number): string {
  if (ms <= 0) return 'expired';
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Time left on the TollGuru session, or null when signed out / unknown. */
export function sessionLeft(row: TollBrowser, serverNow: number): string | null {
  if (!row.loggedIn || !row.sessionExpiresAt) return null;
  return formatLeft(new Date(row.sessionExpiresAt).getTime() - serverNow);
}

/** "12:46" — for times within the day. */
export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** "19 min ago", "3h ago". */
export function ago(iso: string, serverNow: number): string {
  const minutes = Math.max(0, Math.round((serverNow - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function displayName(row: TollBrowser): string {
  return row.name || `Unnamed · ${row.browserId.slice(0, 8)}`;
}
