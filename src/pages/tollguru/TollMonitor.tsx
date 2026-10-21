import { Tooltip } from 'antd';
import type { TollBrowser, TollBrowsers } from '../../types/toll-browser';
import { formatDayTime } from '../../utils/formatters';
import { STATUS_META, clock, displayName, sessionLeft } from './tollFormat';

interface Props {
  data: TollBrowsers;
  items: TollBrowser[];
  serverNow: number;
}

/** Monitor = dense one-line-per-browser list in monospace, for many browsers at once. */
export function TollMonitor({ data, items, serverNow }: Props) {
  const count = (status: TollBrowser['status']) => items.filter((row) => row.status === status).length;
  const ok = items.reduce((sum, row) => sum + row.okToday, 0);
  const errors = items.reduce((sum, row) => sum + row.errorsToday, 0);

  return (
    <div className="panel-card tg-mon">
      <div className="tg-mon-sum">
        <span>
          usable {data.usable}/{data.connected}
        </span>
        <span className="tg-fg--busy">busy {count('busy')}</span>
        <span className="tg-fg--signed_out">out {count('signed_out')}</span>
        <span className="tg-fg--session_expiring">exp {count('session_expiring')}</span>
        <span className="tg-mon-right">
          ok {ok} · err {errors} · refresh 15s
        </span>
      </div>
      <div className="tg-mon-row tg-mon-head">
        <span />
        <span>browser</span>
        <span>account</span>
        <span>session</span>
        <span>ok/err</span>
        <span>ver</span>
        <span>last error</span>
      </div>
      {items.map((row) => (
        <div key={row.browserId} className="tg-mon-row">
          <Tooltip title={STATUS_META[row.status].label}>
            <i className={`tg-dot tg-bg--${row.status}`} />
          </Tooltip>
          <span className="tg-ellipsis">{displayName(row)}</span>
          <span className="tg-ellipsis cell-sub">{row.account ?? '—'}</span>
          <span className={row.status === 'session_expiring' ? 'tg-fg--session_expiring' : undefined}>
            {sessionLeft(row, serverNow) ?? '—'}
          </span>
          <span>
            {row.okToday}/<span className={row.errorsToday ? 'tg-fg--signed_out' : undefined}>{row.errorsToday}</span>
          </span>
          <span className="cell-sub">{row.version || '—'}</span>
          {row.lastError ? (
            <Tooltip title={`${row.lastError.message} — ${formatDayTime(row.lastError.at)}`}>
              <span className="tg-ellipsis tg-fg--signed_out">
                {row.lastError.code} {clock(row.lastError.at)}
              </span>
            </Tooltip>
          ) : (
            <span className="cell-sub">—</span>
          )}
        </div>
      ))}
      {!items.length && <div className="tg-empty">No TollGuru browser is connected</div>}
    </div>
  );
}
