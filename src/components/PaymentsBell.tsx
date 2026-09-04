import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, Empty, Tag, Tooltip } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPayments } from '../api/payments.api';
import type { ExtPayment } from '../types/payment';
import { formatDate, formatMoney } from '../utils/formatters';

const SEEN_KEY = 'easy-dat-admin:payments-seen-at';
const POLL_MS = 60_000;
const SHOWN = 8;

/**
 * "Seen" is kept in this browser rather than on the server.
 *
 * The admin accounts live in the customer app's `users` collection, which Easy
 * DAT must not write to — and a per-browser watermark is the right shape for
 * this anyway: it is a reading position, not a fact about the payment.
 */
function readSeenAt(): number {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeSeenAt(value: number): void {
  try {
    localStorage.setItem(SEEN_KEY, String(value));
  } catch {
    // Private mode; the badge simply comes back next time.
  }
}

export function PaymentsBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ExtPayment[]>([]);
  const [seenAt, setSeenAt] = useState(readSeenAt);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listPayments({ limit: SHOWN });
      setItems(res.items);
    } catch {
      // A bell that shouts about a failed poll is worse than a quiet one; the
      // pages themselves report their own errors.
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const unread = items.filter(
    (row) => new Date(row.createdAt).getTime() > seenAt,
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Opening the list is what counts as reading it.
    if (next && items.length > 0) {
      const newest = Math.max(
        ...items.map((row) => new Date(row.createdAt).getTime()),
      );
      setSeenAt(newest);
      writeSeenAt(newest);
    }
  }

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      trigger={['click']}
      placement="bottomRight"
      popupRender={() => (
        <div className="bell-panel panel-card">
          <div className="bell-panel-head">
            <strong>Latest payments</strong>
            <Button
              type="link"
              size="small"
              onClick={() => {
                setOpen(false);
                void navigate('/payments');
              }}
            >
              See all
            </Button>
          </div>

          {items.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No payments yet"
            />
          ) : (
            <ul className="bell-list">
              {items.map((row) => {
                const isNew = new Date(row.createdAt).getTime() > seenAt;
                return (
                  <li key={row.id} className={isNew ? 'is-new' : undefined}>
                    <div className="bell-list-main">
                      <span>{row.userEmail ?? 'unknown account'}</span>
                      <span className="bell-amount">
                        {row.kind === 'trial'
                          ? 'free trial'
                          : formatMoney(row.amount, row.currency)}
                      </span>
                    </div>
                    <div className="bell-list-sub">
                      <Tag color={row.status === 'paid' ? 'green' : 'default'}>
                        {row.status}
                      </Tag>
                      <Tag color="cyan">{row.plan}</Tag>
                      <span className="cell-sub">
                        {formatDate(row.createdAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    >
      <Tooltip title="New payments">
        <Badge count={unread.length} size="small" offset={[-2, 2]}>
          <Button type="text" icon={<BellOutlined />} />
        </Badge>
      </Tooltip>
    </Dropdown>
  );
}
