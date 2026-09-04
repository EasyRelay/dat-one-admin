/**
 * Reads the email out of the admin token, purely to label the UI.
 *
 * The signature is NOT checked and must not be trusted for anything — every
 * real decision is the backend's. This exists so the header can say who is
 * signed in without adding an endpoint for it.
 */
export function emailFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const json: unknown = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    if (json && typeof json === 'object' && 'email' in json) {
      const { email } = json as { email?: unknown };
      return typeof email === 'string' ? email : null;
    }
    return null;
  } catch {
    return null;
  }
}
