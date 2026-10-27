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
import { useCallback, useEffect, useState } from 'react';
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
  formatDayTime,
  formatMoney,
  isLifetime,
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
type Scope = 'accounts' | 'hidden' | 'archive';

const PLAN_TAG_COLOR = 'cyan';
/** How often the list re-reads who has DAT open (the extension reports changes within seconds). */
const DAT_OPEN_REFRESH_MS = 20_000;

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
  const hidden = scope === 'hidden';

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
        removed: hidden ? undefined : archived,
        hidden,
        ...(sort.field && sort.order
          ? {
              sortBy: sort.field,
              sortOrder: sort.order === 'ascend' ? ('asc' as const) : ('desc' as const),
            }
          : {}),
      }),
    [archived, debouncedSearch, hidden, page, pageSize, plan, sort, status],
  );

  const { items, total, loading, reload, setItems } =
    useListRequest<ExtUser>(fetcher);

  // "DAT open" changes by the minute. Re-read the page quietly and update only
  // that field, so a refresh never flashes the table or overwrites a row being
  // edited.
  useEffect(() => {
    const timer = window.setInterval(() => {
      fetcher()
        .then((data) => {
          const open = new Map(data.items.map((row) => [row.id, row.datOpenDevices]));
          setItems((prev) =>
            prev.map((row) =>
              open.has(row.id) ? { ...row, datOpenDevices: open.get(row.id) ?? 0 } : row,
            ),
          );
        })
        .catch(() => {
          // Background poll; the Refresh button reports errors.
        });
    }, DAT_OPEN_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [fetcher, setItems]);

  /**
   * Archiving and restoring move a row between the two lists, so the row is
   * dropped from the one being shown rather than patched in place — leaving it
   * there is how an archived account keeps appearing under "Accounts".
   */
  function inThisList(saved: ExtUser): boolean {
    if (hidden) return saved.hidden;
    if (saved.hidden) return false;
    return saved.removed === archived;
  }

  function applyUser(saved: ExtUser) {
    if (!inThisList(saved)) {
      setItems((prev) => prev.filter((row) => row.id !== saved.id));
      setSelected(null);
      return;
    }
    setItems((prev) =>
      prev.map((row) =>
        row.id === saved.id
          ? // A single-account answer carries neither; keep what the list knew.
            { ...saved, latestPayment: row.latestPayment, datOpenDevices: row.datOpenDevices }
          : row,
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
      width: '25%',
      sorter: true,
      sortOrder: sort.field === 'email' ? sort.order : null,
      // Email only — the name line was mostly '—' and doubled every row's height.
      render: (_, row) => (
        <div className="cell-two-line users-email" title={row.name || undefined}>
          <div className="cell-main">{row.email}</div>
        </div>
      ),
    },
    {
      title: 'DAT',
      width: 110,
      render: (_, row) =>
        row.datOpenDevices > 0 ? (
          <Tag
            color="green"
            style={{ marginInlineEnd: 0 }}
            title={`one.dat.com is open on ${row.datOpenDevices} computer${row.datOpenDevices === 1 ? '' : 's'}`}
          >
            Open{row.datOpenDevices > 1 ? ` · ${row.datOpenDevices} PCs` : ''}
          </Tag>
        ) : (
          <Tag color="red" style={{ marginInlineEnd: 0 }} title="No one.dat.com tab open">
            Closed
          </Tag>
        ),
    },
    {
      title: 'Plan',
      width: '20%',
      render: (_, row) => {
        if (!row.plan) return <span className="cell-sub">No plan</span>;
        if (isLifetime(row.planExpiresAt)) {
          return (
            <Space size={6} wrap={false}>
              <Tag color={PLAN_TAG_COLOR} style={{ marginInlineEnd: 0 }}>
                {row.plan}
              </Tag>
              <span className="cell-sub">lifetime</span>
            </Space>
          );
        }
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
      width: '17%',
      render: (_, row) => {
        const payment = row.latestPayment;
        if (!payment) return <span className="cell-sub">—</span>;
        return (
          <Space size={6} wrap={false}>
            {payment.kind === 'trial' ? (
              <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                free trial
              </Tag>
            ) : payment.kind === 'free' ? (
              <Tag color="green" style={{ marginInlineEnd: 0 }}>
                free plan
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
      width: '11%',
      sorter: true,
      sortOrder: sort.field === 'planExpiresAt' ? sort.order : null,
      render: (_, row) => {
        if (!row.plan) return <span className="cell-sub">—</span>;
        if (isLifetime(row.planExpiresAt)) return <span>lifetime</span>;
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
      width: '10%',
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
      width: '17%',
      sorter: true,
      sortOrder: sort.field === 'lastSeenAt' ? sort.order : null,
      render: (value: string | null) => (
        <span title={formatDate(value)} style={{ whiteSpace: 'nowrap' }}>
          {formatDayTime(value)}
        </span>
      ),
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
            : hidden
              ? 'Test accounts and our own people — left out of dashboard counts'
              : 'Extension accounts, their plans and their access'
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
              Refresh
            </Button>
            {scope === 'accounts' && (
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
            { value: 'hidden', label: 'Hidden' },
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
          className="admin-table admin-table--clickable users-table"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 1100 } : undefined}
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
              : hidden
                ? 'Nobody is in Hidden yet'
                : 'No accounts match these filters',
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
            showSizeChanger: true,
            showTotal: (count) =>
              archived
                ? `${count} archived`
                : hidden
                  ? `${count} hidden`
                  : `${count} accounts`,
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
