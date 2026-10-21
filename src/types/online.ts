/** One extension account online right now (`GET /ext-admin/online`). */
export interface ExtOnlineUser {
  id: string;
  email: string;
  name: string | null;
  lastSeenAt: string;
}

export interface ExtOnline {
  count: number;
  /** An account counts as online this long after its last ping. */
  windowSeconds: number;
  /** Newest first, capped server-side. */
  items: ExtOnlineUser[];
}
