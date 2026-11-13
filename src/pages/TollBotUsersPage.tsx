import {
  CarOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Avatar,
  Button,
  Input,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiError } from '../api/client';
import {
  getTollBotSettings,
  listTollBotUsers,
  resetTollBotUserFreeRoutes,
  updateTollBotUser,
} from '../api/toll-bot.api';
import { PageHeader } from '../components/PageHeader';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useVisiblePoll } from '../hooks/useVisiblePoll';
import type { TollBotSettings, TollBotUser, TollBotUsers } from '../types/toll-bot';
import { TollBotGroupsTab } from './tollbot/TollBotGroupsTab';
import { TollBotLimitsModal } from './tollbot/TollBotLimitsModal';
import { TollBotResetModal } from './tollbot/TollBotResetModal';
import { TollBotUserLimitModal } from './tollbot/TollBotUserLimitModal';
import { formatDayTime } from '../utils/formatters';

const POLL_MS = 30_000;

type BlockedFilter = 'all' | 'active' | 'blocked';
type View = 'users' | 'groups';

function fullName(user: TollBotUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name';
}

function initials(user: TollBotUser): string {
  const name = fullName(user);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Who uses the Telegram toll bot. Each row links to the person's Telegram
 * profile so support can write to them: the public t.me link when they have a
 * @username, otherwise the app link by id (opens only in the Telegram app,
 * and only if their privacy settings allow it).
 */
export function TollBotUsersPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [data, setData] = useState<TollBotUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BlockedFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [settings, setSettings] = useState<TollBotSettings | null>(null);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [limitUser, setLimitUser] = useState<TollBotUser | null>(null);
  const [resetUser, setResetUser] = useState<TollBotUser | null>(null);
  const [view, setView] = useState<View>('users');
  const debouncedSearch = useDebouncedValue(search);

  // Only for the default shown in the header and the per-user hint; the
  // table's numbers come from the list itself.
  useEffect(() => {
    getTollBotSettings()
      .then(setSettings)
      .catch(() => undefined);
  }, []);

  const replaceRow = useCallback((updated: TollBotUser) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((row) =>
              row.telegramId === updated.telegramId ? updated : row,
            ),
          }
        : prev,
    );
  }, []);

  const load = useCallback(async () => {
    try {
      setData(
        await listTollBotUsers({
          skip: (page - 1) * pageSize,
          limit: pageSize,
          search: debouncedSearch.trim() || undefined,
          blocked: filter === 'all' ? undefined : filter === 'blocked',
        }),
      );
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, message, page, pageSize]);

  useVisiblePoll(load, POLL_MS);

  // The poll only refreshes on its timer; a new search, filter or page must
  // load at once. Skipped on mount, where the poll already loads.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    void load();
  }, [load]);

  async function toggleBlocked(user: TollBotUser, blocked: boolean) {
    setBusyId(user.telegramId);
    try {
      replaceRow(await updateTollBotUser(user.telegramId, { blocked }));
      void message.success(blocked ? 'User blocked' : 'User unblocked');
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePrivate(user: TollBotUser, privateAllowed: boolean) {
    setBusyId(user.telegramId);
    try {
      replaceRow(await updateTollBotUser(user.telegramId, { privateAllowed }));
      void message.success(
        privateAllowed ? 'Private chat allowed' : 'Private chat no longer allowed',
      );
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function resetFreeRoutes(user: TollBotUser) {
    setBusyId(user.telegramId);
    try {
      replaceRow(await resetTollBotUserFreeRoutes(user.telegramId));
      void message.success('Free full-routes claim cleared');
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: ColumnsType<TollBotUser> = [
    {
      title: 'User',
      width: 280,
      render: (_, user) => (
        <Space>
          <Avatar size="small" style={{ flex: 'none' }}>
            {initials(user)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div>{fullName(user)}</div>
            <div className="cell-sub">
              {user.profileUrl ? (
                <a href={user.profileUrl} target="_blank" rel="noreferrer">
                  @{user.username}
                </a>
              ) : (
                <Tooltip title="No @username — opens in the Telegram app by id, if their privacy settings allow it">
                  <a href={user.appUrl}>no @username</a>
                </Tooltip>
              )}{' '}
              · <code>{user.telegramId}</code>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Lanes',
      width: 130,
      render: (_, user) => (
        <Space size={4}>
          <Typography.Text
            type={user.lanesToday >= user.dailyLimit ? 'danger' : undefined}
            style={{ whiteSpace: 'nowrap' }}
          >
            {user.lanesToday}/{user.dailyLimit}
          </Typography.Text>
          <Tooltip title="Change this user's daily limit">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              aria-label="Change daily limit"
              onClick={() => setLimitUser(user)}
            />
          </Tooltip>
          <Tooltip
            title={
              user.lanesToday === 0 && !user.freeRoutesUsedToday
                ? 'Nothing used today'
                : "Reset today's lane count and free full-routes claim"
            }
          >
            <Button
              size="small"
              type="text"
              icon={<UndoOutlined />}
              aria-label="Reset today"
              disabled={user.lanesToday === 0 && !user.freeRoutesUsedToday}
              danger={user.lanesToday >= user.dailyLimit}
              onClick={() => setResetUser(user)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="Whether today’s free full-routes unlock is still available. Available = next calc can open every route. Claimed = first calc already used it.">
          All routes
        </Tooltip>
      ),
      width: 140,
      render: (_, user) => (
        <Space size={4}>
          <Tooltip
            title={
              user.freeRoutesUsedToday
                ? 'Today’s free full-routes card is used — later calcs stay on the cheapest route'
                : 'Next calculation can still open every route'
            }
          >
            <Tag
              color={user.freeRoutesUsedToday ? 'orange' : 'green'}
              style={{ marginInlineEnd: 0 }}
            >
              {user.freeRoutesUsedToday ? 'Claimed' : 'Available'}
            </Tag>
          </Tooltip>
          <Tooltip
            title={
              user.freeRoutesUsedToday
                ? 'Clear free full-routes claim so their next calc can open every route again'
                : 'Free full-routes still available — nothing to clear'
            }
          >
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              aria-label="Reset free routes"
              disabled={!user.freeRoutesUsedToday}
              loading={busyId === user.telegramId}
              onClick={() => void resetFreeRoutes(user)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'lanesTotal',
      width: 80,
    },
    {
      title: 'Last lane',
      ellipsis: true,
      render: (_, user) => {
        const last = user.recentLanes[0];
        if (!last) return <span className="cell-sub">—</span>;
        return (
          <Tooltip
            title={
              <div>
                {user.recentLanes.map((lane) => (
                  <div key={`${lane.at}-${lane.lane}`}>
                    {formatDayTime(lane.at)} — {lane.lane}
                    {lane.cached ? ' (cached)' : ''}
                  </div>
                ))}
              </div>
            }
          >
            <span>{last.lane}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Last seen',
      width: 150,
      render: (_, user) => (
        <Tooltip title={`First message: ${formatDayTime(user.firstSeenAt)}`}>
          {formatDayTime(user.lastSeenAt)}
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title="May calculate lanes in a private chat with the bot. Groups always work; directions always arrive.">
          Private
        </Tooltip>
      ),
      width: 100,
      render: (_, user) =>
        settings?.privateChatEnabled ? (
          <Tooltip title="Open to everyone in Settings">
            <Tag color="green">Everyone</Tag>
          </Tooltip>
        ) : (
          <Switch
            size="small"
            checked={user.privateAllowed}
            loading={busyId === user.telegramId}
            onChange={(allowed) => void togglePrivate(user, allowed)}
          />
        ),
    },
    {
      title: 'Access',
      width: 110,
      render: (_, user) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={!user.blocked}
            loading={busyId === user.telegramId}
            onChange={(allowed) => void toggleBlocked(user, !allowed)}
          />
          {user.blocked ? <Tag color="red">Blocked</Tag> : null}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Toll bot"
        subtitle={
          (data?.botUsername
            ? `People and groups using @${data.botUsername} — tolls and fuel in Telegram`
            : 'People using the Telegram toll bot') +
          (settings ? ` · default ${settings.dailyLaneLimit} lanes per user per day` : '')
        }
        extra={
          <Space>
            <Button icon={<CarOutlined />} onClick={() => navigate('/tollguru')}>
              TollGuru
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => setLimitsOpen(true)}>
              Settings
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              Refresh
            </Button>
          </Space>
        }
      />

      {data && !data.botConfigured ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="The toll bot is off"
          description="TOLL_BOT_TOKEN is not set on the server."
        />
      ) : null}

      <div className="panel-card">
        <Segmented<View>
          style={{ marginBottom: 12 }}
          value={view}
          onChange={setView}
          options={[
            { value: 'users', label: `Users${data ? ` (${data.total})` : ''}` },
            { value: 'groups', label: 'Groups' },
          ]}
        />
        {view === 'groups' ? (
          <TollBotGroupsTab />
        ) : (
          <>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Name, @username or Telegram id"
            style={{ width: 280 }}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Segmented<BlockedFilter>
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'blocked', label: 'Blocked' },
            ]}
          />
        </Space>
        <Table<TollBotUser>
          rowKey="telegramId"
          size="small"
          loading={loading && !data}
          columns={columns}
          dataSource={data?.items ?? []}
          locale={{ emptyText: 'Nobody has written to the bot yet' }}
          scroll={{ x: 1180 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} users`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
          </>
        )}
      </div>

      <TollBotLimitsModal
        open={limitsOpen}
        onClose={() => setLimitsOpen(false)}
        onSaved={(saved) => {
          setSettings(saved);
          // Every row without its own limit shows the default.
          void load();
        }}
      />
      <TollBotUserLimitModal
        user={limitUser}
        defaultLimit={settings?.dailyLaneLimit ?? null}
        onClose={() => setLimitUser(null)}
        onSaved={replaceRow}
      />
      <TollBotResetModal user={resetUser} onClose={() => setResetUser(null)} onDone={replaceRow} />
    </div>
  );
}
