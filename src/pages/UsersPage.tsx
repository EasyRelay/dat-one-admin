import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { listUsers } from '../api/users.api';
import { PageHeader } from '../components/PageHeader';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useListRequest } from '../hooks/useListRequest';
import { usePlansStore } from '../store/plans.store';
import { EXT_FEATURE_KEYS, EXT_FEATURE_LABELS } from '../types/features';
import type { ExtUser } from '../types/user';
import { formatDate, formatMoney, planStatus } from '../utils/formatters';
import { GrantPlanModal } from './users/GrantPlanModal';
import { UserDrawer } from './users/UserDrawer';

type StatusFilter = 'active' | 'disabled' | 'removed';

const PLAN_TAG_COLOR = 'cyan';

/**
 * Accounts and their subscriptions, in one table.
 *
 * There used to be a separate Subscriptions page listing the same accounts
 * with different columns, and both opened the same edit dialog — so the same
 * account could be changed from two places with different consequences.
 */
export function UsersPage() {
  const plans = usePlansStore((s) => s.plans);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<string | undefined>();
  const [status, setStatus] = useState<StatusFilter | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<ExtUser | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const fetcher = useCallback(
    () =>
      listUsers({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        plan,
        isActive:
          status === 'active' ? true : status === 'disabled' ? false : undefined,
        removed: status === 'removed' ? true : undefined,
      }),
    [debouncedSearch, page, pageSize, plan, status],
  );

  const { items, total, loading, reload, setItems } =
    useListRequest<ExtUser>(fetcher);

  function applyUser(saved: ExtUser) {
    setItems((prev) =>
      prev.map((row) =>
        row.id === saved.id ? { ...saved, latestPayment: row.latestPayment } : row,
      ),
    );
    setSelected((prev) => (prev && prev.id === saved.id ? saved : prev));
  }

  const columns: ColumnsType<ExtUser> = [
    {
      title: 'Account',
      ellipsis: true,
      width: 220,
      render: (_, row) => (
        <div>
          <div>{row.email}</div>
          {row.name ? <div className="cell-sub">{row.name}</div> : null}
        </div>
      ),
    },
    {
      title: 'Plan',
      width: 180,
      render: (_, row) => {
        if (!row.plan) return <Tag>No plan</Tag>;
        const state = planStatus(row.planExpiresAt);
        return (
          <Space orientation="vertical" size={2}>
            <Tag color={PLAN_TAG_COLOR}>{row.plan}</Tag>
            <Tag
              color={
                state === 'expired'
                  ? 'red'
                  : state === 'soon'
                    ? 'orange'
                    : state === 'never'
                      ? 'blue'
                      : 'green'
              }
            >
              {state === 'never'
                ? 'no end date'
                : `${state === 'expired' ? 'expired' : 'until'} ${formatDate(row.planExpiresAt)}`}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Last payment',
      width: 140,
      render: (_, row) => {
        const payment = row.latestPayment;
        if (!payment) return <span className="cell-sub">—</span>;
        return (
          <div>
            <div>
              {payment.kind === 'trial' ? (
                <Tag color="purple">free trial</Tag>
              ) : (
                formatMoney(payment.amount, payment.currency)
              )}
            </div>
            <div className="cell-sub">{formatDate(payment.createdAt)}</div>
          </div>
        );
      },
    },
    {
      title: 'Access',
      width: 110,
      render: (_, row) => {
        const on = EXT_FEATURE_KEYS.filter((key) => row.features[key]);
        const overridden = Object.keys(row.featureOverrides ?? {}).length;
        return (
          <Space size={4}>
            <Tooltip
              title={
                on.length
                  ? on.map((key) => EXT_FEATURE_LABELS[key]).join(', ')
                  : 'No features'
              }
            >
              <Tag color={on.length ? 'green' : 'red'}>
                {on.length}/{EXT_FEATURE_KEYS.length}
              </Tag>
            </Tooltip>
            {overridden > 0 && (
              <Tooltip title={`${overridden} feature override(s) on this account`}>
                <Tag color="purple">custom</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      width: 120,
      render: (_, row) => (
        <Space size={4} wrap>
          <Tag color={row.isActive ? 'green' : 'red'}>
            {row.isActive ? 'active' : 'disabled'}
          </Tag>
          {row.removed ? <Tag>removed</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Last seen',
      dataIndex: 'lastSeenAt',
      width: 140,
      render: formatDate,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Extension accounts, their plans and their access"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setGrantOpen(true)}
            >
              Grant plan
            </Button>
          </Space>
        }
      />

      <div className="panel-card">
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search email or name"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={{ width: 260 }}
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
            options={[
              { value: 'none', label: 'No plan' },
              ...plans.map((row) => ({ value: row.code, label: row.name })),
            ]}
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
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
              { value: 'removed', label: 'Removed' },
            ]}
          />
        </Space>

        <Table
          className="admin-table admin-table--clickable"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 920 } : undefined}
          onRow={(row) => ({ onClick: () => setSelected(row) })}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
            showSizeChanger: true,
            showTotal: (count) => `${count} accounts`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </div>

      <UserDrawer
        open={!!selected}
        user={selected}
        onClose={() => setSelected(null)}
        onChanged={applyUser}
      />

      <GrantPlanModal
        open={grantOpen}
        user={null}
        onClose={() => setGrantOpen(false)}
        onDone={() => void reload()}
      />
    </div>
  );
}
