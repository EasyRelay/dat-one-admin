import { useEffect, useState } from 'react';

/**
 * Holds a value back until it stops changing.
 *
 * The list pages fired one request per keystroke, and since nothing cancelled
 * the older ones, a slow early response could land after a fast later one and
 * repaint the table with results for a query the admin had already replaced.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
