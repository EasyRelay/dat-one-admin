import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Dropdown, Switch, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { usePlansStore } from '../store/plans.store';
import type { ExtPlan } from '../types/plan';
import {
  EXT_FEATURE_LABELS,
  EXT_FEATURE_KEYS,
  type ExtFeatureKey,
  type ExtFeatureMap,
} from '../types/features';
import { formatMoney } from '../utils/formatters';
import { PlanFormModal } from './plans/PlanFormModal';

/**
 * Features this plan takes AWAY compared to having no plan at all.
 *
 * Worth surfacing loudly: while the free baseline still grants everything, a
 * plan that unchecks a feature gives a paying customer less than a stranger —
 * which is exactly what the seeded "Basic" plan used to do with broker credit.
 */
function downgrades(plan: ExtPlan, free: ExtFeatureMap): ExtFeatureKey[] {
  return EXT_FEATURE_KEYS.filter((key) => free[key] && !plan.features[key]);
}

export function PlansPage() {
  const { message, modal } = App.useApp();
  const plans = usePlansStore((s) => s.plans);
  const freeFeatures = usePlansStore((s) => s.freeFeatures);
  const loading = usePlansStore((s) => s.loading);
  const hydrate = usePlansStore((s) => s.hydrate);
  const updatePlan = usePlansStore((s) => s.updatePlan);
  const deletePlan = usePlansStore((s) => s.deletePlan);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExtPlan | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const freeCount = EXT_FEATURE_KEYS.filter((key) => freeFeatures[key]).length;
  const gatingLive = freeCount < EXT_FEATURE_KEYS.length;

  const columns: ColumnsType<ExtPlan> = [
    {
      title: 'Code',
      dataIndex: 'code',
      width: 100,
      render: (code: string) => <Tag color="cyan">{code}</Tag>,
    },
    {
      title: 'Name',
      width: 180,
      ellipsis: true,
      render: (_, row) => {
        const lost = downgrades(row, freeFeatures);
        return (
          <div>
            <div>{row.name}</div>
            {row.trialDays !== null && (
              <Tooltip
                title={`Every new account starts on this plan for ${row.trialDays} day(s)`}
              >
                <Tag color="purple" style={{ marginTop: 4 }}>
                  free trial · {row.trialDays}d
                </Tag>
              </Tooltip>
            )}
            {lost.length > 0 && (
              <Tooltip
                title={`Grants less than a free account: ${lost
                  .map((key) => EXT_FEATURE_LABELS[key])
                  .join(', ')}`}
              >
                <Tag color="red" style={{ marginTop: 4 }}>
                  downgrades access
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Price',
      width: 120,
      render: (_, row) => formatMoney(row.price, row.currency),
    },
    {
      title: 'Days',
      dataIndex: 'defaultDurationDays',
      width: 70,
    },
    {
      title: 'Features',
      ellipsis: true,
      render: (_, row) =>
        EXT_FEATURE_KEYS.filter((key) => row.features[key])
          .map((key) => EXT_FEATURE_LABELS[key])
          .join(', ') || '—',
    },
    {
      title: 'Active',
      width: 80,
      render: (_, row) => (
        <Switch
          checked={row.isActive}
          onChange={async (checked) => {
            try {
              await updatePlan(row.id, { isActive: checked });
            } catch (err) {
              void message.error(
                err instanceof Error ? err.message : 'Update failed',
              );
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
        const items: MenuProps['items'] = [
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
            onClick: () => {
              modal.confirm({
                title: 'Delete plan?',
                content:
                  'Accounts already on it keep the code until their plan is ' +
                  'changed, and it can no longer be sold.',
                okText: 'Delete',
                okButtonProps: { danger: true },
                onOk: async () => {
                  try {
                    await deletePlan(row.id);
                    void message.success('Deleted');
                  } catch (err) {
                    void message.error(
                      err instanceof Error ? err.message : 'Delete failed',
                    );
                  }
                },
              });
            },
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle="What each plan costs and what it unlocks"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New plan
          </Button>
        }
      />

      {!gatingLive && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="Plans do not restrict anything yet"
          description={
            'An account with no plan currently resolves to all ' +
            `${EXT_FEATURE_KEYS.length} features, so a plan can only ever match ` +
            'that or take something away. Trim the free baseline in the backend ' +
            '(EXT_FREE_FEATURES) before pricing features differently.'
          }
        />
      )}

      <div className="panel-card">
        <Table
          className="admin-table"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={plans}
          tableLayout="fixed"
          scroll={plans.length ? { x: 860 } : undefined}
          pagination={false}
        />
      </div>

      <PlanFormModal
        open={formOpen}
        plan={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
