import { useEffect, useRef } from 'react';

/**
 * Runs `load` on mount and every `intervalMs` — but only while the tab is
 * actually being looked at.
 *
 * An admin panel left open in a background tab used to keep asking the server
 * for the same rows all night. Nobody reads an answer to a question asked at
 * 3am into a hidden tab, and every one of those requests still costs a
 * database round trip.
 *
 * Coming back to the tab refreshes immediately rather than waiting out the
 * remainder of an interval, so what is on screen is never older than the
 * moment it was looked at. That is also why the timer is restarted rather than
 * resumed: the point of the interval is "how stale may this get", and it
 * should be measured from the last real read.
 */
export function useVisiblePoll(
  load: () => void | Promise<void>,
  intervalMs: number,
): void {
  // Kept in a ref so a caller that rebuilds `load` on every render does not
  // restart the timer — the effect depends on the interval alone.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let timer = 0;

    const run = (): void => {
      void loadRef.current();
    };

    const start = (): void => {
      if (timer) return;
      timer = window.setInterval(run, intervalMs);
    };

    const stop = (): void => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        run();
        start();
      } else {
        stop();
      }
    };

    // A tab restored from the back/forward cache is visible but never fires
    // `visibilitychange`, so the first read happens here.
    if (document.visibilityState === 'visible') {
      run();
      start();
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [intervalMs]);
}
