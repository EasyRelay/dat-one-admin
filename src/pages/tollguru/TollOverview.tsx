import { CheckCircleOutlined } from '@ant-design/icons';
import { Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TollBrowser, TollBrowsers, TollBrowserStatus } from '../../types/toll-browser';
import { formatDayTime } from '../../utils/formatters';
import {
  STATUS_META,
  ago,
  clock,
  displayName,
  needsAttention,
  sessionLeft,
} from './tollFormat';

interface Props {
  data: TollBrowsers;
  items: TollBrowser[];
  serverNow: number;
}

const BAR_ORDER: TollBrowserStatus[] = ['ready', 'busy', 'session_expiring', 'signed_out'];

/** Overview = status-first header (big usable count, bar, problems) over the full table. */
export function TollOverview({ data, items, serverNow }: Props) {
  const counts = BAR_ORDER.map((status) => ({
    status,
    count: items.filter((row) => row.status === status).length,
  }));
  const problems = items.filter(needsAttention);

  return (
    <>
      <div className="panel-card tg-hero">
        <div className="tg-hero-top">
          <div>
            <div className="tg-hero-num">
              {data.usable}
              <span> of {data.connected}</span>
            </div>
            <div className="cell-sub">browsers can take requests</div>
          </div>
          <div className="tg-hero-bars">
            <div className="tg-bar">
              {counts.map(({ status, count }) =>
                count ? (
                  <span
                    key={status}
                    className={`tg-bar-seg tg-bg--${status}`}
                    style={{ flexGrow: count }}
                  />
                ) : null,
              )}
            </div>
            <div className="tg-legend">
              {counts.map(({ status, count }) => (
                <span key={status}>
                  <i className={`tg-dot tg-bg--${status}`} />
                  {STATUS_META[status].label} {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {problems.length ? (
          <>
            <div className="tg-section-title tg-fg--signed_out">Needs attention</div>
            {problems.map((row) => (
              <div key={row.browserId} className={`tg-alert tg-alert--${row.status}`}>
                <i className={`tg-dot tg-bg--${row.status}`} />
                <b>{displayName(row)}</b>
                <span className="tg-alert-text">
                  {row.account ?? 'account unknown'} ·{' '}
                  {row.status === 'signed_out'
                    ? row.lastError?.code === 'LOGGED_OUT'
                      ? `signed out ${ago(row.lastError.at, serverNow)} — sign in to TollGuru on this PC`
                      : 'signed out — sign in to TollGuru on this PC'
                    : `session ends in ${sessionLeft(row, serverNow) ?? '—'}`}
                </span>
              </div>
            ))}
          </>
        ) : items.length ? (
          <div className="tg-all-good">
            <CheckCircleOutlined /> All browsers are working
          </div>
        ) : null}
      </div>

      <div className="panel-card">
        <Table
          className="admin-table"
          size="small"
          rowKey="browserId"
          columns={columns(serverNow)}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 1300 } : undefined}
          pagination={false}
          locale={{ emptyText: 'No TollGuru browser is connected' }}
        />
      </div>
    </>
  );
}

function columns(serverNow: number): ColumnsType<TollBrowser> {
  return [
    {
      title: 'Browser',
      width: 220,
      render: (_, row) => (
        <div className="cell-two-line">
          <div className="cell-main">{row.name || <span className="cell-sub">unnamed</span>}</div>
          <div className="cell-sub">{row.account ?? '—'}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      render: (value: TollBrowserStatus, row) => (
        <Tooltip title={row.late ? 'Waiting for the late answer of a timed-out request' : undefined}>
          <Tag color={STATUS_META[value].tag}>{STATUS_META[value].label}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Session ends in',
      dataIndex: 'sessionExpiresAt',
      width: 120,
      render: (value: string | null, row) => {
        const left = sessionLeft(row, serverNow);
        if (!left || !value) return <span className="cell-sub">—</span>;
        return (
          <Tooltip title={formatDayTime(value)}>
            <span className={row.status === 'session_expiring' ? 'tg-fg--session_expiring' : undefined}>
              {left}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Today ok / errors',
      width: 120,
      render: (_, row) => (
        <Tooltip title={row.lastSuccessAt ? `Last success ${formatDayTime(row.lastSuccessAt)}` : undefined}>
          <span>
            {row.okToday}
            <span className="cell-sub"> / </span>
            <span className={row.errorsToday ? 'tg-fg--signed_out' : 'cell-sub'}>{row.errorsToday}</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Last error',
      dataIndex: 'lastError',
      width: 170,
      ellipsis: { showTitle: false },
      render: (value: TollBrowser['lastError']) =>
        value ? (
          <Tooltip title={value.message}>
            <span>
              <Tag>{value.code}</Tag> <span className="cell-sub">{clock(value.at)}</span>
            </span>
          </Tooltip>
        ) : (
          <span className="cell-sub">—</span>
        ),
    },
    {
      // Free text saved in the fetcher popup (who owns the PC, the password…).
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
  ];
}
