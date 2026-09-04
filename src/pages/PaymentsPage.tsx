import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { App, Button, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import {
  deletePayment,
  listPayments,
  updatePaymentStatus,
} from '../api/payments.api';
import { extractApiError } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useListRequest } from '../hooks/useListRequest';
import { usePlansStore } from '../store/plans.store';
import type { ExtPayment, PaymentStatus } from '../types/payment';
import { formatDate, formatMoney } from '../utils/formatters';
import { GrantPlanModal } from './users/GrantPlanModal';

function statusColor(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'green';
    case 'failed':
      return 'red';
    case 'refunded':
      return 'orange';
    default:
      return 'default';
  }
}

export function PaymentsPage() {
  const { message, modal } = App.useApp();
  const plans = usePlansStore((s) => s.plans);
  const [status, setStatus] = useState<PaymentStatus | undefined>();
  const [plan, setPlan] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const debouncedEmail = useDebouncedValue(email);

  const fetcher = useCallback(
    () =>
      listPayments({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        status,
        plan,
        email: debouncedEmail.trim() || undefined,
      }),
    [debouncedEmail, page, pageSize, plan, status],
  );

  const { items, total, loading, reload } = useListRequest<ExtPayment>(fetcher);

  async function changeStatus(row: ExtPayment, next: PaymentStatus) {
    try {
      await updatePaymentStatus(row.id, next);
      void message.success(`Marked ${next}`);
      // The plan on the account moves with the status, so the whole page is
      // refetched rather than patched — a neighbouring row may be affected too.
      void reload();
    } catch (err) {
      void message.error(extractApiError(err));
    }
  }

  const columns: ColumnsType<ExtPayment> = [
    {
      title: 'User',
      ellipsis: true,
      width: 220,
      render: (_, row) => row.userEmail ?? row.userId,
    },
    {
      title: 'Amount',
      width: 110,
      render: (_, row) => formatMoney(row.amount, row.currency),
    },
    {
      title: 'Plan',
      width: 130,
      render: (_, row) => (
        <Space size={4} wrap>
          <Tag color="cyan">{row.plan}</Tag>
          {row.kind === 'trial' && <Tag color="purple">trial</Tag>}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (value: PaymentStatus) => (
        <Tag color={statusColor(value)}>{value}</Tag>
      ),
    },
    {
      title: 'Grants until',
      dataIndex: 'appliedPlanExpiresAt',
      width: 150,
      render: formatDate,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 150,
      render: formatDate,
    },
    {
      title: '',
      key: 'actions',
      width: 180,
      render: (_, row) => (
        <Space size={4} wrap>
          {row.status !== 'paid' && (
            <Tooltip title="Apply this plan to the account now">
              <Button size="small" onClick={() => void changeStatus(row, 'paid')}>
                Mark paid
              </Button>
            </Tooltip>
          )}
          {row.status === 'paid' && (
            <Tooltip title="Put the account back on its previous plan">
              <Button
                size="small"
                onClick={() =>
                  modal.confirm({
                    title: 'Refund this payment?',
                    content:
                      'The account returns to the plan it had before this payment.',
                    okText: 'Refund',
                    onOk: () => changeStatus(row, 'refunded'),
                  })
                }
              >
                Refund
              </Button>
            </Tooltip>
          )}
          <Button
            size="small"
            danger
            onClick={() => {
              modal.confirm({
                title: 'Delete payment?',
                content:
                  'A paid payment also reverts the account to its previous plan. ' +
                  'Refund instead if you want to keep the record.',
                okButtonProps: { danger: true },
                onOk: async () => {
                  try {
                    await deletePayment(row.id);
                    void message.success('Deleted');
                    void reload();
                  } catch (err) {
                    void message.error(extractApiError(err));
                  }
                },
              });
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Every plan an account has ever been given, and what it cost"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              New payment
            </Button>
          </Space>
        }
      />

      <div className="panel-card">
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by account email"
            value={email}
            onChange={(e) => {
              setPage(1);
              setEmail(e.target.value);
            }}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 150 }}
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />
          <Select
            allowClear
            placeholder="Plan"
            style={{ width: 170 }}
            value={plan}
            onChange={(value) => {
              setPage(1);
              setPlan(value);
            }}
            options={plans.map((row) => ({
              value: row.code,
              label: row.name,
            }))}
          />
        </Space>

        <Table
          className="admin-table"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 1000 } : undefined}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
            showSizeChanger: true,
            showTotal: (count) => `${count} payments`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </div>

      <GrantPlanModal
        open={createOpen}
        user={null}
        onClose={() => setCreateOpen(false)}
        onDone={() => void reload()}
      />
    </div>
  );
}
