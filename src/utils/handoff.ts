import { HANDOFF_PATH } from '../config/admin-panels';

/**
 * The code travels in the fragment, never the query string: a fragment is not
 * sent to the server hosting the panel, so it stays out of access logs and
 * Referer headers. The panel strips it from the address bar on arrival.
 */
export function buildHandoffUrl(panelUrl: string, code: string): string {
  const params = new URLSearchParams({ code });
  return `${panelUrl.replace(/\/+$/, '')}${HANDOFF_PATH}#${params.toString()}`;
}

export function readHandoffCode(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get('code');
}
