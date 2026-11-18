import {
  AppstoreOutlined,
  DashboardOutlined,
  ReloadOutlined,
  RobotOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { App, Button, Segmented, Space, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiError } from '../api/client';
import { listTollBrowsers } from '../api/toll-browsers.api';
import { getTollSiteOnline } from '../api/toll-site-online.api';
import { PageHeader } from '../components/PageHeader';
import { useVisiblePoll } from '../hooks/useVisiblePoll';
import type { TollBrowsers } from '../types/toll-browser';
import type { TollSiteOnline, TollSiteOnlineWindow } from '../types/toll-site-online';
import { TollCards } from './tollguru/TollCards';
import { TollMonitor } from './tollguru/TollMonitor';
import { TollOverview } from './tollguru/TollOverview';
import { sortByUrgency } from './tollguru/tollFormat';

const POLL_MS = 15_000;
// The countdowns move between polls; a minute is their smallest unit.
const TICK_MS = 30_000;

type View = 'overview' | 'cards' | 'monitor';
const VIEW_KEY = 'dat-one-admin:tollguru-view';
const ONLINE_WINDOW_KEY = 'dat-one-admin:tolls-site-online-window';
const VIEWS: View[] = ['overview', 'cards', 'monitor'];
const ONLINE_WINDOWS: TollSiteOnlineWindow[] = [1, 5, 10];

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

function readOnlineWindow(): TollSiteOnlineWindow {
  try {
    const saved = Number(localStorage.getItem(ONLINE_WINDOW_KEY));
    if (ONLINE_WINDOWS.includes(saved as TollSiteOnlineWindow)) {
      return saved as TollSiteOnlineWindow;
    }
  } catch {
    // ignore
  }
  return 5;
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
  const navigate = useNavigate();
  const [data, setData] = useState<TollBrowsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>(readView);
  const [onlineWindow, setOnlineWindow] = useState<TollSiteOnlineWindow>(readOnlineWindow);
  const [siteOnline, setSiteOnline] = useState<TollSiteOnline | null>(null);
  // Server clock minus ours, so countdowns do not inherit a wrong local clock.
  const [skewMs, setSkewMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [next, online] = await Promise.all([
        listTollBrowsers(),
        getTollSiteOnline(onlineWindow),
      ]);
      setData(next);
      setSiteOnline(online);
      setSkewMs(new Date(next.now).getTime() - Date.now());
      setNowMs(Date.now());
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [message, onlineWindow]);

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

  function changeOnlineWindow(next: TollSiteOnlineWindow) {
    setOnlineWindow(next);
    try {
      localStorage.setItem(ONLINE_WINDOW_KEY, String(next));
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
            <Button icon={<RobotOutlined />} onClick={() => navigate('/toll-bot')}>
              Toll bot
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              Refresh
            </Button>
          </Space>
        }
      />

      <div className="panel-card" style={{ marginBottom: 16 }}>
        <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Typography.Text type="secondary">Easy DAT /tolls online</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
              {siteOnline ? siteOnline.online : '—'}
              <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 14, fontWeight: 500 }}>
                users with a calc in the last {onlineWindow} min
              </Typography.Text>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Same account submitting again only refreshes last seen — not counted twice.
            </Typography.Text>
          </div>
          <Segmented<TollSiteOnlineWindow>
            value={onlineWindow}
            onChange={changeOnlineWindow}
            options={[
              { value: 1, label: '1 min' },
              { value: 5, label: '5 min' },
              { value: 10, label: '10 min' },
            ]}
          />
        </Space>
      </div>

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
