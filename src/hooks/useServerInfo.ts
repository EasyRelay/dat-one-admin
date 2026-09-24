import { useEffect, useState } from "react";
import { getServerInfo, type ExtServerInfo } from "../api/server-info.api";

/**
 * What the server allows, read once per mount.
 *
 * Defaults to the RESTRICTIVE answer while loading and on failure: assuming
 * production keeps a destructive button hidden when we do not yet know, which
 * is the safe way to be wrong.
 */
export function useServerInfo(): ExtServerInfo {
  const [info, setInfo] = useState<ExtServerInfo>({
    devMode: false,
    stripeConfigured: false,
  });

  useEffect(() => {
    let cancelled = false;
    void getServerInfo()
      .then((next) => {
        if (!cancelled) setInfo(next);
      })
      .catch(() => {
        // Keep the restrictive default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}
