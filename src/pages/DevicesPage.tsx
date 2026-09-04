import {
  DeleteOutlined,
  EditOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { App, Button, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import {
  activateDevice,
  deactivateDevice,
  deleteDevice,
  listDevices,
} from '../api/devices.api';
import { extractApiError } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useListRequest } from '../hooks/useListRequest';
import type { ExtDevice, ExtDeviceStatus } from '../types/device';
import { formatDate } from '../utils/formatters';
import { EditDeviceModal } from './devices/EditDeviceModal';

function shortKey(key: string): string {
  if (key.length <= 10) return key;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * Rows here are written by the extension when an install signs in — there is
 * no "add device": a row an admin invented carries a key no install would ever
 * send, so it could never bind to anything real.
 */
export function DevicesPage() {
  const { message, modal } = App.useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ExtDeviceStatus | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<ExtDevice | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const fetcher = useCallback(
    () =>
      listDevices({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        status,
      }),
    [debouncedSearch, page, pageSize, status],
  );

  const { items, total, loading, reload, setItems } =
    useListRequest<ExtDevice>(fetcher);

  function replaceRow(updated: ExtDevice) {
    setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  }

  function toggleStatus(row: ExtDevice) {
    const next = row.status === 'active' ? 'inactive' : 'active';
    modal.confirm({
      title: next === 'inactive' ? 'Deactivate device?' : 'Activate device?',
      content:
        next === 'inactive'
          ? 'This install is signed out on its next request.'
          : 'This install may use the account again.',
      okButtonProps: next === 'inactive' ? { danger: true } : undefined,
      onOk: async () => {
        try {
          replaceRow(
            next === 'inactive'
              ? await deactivateDevice(row.id)
              : await activateDevice(row.id),
          );
          void message.success(
            next === 'inactive' ? 'Device deactivated' : 'Device activated',
          );
        } catch (err) {
          void message.error(extractApiError(err));
        }
      },
    });
  }

  function removeRow(row: ExtDevice) {
    modal.confirm({
      title: 'Delete device row?',
      content:
        'Only the record goes. If the install signs in again it registers itself ' +
        'from scratch — deactivate instead to actually block it.',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDevice(row.id);
          void message.success('Device deleted');
          void reload();
        } catch (err) {
          void message.error(extractApiError(err));
        }
      },
    });
  }

  const columns: ColumnsType<ExtDevice> = [
    {
      title: 'Device',
      width: 180,
      render: (_, row) => (
        <div>
          <div>{row.label || <span className="cell-sub">unnamed</span>}</div>
          <Tooltip title={row.deviceKey}>
            <code className="cell-sub">{shortKey(row.deviceKey)}</code>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Account',
      dataIndex: 'userEmail',
      ellipsis: true,
      width: 220,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (value: ExtDeviceStatus) => (
        <Tag color={value === 'active' ? 'green' : 'default'}>{value}</Tag>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      width: 130,
      render: (value: string | null) => value || <span className="cell-sub">—</span>,
    },
    {
      title: 'Last seen',
      dataIndex: 'lastSeenAt',
      width: 150,
      render: formatDate,
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, row) => (
        <Space size={0}>
          <Tooltip title="Edit label / note">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditing(row)}
            />
          </Tooltip>
          <Tooltip title={row.status === 'active' ? 'Deactivate' : 'Activate'}>
            <Button
              type="text"
              size="small"
              danger={row.status === 'active'}
              icon={<PoweroffOutlined />}
              onClick={() => toggleStatus(row)}
            />
          </Tooltip>
          <Tooltip title="Delete row">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeRow(row)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Devices"
        subtitle="Browser installs that have signed in to an extension account"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      <div className="panel-card">
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search email, key or label"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={{ width: 300 }}
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
              { value: 'inactive', label: 'Inactive' },
            ]}
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
          scroll={items.length ? { x: 890 } : undefined}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
            showSizeChanger: true,
            showTotal: (count) => `${count} devices`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </div>

      <EditDeviceModal
        open={!!editing}
        device={editing}
        onClose={() => setEditing(null)}
        onSaved={replaceRow}
      />
    </div>
  );
}
