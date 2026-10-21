import {
  AppstoreOutlined,
  DashboardOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { App, Button, Segmented, Space, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractApiError } from '../api/client';
import { listTollBrowsers } from '../api/toll-browsers.api';
import { PageHeader } from '../components/PageHeader';
import { useVisiblePoll } from '../hooks/useVisiblePoll';
import type { TollBrowsers } from '../types/toll-browser';
import { TollCards } from './tollguru/TollCards';
import { TollMonitor } from './tollguru/TollMonitor';
import { TollOverview } from './tollguru/TollOverview';
import { sortByUrgency } from './tollguru/tollFormat';

const POLL_MS = 15_000;
// The countdowns move between polls; a minute is their smallest unit.
const TICK_MS = 30_000;

type View = 'overview' | 'cards' | 'monitor';
const VIEW_KEY = 'dat-one-admin:tollguru-view';
const VIEWS: View[] = ['overview', 'cards', 'monitor'];

function readView(): View {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    const found = VIEWS.find((view) => view === saved);
    if (found) return found;
  } catch {
    // ignore
  }
  return 'monitor';
}

/**
 * The TollGuru fetcher browsers — every machine signed in to a TollGuru
 * account that answers the Easy DAT toll calculator. Live socket state from
 * the backend's memory: a browser that is not connected is not listed, and
 * today's counts start over when the server restarts.
 *
 * Three looks over the same data, picked top-right and remembered:
 * Monitor (default — dense list for many browsers), Overview (problems
 * first + full table) and Cards (one per browser).
 */
export function TollBrowsersPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<TollBrowsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>(readView);
  // Server clock minus ours, so countdowns do not inherit a wrong local clock.
  const [skewMs, setSkewMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const next = await listTollBrowsers();
      setData(next);
      setSkewMs(new Date(next.now).getTime() - Date.now());
      setNowMs(Date.now());
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useVisiblePoll(load, POLL_MS);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  }

  const serverNow = nowMs + skewMs;
  const items = useMemo(() => sortByUrgency(data?.items ?? []), [data]);

  return (
    <div>
      <PageHeader
        title="TollGuru"
        subtitle="Browsers signed in to TollGuru that answer the toll calculator — live, refreshed every 15s"
        extra={
          <Space wrap>
            <Segmented<View>
              value={view}
              onChange={changeView}
              options={[
                { value: 'overview', label: 'Overview', icon: <DashboardOutlined /> },
                { value: 'cards', label: 'Cards', icon: <AppstoreOutlined /> },
                { value: 'monitor', label: 'Monitor', icon: <UnorderedListOutlined /> },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              Refresh
            </Button>
          </Space>
        }
      />

      {!data ? (
        <div className="panel-card tg-empty">{loading ? <Spin /> : 'Could not load the browsers'}</div>
      ) : view === 'cards' ? (
        <TollCards items={items} serverNow={serverNow} />
      ) : view === 'monitor' ? (
        <TollMonitor data={data} items={items} serverNow={serverNow} />
      ) : (
        <TollOverview data={data} items={items} serverNow={serverNow} />
      )}
    </div>
  );
}
