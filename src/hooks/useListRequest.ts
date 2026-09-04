import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { extractApiError } from '../api/client';

interface Paginated<T> {
  items: T[];
  total: number;
}

/**
 * The shared shape of every table page: fetch, show a spinner, keep the last
 * good rows on error, and ignore a response that a newer request has already
 * superseded.
 *
 * That last part is why this exists rather than each page repeating its own
 * `useCallback` + `useEffect` pair: with a debounced search box there are
 * regularly two requests in flight, and without a sequence check they land in
 * whatever order the network chooses — an older result could overwrite a newer
 * one and leave the table showing rows for a query already replaced.
 *
 * `fetcher` must be memoised by the caller (a `useCallback` over its filter
 * state); that memo is what decides when a refetch happens.
 */
export function useListRequest<T>(fetcher: () => Promise<Paginated<T>>) {
  const { message } = App.useApp();
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);

  const reload = useCallback(async () => {
    const ticket = ++sequence.current;
    setLoading(true);
    try {
      const res = await fetcher();
      if (ticket !== sequence.current) return;
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (ticket !== sequence.current) return;
      void message.error(extractApiError(err));
    } finally {
      if (ticket === sequence.current) setLoading(false);
    }
  }, [fetcher, message]);

  useEffect(() => {
    // The spinner flips synchronously here, which the React Compiler lint flags
    // as a cascading render. Every list screen in this app has always loaded
    // this way; keeping the suppression in this one hook is what stopped it
    // being repeated on each page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { items, total, loading, reload, setItems };
}
