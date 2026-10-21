import {
  ApiOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { App, Button, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { extractApiError } from '../api/client';
import { listTollBrowsers } from '../api/toll-browsers.api';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { useVisiblePoll } from '../hooks/useVisiblePoll';
import type {
  TollBrowser,
  TollBrowsers,
  TollBrowserStatus,
} from '../types/toll-browser';
import { formatDayTime } from '../utils/formatters';

const POLL_MS = 15_000;
// The countdowns move between polls; a minute is their smallest unit.
const TICK_MS = 30_000;

const STATUS_TAG: Record<TollBrowserStatus, { color: string; label: string }> = {
  ready: { color: 'green', label: 'Ready' },
  busy: { color: 'blue', label: 'Busy' },
  signed_out: { color: 'red', label: 'Signed out' },
  session_expiring: { color: 'orange', label: 'Session expiring' },
};

/** "1d 4h", "3h 12m", "8m", "expired". */
function formatLeft(ms: number): string {
  if (ms <= 0) return 'expired';
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * The TollGuru fetcher browsers — every machine signed in to a TollGuru
 * account that answers the Easy DAT toll calculator. Live socket state from
 * the backend's memory: a browser that is not connected is not listed, and
 * today's counts start over when the server restarts.
 */
export function TollBrowsersPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<TollBrowsers | null>(null);
  const [loading, setLoading] = useState(true);
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

  const serverNow = nowMs + skewMs;
  const items = data?.items ?? [];
  const signedOut = items.filter((row) => row.status === 'signed_out').length;
  const expiring = items.filter((row) => row.status === 'session_expiring').length;

  const columns: ColumnsType<TollBrowser> = [
    {
      title: 'Browser',
      width: 170,
      render: (_, row) => (
        <div>
          <div>{row.name || <span className="cell-sub">unnamed</span>}</div>
          <Tooltip title={`Socket ${row.browserId}`}>
            <code className="cell-sub">{row.browserId.slice(0, 8)}</code>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'TollGuru account',
      dataIndex: 'account',
      width: 220,
      ellipsis: true,
      render: (value: string | null) => value || <span className="cell-sub">—</span>,
    },
    {
      // Free text the operator saved in the fetcher popup (who owns the PC,
      // the account password, …). Shown in full and copyable — it is the
      // reason the note exists.
      title: 'Note',
      dataIndex: 'note',
      width: 240,
      render: (value: string | null) =>
        value ? (
          <Typography.Paragraph
            copyable
            style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {value}
          </Typography.Paragraph>
        ) : (
          <span className="cell-sub">—</span>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (value: TollBrowserStatus, row) => (
        <Tooltip title={row.late ? 'Waiting for the late answer of a timed-out request' : undefined}>
          <Tag color={STATUS_TAG[value].color}>{STATUS_TAG[value].label}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Session ends in',
      dataIndex: 'sessionExpiresAt',
      width: 130,
      render: (value: string | null, row) => {
        if (!row.loggedIn || !value) return <span className="cell-sub">—</span>;
        const left = new Date(value).getTime() - serverNow;
        return (
          <Tooltip title={formatDayTime(value)}>
            <span style={row.status === 'session_expiring' ? { color: '#d97706' } : undefined}>
              {formatLeft(left)}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Version',
      dataIndex: 'version',
      width: 80,
      render: (value: string) => value || <span className="cell-sub">—</span>,
    },
    {
      title: 'Connected since',
      dataIndex: 'connectedAt',
      width: 140,
      render: formatDayTime,
    },
    {
      title: 'Today ok / errors',
      width: 120,
      render: (_, row) => (
        <Tooltip title={row.lastSuccessAt ? `Last success ${formatDayTime(row.lastSuccessAt)}` : undefined}>
          <span>
            {row.okToday}
            {' / '}
            <span style={row.errorsToday ? { color: '#dc2626' } : undefined}>
              {row.errorsToday}
            </span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Last error',
      dataIndex: 'lastError',
      ellipsis: { showTitle: false },
      render: (value: TollBrowser['lastError']) =>
        value ? (
          <Tooltip title={value.message}>
            <span>
              <Tag>{value.code}</Tag>
              <span className="cell-sub">{formatDayTime(value.at)}</span>
            </span>
          </Tooltip>
        ) : (
          <span className="cell-sub">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="TollGuru"
        subtitle="Browsers signed in to TollGuru that answer the toll calculator — live, refreshed every 15s"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Usable"
          loading={loading && !data}
          value={`${data?.usable ?? 0} of ${data?.connected ?? 0}`}
          hint="Connected and signed in"
          icon={<CheckCircleOutlined />}
          variant={data && data.usable === 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Signed out"
          loading={loading && !data}
          value={signedOut}
          hint="Someone must sign in to TollGuru there"
          icon={<ApiOutlined />}
          variant={signedOut ? 'danger' : 'neutral'}
        />
        <StatCard
          label="Session expiring"
          loading={loading && !data}
          value={expiring}
          hint="Session ends within 24h"
          icon={<WarningOutlined />}
          variant={expiring ? 'warning' : 'neutral'}
        />
      </div>

      <div className="panel-card">
        <Table
          className="admin-table"
          size="small"
          rowKey="browserId"
          loading={loading && !data}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 1400 } : undefined}
          pagination={false}
          locale={{ emptyText: 'No TollGuru browser is connected' }}
        />
      </div>
    </div>
  );
}
