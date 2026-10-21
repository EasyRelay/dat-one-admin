/**
 * Mirrors the backend's EXT_ONLINE_WINDOW_SECONDS: the extension pings every
 * 2 minutes while a DAT tab is open, and an account counts as online for 5
 * minutes after its last ping.
 */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isOnline(lastSeenAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const time = new Date(lastSeenAt).getTime();
  return !Number.isNaN(time) && now - time <= ONLINE_WINDOW_MS;
}

/** "just now", "3 min ago". */
export function seenAgo(lastSeenAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(lastSeenAt).getTime()) / 60_000));
  return minutes < 1 ? 'just now' : `${minutes} min ago`;
}
