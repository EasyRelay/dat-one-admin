import {
  CopyOutlined,
  MoreOutlined,
  PieChartOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { App, Button, Dropdown, Space, Switch, Table, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import {
  campaignPublicUrl,
  deleteCampaign,
  listCampaigns,
  updateCampaign,
} from '../api/campaigns.api';
import { extractApiError } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useListRequest } from '../hooks/useListRequest';
import type { ExtCampaign } from '../types/campaign';
import { formatDayTime } from '../utils/formatters';
import { CampaignChartsModal } from './campaigns/CampaignChartsModal';
import { CampaignFormModal } from './campaigns/CampaignFormModal';

export function CampaignsPage() {
  const { message, modal } = App.useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [editing, setEditing] = useState<ExtCampaign | null>(null);

  const fetcher = useCallback(async () => {
    const rows = await listCampaigns();
    return { items: rows, total: rows.length };
  }, []);
  const { items, loading, reload } = useListRequest<ExtCampaign>(fetcher);

  async function copyLink(slug: string) {
    const url = campaignPublicUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      void message.success('Link copied');
    } catch {
      void message.error(url);
    }
  }

  function confirmDelete(row: ExtCampaign) {
    modal.confirm({
      title: 'Delete this campaign?',
      content:
        'The link stops counting. Anyone who still opens it is sent to the Chrome Web Store.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteCampaign(row.id);
          void message.success('Deleted');
          void reload();
        } catch (err) {
          void message.error(extractApiError(err));
        }
      },
    });
  }

  const columns: ColumnsType<ExtCampaign> = [
    {
      title: 'Campaign',
      render: (_, row) => (
        <div>
          <strong>
            {row.name} ({row.slug})
          </strong>
          <div
            className="cell-sub"
            title={row.destinationUrl}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.destinationUrl}
          </div>
        </div>
      ),
    },
    {
      title: 'Link',
      width: 88,
      render: (_, row) => (
        <Tooltip title={campaignPublicUrl(row.slug)}>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => void copyLink(row.slug)}
          >
            Copy
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Clicks',
      width: 90,
      align: 'right',
      render: (_, row) => row.clickCount,
    },
    {
      title: 'Unique',
      width: 90,
      align: 'right',
      render: (_, row) => row.uniqueClickCount,
    },
    {
      title: 'Installs',
      width: 90,
      align: 'right',
      render: (_, row) => row.installCount ?? 0,
    },
    {
      title: 'Last click',
      width: 160,
      render: (_, row) =>
        row.lastClickAt ? (
          formatDayTime(row.lastClickAt)
        ) : (
          <span className="cell-sub">none yet</span>
        ),
    },
    {
      title: 'On',
      width: 70,
      render: (_, row) => (
        <Switch
          checked={row.enabled}
          onChange={async (checked) => {
            try {
              await updateCampaign(row.id, { enabled: checked });
              void reload();
            } catch (err) {
              void message.error(extractApiError(err));
            }
          }}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      render: (_, row) => {
        const menu: MenuProps['items'] = [
          {
            key: 'edit',
            label: 'Edit',
            onClick: () => {
              setEditing(row);
              setFormOpen(true);
            },
          },
          {
            key: 'delete',
            label: 'Delete',
            danger: true,
            onClick: () => confirmDelete(row),
          },
        ];
        return (
          <Dropdown menu={{ items: menu }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Campaign links"
        subtitle="One link per ad. Clicks count visits. Installs count people who add the extension after opening that link."
        extra={
          <Space>
            <Button
              icon={<PieChartOutlined />}
              onClick={() => setChartsOpen(true)}
            >
              Diagrams
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New campaign
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
          scroll={items.length ? { x: 950 } : undefined}
          pagination={false}
          locale={{ emptyText: 'No campaign links yet' }}
        />
      </div>

      <CampaignFormModal
        open={formOpen}
        campaign={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
      />
      <CampaignChartsModal
        open={chartsOpen}
        campaigns={items}
        onClose={() => setChartsOpen(false)}
      />
    </div>
  );
}
