import { Tooltip, Typography } from 'antd';
import type { TollBrowser } from '../../types/toll-browser';
import { formatDayTime } from '../../utils/formatters';
import { STATUS_META, clock, displayName, sessionLeft } from './tollFormat';

interface Props {
  items: TollBrowser[];
  serverNow: number;
}

/** Cards = one card per browser, coloured along the top by its status. */
export function TollCards({ items, serverNow }: Props) {
  if (!items.length) {
    return <div className="panel-card tg-empty">No TollGuru browser is connected</div>;
  }
  return (
    <div className="tg-cards">
      {items.map((row) => {
        const left = sessionLeft(row, serverNow);
        return (
          <div key={row.browserId} className={`tg-card tg-card--${row.status}`}>
            <div className="tg-card-head">
              <b>{displayName(row)}</b>
              <span className={`tg-badge tg-badge--${row.status}`}>{STATUS_META[row.status].label}</span>
            </div>
            <div className="cell-sub tg-ellipsis">{row.account ?? 'account unknown'}</div>

            <div className="tg-card-grid">
              <div>
                <div className="cell-sub">Session ends</div>
                <div className={row.status === 'session_expiring' ? 'tg-fg--session_expiring' : undefined}>
                  {left ?? '—'}
                </div>
              </div>
              <div>
                <div className="cell-sub">Today ok / err</div>
                <div>
                  {row.okToday} /{' '}
                  <span className={row.errorsToday ? 'tg-fg--signed_out' : undefined}>{row.errorsToday}</span>
                </div>
              </div>
            </div>

            {row.note ? (
              <Typography.Paragraph
                className="tg-card-note"
                copyable
                ellipsis={{ rows: 2, tooltip: row.note }}
              >
                {row.note}
              </Typography.Paragraph>
            ) : null}

            <div className="tg-card-foot">
              {row.status === 'signed_out' ? (
                <span className="tg-fg--signed_out">Sign in to TollGuru on this PC</span>
              ) : row.lastError ? (
                <Tooltip title={row.lastError.message}>
                  <span className="tg-fg--signed_out">
                    {row.lastError.code} · {clock(row.lastError.at)}
                  </span>
                </Tooltip>
              ) : (
                <span className="cell-sub">No errors</span>
              )}
              <span className="cell-sub">
                v{row.version || '?'} · since {formatDayTime(row.connectedAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
