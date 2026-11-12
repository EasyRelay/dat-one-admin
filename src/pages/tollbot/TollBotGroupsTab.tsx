import { LinkOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Input, Segmented, Space, Switch, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { extractApiError } from '../../api/client';
import { listTollBotGroups, setTollBotGroupEnabled } from '../../api/toll-bot.api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useVisiblePoll } from '../../hooks/useVisiblePoll';
import type { TollBotGroup, TollBotGroups } from '../../types/toll-bot';
import { formatDayTime } from '../../utils/formatters';

const POLL_MS = 30_000;

type EnabledFilter = 'all' | 'on' | 'off';

/** The bot is still in the group (it was not removed or kicked). */
function botIsIn(group: TollBotGroup): boolean {
  return group.botStatus !== 'left' && group.botStatus !== 'kicked';
}

function statusTag(group: TollBotGroup) {
  switch (group.botStatus) {
    case 'administrator':
      return <Tag color="blue">Admin</Tag>;
    case 'left':
      return <Tag>Removed</Tag>;
    case 'kicked':
      return <Tag color="red">Kicked</Tag>;
    case 'member':
      return <Tag color="green">Member</Tag>;
    default:
      return <Tag>{group.botStatus ?? 'unknown'}</Tag>;
  }
}

/**
 * The Telegram groups the toll bot is in. A group appears when the bot is
 * added to it or first used there, switched off; the switch decides whether
 * people there may calculate lanes (off = the bot points them to a private chat).
 */
export function TollBotGroupsTab() {
  const { message } = App.useApp();
  const [data, setData] = useState<TollBotGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EnabledFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busyId, setBusyId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const load = useCallback(async () => {
    try {
      setData(
        await listTollBotGroups({
          skip: (page - 1) * pageSize,
          limit: pageSize,
          search: debouncedSearch.trim() || undefined,
          enabled: filter === 'all' ? undefined : filter === 'on',
        }),
      );
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, message, page, pageSize]);

  useVisiblePoll(load, POLL_MS);

  // A new search, filter or page loads at once; skipped on mount (the poll loads).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    void load();
  }, [load]);

  async function toggle(group: TollBotGroup, enabled: boolean) {
    setBusyId(group.chatId);
    try {
      const updated = await setTollBotGroupEnabled(group.chatId, enabled);
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((row) => (row.chatId === updated.chatId ? updated : row)),
            }
          : prev,
      );
      void message.success(enabled ? 'Group switched on' : 'Group switched off');
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: ColumnsType<TollBotGroup> = [
    {
      title: 'Group',
      width: 300,
      render: (_, group) => (
        <Space>
          <Avatar size="small" icon={<TeamOutlined />} style={{ flex: 'none' }} />
          <div style={{ minWidth: 0 }}>
            <div>{group.title || 'Untitled group'}</div>
            <div className="cell-sub">
              {group.username ? `@${group.username}` : 'private group'} · <code>{group.chatId}</code>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Link',
      width: 100,
      render: (_, group) =>
        group.link ? (
          <Button size="small" icon={<LinkOutlined />} href={group.link} target="_blank" rel="noreferrer">
            Open
          </Button>
        ) : (
          <Tooltip title="A private group has no public link">
            <span className="cell-sub">—</span>
          </Tooltip>
        ),
    },
    {
      title: 'Bot',
      width: 110,
      render: (_, group) => statusTag(group),
    },
    {
      title: 'Lanes',
      dataIndex: 'lanesTotal',
      width: 80,
    },
    {
      title: 'Last lane',
      width: 150,
      render: (_, group) =>
        group.lastLaneAt ? formatDayTime(group.lastLaneAt) : <span className="cell-sub">—</span>,
    },
    {
      title: 'Last used',
      width: 150,
      render: (_, group) => (
        <Tooltip title={`First seen: ${formatDayTime(group.firstSeenAt)}`}>
          {group.lastSeenAt ? formatDayTime(group.lastSeenAt) : <span className="cell-sub">—</span>}
        </Tooltip>
      ),
    },
    {
      title: 'Works here',
      width: 120,
      render: (_, group) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={group.enabled}
            loading={busyId === group.chatId}
            onChange={(enabled) => void toggle(group, enabled)}
          />
          {!group.enabled ? <Tag color="red">Off</Tag> : null}
          {group.enabled && !botIsIn(group) ? (
            <Tooltip title="The bot is no longer in this group">
              <Tag>Not in group</Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Title, @username or chat id"
          style={{ width: 280 }}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Segmented<EnabledFilter>
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
        />
      </Space>
      <Table<TollBotGroup>
        rowKey="chatId"
        size="middle"
        loading={loading && !data}
        columns={columns}
        dataSource={data?.items ?? []}
        locale={{ emptyText: 'The bot has not been added to a group yet' }}
        scroll={{ x: 1010 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} groups`,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
      />
    </>
  );
}
