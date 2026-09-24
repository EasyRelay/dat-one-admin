import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Button,
  Input,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import { useCallback, useState } from 'react';
import { listUsers, type UserSortField } from '../api/users.api';
import { PageHeader } from '../components/PageHeader';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useListRequest } from '../hooks/useListRequest';
import { usePlansStore } from '../store/plans.store';
import type { ExtUser } from '../types/user';
import {
  daysUntil,
  formatDate,
  formatDay,
  formatMoney,
  planStatus,
} from '../utils/formatters';
import { GrantPlanModal } from './users/GrantPlanModal';
import { UserDrawer } from './users/UserDrawer';

type StatusFilter = 'active' | 'disabled';

/**
 * Archived accounts are a separate view, not a filter value.
 *
 * They used to sit in the same list behind a "Removed" status, which meant the
 * default list quietly included them — an archived account looked like any
 * other row until someone read the tag.
 */
type Scope = 'accounts' | 'archive';

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
  const [scope, setScope] = useState<Scope>('accounts');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<string | undefined>();
  const [status, setStatus] = useState<StatusFilter | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<ExtUser | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  /**
   * Sorting is asked of the server, not applied to the rows already fetched —
   * the list is paged, so sorting the page would order twenty accounts and
   * silently claim it had ordered all of them.
   */
  const [sort, setSort] = useState<{
    field: UserSortField | null;
    order: SortOrder;
  }>({ field: null, order: null });

  const debouncedSearch = useDebouncedValue(search);
  const archived = scope === 'archive';

  const fetcher = useCallback(
    () =>
      listUsers({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        plan,
        // Archived accounts are all disabled, so the status filter only means
        // something on the accounts list.
        isActive: archived
          ? undefined
          : status === 'active'
            ? true
            : status === 'disabled'
              ? false
              : undefined,
        removed: archived,
        ...(sort.field && sort.order
          ? {
              sortBy: sort.field,
              sortOrder: sort.order === 'ascend' ? ('asc' as const) : ('desc' as const),
            }
          : {}),
      }),
    [archived, debouncedSearch, page, pageSize, plan, sort, status],
  );

  const { items, total, loading, reload, setItems } =
    useListRequest<ExtUser>(fetcher);

  /**
   * Archiving and restoring move a row between the two lists, so the row is
   * dropped from the one being shown rather than patched in place — leaving it
   * there is how an archived account keeps appearing under "Accounts".
   */
  function applyUser(saved: ExtUser) {
    if (saved.removed !== archived) {
      setItems((prev) => prev.filter((row) => row.id !== saved.id));
      setSelected(null);
      return;
    }
    setItems((prev) =>
      prev.map((row) =>
        row.id === saved.id ? { ...saved, latestPayment: row.latestPayment } : row,
      ),
    );
    setSelected((prev) => (prev && prev.id === saved.id ? saved : prev));
  }

  function removeUser(userId: string) {
    setItems((prev) => prev.filter((row) => row.id !== userId));
    setSelected(null);
  }

  const columns: ColumnsType<ExtUser> = [
    {
      title: 'Account',
      ellipsis: true,
      width: 220,
      sorter: true,
      sortOrder: sort.field === 'email' ? sort.order : null,
      render: (_, row) => (
        <div>
          <div>{row.email}</div>
          {row.name ? <div className="cell-sub">{row.name}</div> : null}
        </div>
      ),
    },
    {
      title: 'Plan',
      width: 215,
      render: (_, row) => {
        if (!row.plan) return <Tag>No plan</Tag>;
        const state = planStatus(row.planExpiresAt);
        // One line: the plan, then when it ends as plain text. Two stacked
        // tags made every row twice as tall for a date that is not urgent
        // enough to deserve a colour of its own — unless it nearly is.
        return (
          <Space size={6} wrap={false}>
            <Tag color={PLAN_TAG_COLOR} style={{ marginInlineEnd: 0 }}>
              {row.plan}
            </Tag>
            <span
              className="cell-sub"
              style={{
                whiteSpace: 'nowrap',
                color:
                  state === 'expired'
                    ? '#cf1322'
                    : state === 'soon'
                      ? '#d46b08'
                      : undefined,
              }}
            >
              {state === 'never'
                ? 'no end date'
                : `${state === 'expired' ? 'expired' : 'until'} ${formatDay(row.planExpiresAt)}`}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Last payment',
      width: 155,
      render: (_, row) => {
        const payment = row.latestPayment;
        if (!payment) return <span className="cell-sub">—</span>;
        return (
          <Space size={6} wrap={false}>
            {payment.kind === 'trial' ? (
              <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                free trial
              </Tag>
            ) : (
              <span>{formatMoney(payment.amount, payment.currency)}</span>
            )}
            <span className="cell-sub">{formatDay(payment.createdAt)}</span>
          </Space>
        );
      },
    },
    {
      title: 'Days left',
      width: 110,
      sorter: true,
      sortOrder: sort.field === 'planExpiresAt' ? sort.order : null,
      render: (_, row) => {
        if (!row.plan) return <span className="cell-sub">—</span>;
        const left = daysUntil(row.planExpiresAt);
        if (left === null) return <span className="cell-sub">no end date</span>;

        /*
         * Coloured only when it means something. A tag for the two states
         * worth acting on — already gone, and about to go — and plain text
         * for the rest, so a page of healthy accounts stays quiet and the one
         * that needs attention is the only thing with colour on it.
         */
        if (left <= 0) return <Tag color="red">expired</Tag>;
        const label = `${left} ${left === 1 ? 'day' : 'days'}`;
        if (left <= 7) return <Tag color="red">{label}</Tag>;
        if (left <= 30) return <Tag color="orange">{label}</Tag>;
        return <span>{label}</span>;
      },
    },
    {
      title: 'Status',
      width: 120,
      render: (_, row) => {
        if (row.removed) return <Tag>archived</Tag>;
        if (!row.isActive) return <Tag color="red">disabled</Tag>;
        // A lapsed plan is not an "active" account in any sense the admin
        // cares about, even though the row is still enabled — the customer
        // can sign in and buy again, which is exactly the state to show.
        if (row.plan && planStatus(row.planExpiresAt) === 'expired') {
          return <Tag>expired</Tag>;
        }
        return <Tag color="green">active</Tag>;
      },
    },
    {
      title: 'Last seen',
      dataIndex: 'lastSeenAt',
      width: 140,
      sorter: true,
      sortOrder: sort.field === 'lastSeenAt' ? sort.order : null,
      render: formatDate,
    },
  ];

  /** Which column header maps to which field the backend will order by. */
  const SORT_FIELDS: Record<string, UserSortField> = {
    Account: 'email',
    'Days left': 'planExpiresAt',
    'Last seen': 'lastSeenAt',
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={
          archived
            ? 'Archived accounts — restore them or delete them for good'
            : 'Extension accounts, their plans and their access'
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
              Refresh
            </Button>
            {!archived && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setGrantOpen(true)}
              >
                Grant plan
              </Button>
            )}
          </Space>
        }
      />

      <div className="panel-card">
        <Segmented<Scope>
          value={scope}
          onChange={(value) => {
            setScope(value);
            setPage(1);
            setStatus(undefined);
            setSelected(null);
          }}
          options={[
            { value: 'accounts', label: 'Accounts' },
            { value: 'archive', label: 'Archive' },
          ]}
          style={{ marginBottom: 16 }}
        />

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
          {!archived && (
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
              ]}
            />
          )}
        </Space>

        <Table
          className="admin-table admin-table--clickable"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 960 } : undefined}
          onRow={(row) => ({ onClick: () => setSelected(row) })}
          onChange={(_pagination, _filters, sorter) => {
            // Back to page one: staying on page 4 of the old order shows a
            // slice nobody asked for.
            const next = Array.isArray(sorter) ? sorter[0] : sorter;
            const field = SORT_FIELDS[String(next?.column?.title ?? '')];
            setPage(1);
            setSort(
              field && next?.order
                ? { field, order: next.order }
                : { field: null, order: null },
            );
          }}
          locale={{
            emptyText: archived
              ? 'Nothing is archived'
              : 'No accounts match these filters',
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
            showSizeChanger: true,
            showTotal: (count) =>
              archived ? `${count} archived` : `${count} accounts`,
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
        onDeleted={removeUser}
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
