/**
 * The other admin panel on the same backend (VPN DAT admin). Both take the same
 * admin token, so the header offers a one-click switch that opens it already
 * signed in (see `SwitchAdminPanelButton`).
 *
 * Code constants, not env vars: the front's environment is not ours to set.
 * Which one is used follows the existing `VITE_API_BASE_URL`: a local backend
 * means the local panel, a real (or missing) one means the real domain.
 * An empty URL hides the switch.
 */
const OTHER_ADMIN_PANEL_DEV_URL = 'http://localhost:5180';
// Our own Netlify copy; dat.easyrelay.us (Cloudflare) serves the same build.
const OTHER_ADMIN_PANEL_PROD_URL = 'https://admin.vpndat.com';

/** Same rule the API client follows: no VITE_API_BASE_URL means production. */
function usesLocalBackend(): boolean {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (typeof apiBase !== 'string' || !apiBase) return false;
  try {
    const host = new URL(apiBase).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}

export const OTHER_ADMIN_PANEL = {
  name: 'VPN DAT admin',
  url: usesLocalBackend()
    ? OTHER_ADMIN_PANEL_DEV_URL
    : OTHER_ADMIN_PANEL_PROD_URL,
};

/** Path of this panel that redeems a hand-off code (the other panel uses the same one). */
export const HANDOFF_PATH = '/handoff';
