import { ReloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { listPromoCodes } from '../api/promo.api';
import { extractApiError } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import type { StripePromoCode } from '../types/promo';
import { formatDate, formatMoney } from '../utils/formatters';

/**
 * Stripe reports `amount_off` in the currency's minor unit — 500 for $5.00.
 * Zero-decimal currencies exist, but none of the ones Easy DAT prices in.
 */
function discountLabel(row: StripePromoCode): string {
  if (row.percentOff !== null) return `${row.percentOff}% off`;
  if (row.amountOff !== null) {
    return `${formatMoney(row.amountOff / 100, (row.currency ?? 'usd').toUpperCase())} off`;
  }
  return '—';
}

function durationLabel(row: StripePromoCode): string {
  if (row.duration === 'repeating' && row.durationInMonths) {
    return `${row.durationInMonths} month(s)`;
  }
  if (row.duration === 'forever') return 'Forever';
  if (row.duration === 'once') return 'First payment';
  return row.duration;
}

export function PromoCodesPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<StripePromoCode[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPromoCodes();
      setItems(res.items);
      setConfigured(res.configured);
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    // Same shape as every list screen: the spinner flips synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const columns: ColumnsType<StripePromoCode> = [
    {
      title: 'Code',
      width: 160,
      render: (_, row) => (
        <div>
          <code>{row.code}</code>
          {row.couponName ? (
            <div className="cell-sub">{row.couponName}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Discount',
      width: 130,
      render: (_, row) => <Tag color="cyan">{discountLabel(row)}</Tag>,
    },
    {
      title: 'Applies to',
      width: 130,
      render: (_, row) => durationLabel(row),
    },
    {
      title: 'Redeemed',
      width: 120,
      render: (_, row) =>
        row.maxRedemptions
          ? `${row.timesRedeemed} / ${row.maxRedemptions}`
          : String(row.timesRedeemed),
    },
    {
      title: 'Limits',
      render: (_, row) => (
        <Space size={4} wrap>
          {row.firstTimeTransactionOnly && <Tag>new customers</Tag>}
          {row.expiresAt ? (
            <Tooltip title={formatDate(row.expiresAt)}>
              <Tag color="orange">expires</Tag>
            </Tooltip>
          ) : null}
          {!row.firstTimeTransactionOnly && !row.expiresAt && (
            <span className="cell-sub">—</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Created',
      width: 160,
      render: (_, row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Promo codes"
        subtitle="Active promotion codes in Stripe"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {!configured ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Stripe is not connected yet"
          description={
            'Set STRIPE_SECRET_KEY on the backend and this page lists the ' +
            'promotion codes that are live in Stripe. Codes are created and ' +
            'redeemed there — this screen only shows them.'
          }
        />
      ) : (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Read-only"
          description="Create, edit and expire codes in the Stripe dashboard; this is a view of what is currently on offer."
        />
      )}

      <div className="panel-card">
        <Table
          className="admin-table"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 860 } : undefined}
          pagination={false}
          locale={{
            emptyText: configured
              ? 'No active promotion codes in Stripe'
              : 'Nothing to show until Stripe is connected',
          }}
        />
      </div>
    </div>
  );
}
