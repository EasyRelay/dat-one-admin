/** Mirrors the backend's TollBrowserStatus enum (wire values). */
export type TollBrowserStatus = 'ready' | 'busy' | 'signed_out' | 'session_expiring';

/** Mirrors TollDeviceErrorCode — what the fetcher reports on a failed request. */
export type TollDeviceErrorCode =
  | 'LOGGED_OUT'
  | 'UNAUTHORIZED'
  | 'REFRESH_FAILED'
  | 'UPSTREAM'
  | 'TIMEOUT'
  | 'NO_TAB'
  | 'INVALID_BODY';

export interface TollBrowserError {
  code: TollDeviceErrorCode;
  message: string;
  at: string;
}

/** One connected TollGuru fetcher browser, live. */
export interface TollBrowser {
  /** Socket id — new on every reconnect. */
  browserId: string;
  /** Operator-typed name; null on fetcher builds before 0.4.0. */
  name: string | null;
  /** TollGuru account signed in there; kept while signed out. */
  account: string | null;
  /** Operator-typed note from the fetcher popup. */
  note: string | null;
  version: string;
  status: TollBrowserStatus;
  loggedIn: boolean;
  busy: boolean;
  late: boolean;
  sessionExpiresAt: string | null;
  connectedAt: string;
  okToday: number;
  errorsToday: number;
  lastSuccessAt: string | null;
  lastError: TollBrowserError | null;
}

export interface TollBrowsers {
  items: TollBrowser[];
  connected: number;
  /** Connected and signed in. */
  usable: number;
  /** Server time — countdowns are measured against it, not the local clock. */
  now: string;
}
