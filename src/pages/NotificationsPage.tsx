import { NotificationOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import {
  deleteNotification,
  listNotifications,
} from '../api/notifications.api';
import { extractApiError } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useListRequest } from '../hooks/useListRequest';
import type {
  ExtAdminNotification,
  NotificationLevel,
} from '../types/notification';
import { formatDate } from '../utils/formatters';
import { SendNotificationModal } from './notifications/SendNotificationModal';

function levelColor(level: NotificationLevel): string {
  if (level === 'warning') return 'orange';
  if (level === 'success') return 'green';
  return 'blue';
}

/**
 * What has been sent to extension users, and the way to send more.
 *
 * Per-account notices are usually sent from the account's own drawer; this
 * page is where the global ones are written and where every notice — of both
 * kinds — can be reviewed and withdrawn.
 */
export function NotificationsPage() {
  const { message, modal } = App.useApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [composeOpen, setComposeOpen] = useState(false);

  const fetcher = useCallback(
    () => listNotifications({ skip: (page - 1) * pageSize, limit: pageSize }),
    [page, pageSize],
  );

  const { items, total, loading, reload } =
    useListRequest<ExtAdminNotification>(fetcher);

  function withdraw(row: ExtAdminNotification) {
    modal.confirm({
      title: 'Withdraw this notice?',
      content:
        'It disappears from every panel that has not opened it yet. Already ' +
        'read or not, it is gone.',
      okText: 'Withdraw',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteNotification(row.id);
          void message.success('Withdrawn');
          void reload();
        } catch (err) {
          void message.error(extractApiError(err));
        }
      },
    });
  }

  const columns: ColumnsType<ExtAdminNotification> = [
    {
      title: 'Notice',
      render: (_, row) => (
        <div>
          <Space size={6}>
            <Tag color={levelColor(row.level)}>{row.level}</Tag>
            <strong>{row.title}</strong>
          </Space>
          <div className="cell-sub" style={{ marginTop: 2 }}>
            {row.body}
          </div>
        </div>
      ),
    },
    {
      title: 'Audience',
      width: 200,
      render: (_, row) =>
        row.userId ? (
          <span>{row.userEmail ?? row.userId}</span>
        ) : (
          <Tag color="purple">everyone</Tag>
        ),
    },
    {
      title: 'Opened by',
      width: 100,
      align: 'center',
      render: (_, row) => row.readCount,
    },
    {
      title: 'Shown until',
      width: 160,
      render: (_, row) =>
        row.expiresAt ? (
          formatDate(row.expiresAt)
        ) : (
          <span className="cell-sub">no end</span>
        ),
    },
    {
      title: 'Sent',
      width: 190,
      render: (_, row) => (
        <div>
          <div>{formatDate(row.createdAt)}</div>
          {row.createdBy ? (
            <div className="cell-sub">{row.createdBy}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, row) => (
        <Tooltip title="Withdraw">
          <Button size="small" danger onClick={() => withdraw(row)}>
            Withdraw
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Notices shown inside the extension panel"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<NotificationOutlined />}
              onClick={() => setComposeOpen(true)}
            >
              Notify everyone
            </Button>
          </Space>
        }
      />

      <div className="panel-card">
        <Table
          className="admin-table"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={items.length ? { x: 980 } : undefined}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
            showSizeChanger: true,
            showTotal: (count) => `${count} notices`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
          locale={{ emptyText: 'Nothing sent yet' }}
        />
      </div>

      <SendNotificationModal
        open={composeOpen}
        user={null}
        onClose={() => setComposeOpen(false)}
        onSent={() => void reload()}
      />
    </div>
  );
}
