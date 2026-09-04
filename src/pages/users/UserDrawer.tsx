import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Segmented,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { listDevices } from '../../api/devices.api';
import { listPayments } from '../../api/payments.api';
import {
  getUser,
  logoutUserEverywhere,
  revokePlan,
  updateUser,
} from '../../api/users.api';
import { extractApiError } from '../../api/client';
import { usePlansStore } from '../../store/plans.store';
import type { ExtDevice } from '../../types/device';
import {
  EXT_FEATURE_KEYS,
  EXT_FEATURE_LABELS,
  type ExtFeatureKey,
  type ExtFeatureMap,
} from '../../types/features';
import type { ExtPayment } from '../../types/payment';
import type { ExtUser } from '../../types/user';
import { formatDate, formatMoney, planStatus } from '../../utils/formatters';
import { GrantPlanModal } from './GrantPlanModal';

/** `undefined` = follow the plan. The plan itself only knows on/off. */
type OverrideValue = 'inherit' | 'on' | 'off';

interface AccountFormValues {
  name: string | null;
  note: string | null;
  isActive: boolean;
  removed: boolean;
}

interface Props {
  open: boolean;
  user: ExtUser | null;
  onClose: () => void;
  /** Called whenever anything about the account changed on the server. */
  onChanged: (user: ExtUser) => void;
}

function toOverrideValue(value: boolean | undefined): OverrideValue {
  if (value === true) return 'on';
  if (value === false) return 'off';
  return 'inherit';
}

export function UserDrawer({ open, user, onClose, onChanged }: Props) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<AccountFormValues>();
  const plans = usePlansStore((s) => s.plans);
  const freeFeatures = usePlansStore((s) => s.freeFeatures);

  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<
    Partial<Record<ExtFeatureKey, boolean>>
  >({});
  const [grantOpen, setGrantOpen] = useState(false);
  const [payments, setPayments] = useState<ExtPayment[]>([]);
  const [devices, setDevices] = useState<ExtDevice[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const loadRelated = useCallback(
    async (userId: string) => {
      setRelatedLoading(true);
      try {
        const [paymentPage, devicePage] = await Promise.all([
          listPayments({ userId, limit: 20 }),
          listDevices({ userId, limit: 20 }),
        ]);
        setPayments(paymentPage.items);
        setDevices(devicePage.items);
      } catch (err) {
        void message.error(extractApiError(err));
      } finally {
        setRelatedLoading(false);
      }
    },
    [message],
  );

  // Overrides are edited locally until Save, so they are re-seeded whenever the
  // drawer opens on a different account — during render, so the previous
  // account's toggles never flash.
  const shownUserId = open ? (user?.id ?? null) : null;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (shownUserId !== seededFor) {
    setSeededFor(shownUserId);
    setOverrides({ ...(user?.featureOverrides ?? {}) });
  }

  useEffect(() => {
    if (!open || !user) return;
    form.setFieldsValue({
      name: user.name,
      note: user.note,
      isActive: user.isActive,
      removed: user.removed,
    });
    // Same shape as every list screen: the spinner flips synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRelated(user.id);
  }, [open, user, form, loadRelated]);

  if (!user) return null;

  const plan = plans.find((row) => row.code === user.plan) ?? null;
  // What the account would get from its plan alone, before overrides. No plan
  // (or an expired one) falls back to the free baseline — which today is still
  // everything, so an override is currently the only thing that changes access.
  const planFeatures: ExtFeatureMap =
    plan && planStatus(user.planExpiresAt) !== 'expired'
      ? plan.features
      : freeFeatures;

  async function handleSaveAccount(values: AccountFormValues) {
    if (!user) return;
    setSaving(true);
    try {
      const hasOverrides = Object.keys(overrides).length > 0;
      const saved = await updateUser(user.id, {
        name: values.name?.trim() || null,
        note: values.note?.trim() || null,
        isActive: values.isActive,
        removed: values.removed,
        featureOverrides: hasOverrides ? overrides : null,
      });
      void message.success('Account saved');
      onChanged(saved);
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  /**
   * A payment writes the plan onto the ACCOUNT, so the row the list handed us
   * is stale the moment one is created — re-read it rather than guessing.
   */
  async function handlePlanGranted() {
    if (!user) return;
    try {
      const [saved] = await Promise.all([getUser(user.id), loadRelated(user.id)]);
      onChanged(saved);
    } catch (err) {
      void message.error(extractApiError(err));
    }
  }

  function handleRevokePlan() {
    if (!user) return;
    modal.confirm({
      title: 'Revoke plan?',
      content:
        'The account drops to free access immediately. Payment history is kept.',
      okText: 'Revoke',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const saved = await revokePlan(user.id);
          void message.success('Plan revoked');
          onChanged(saved);
        } catch (err) {
          void message.error(extractApiError(err));
        }
      },
    });
  }

  function handleLogoutEverywhere() {
    if (!user) return;
    modal.confirm({
      title: 'Sign out every device?',
      content: 'Every install of this account has to sign in again.',
      okText: 'Sign out',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await logoutUserEverywhere(user.id);
          void message.success('All devices signed out');
        } catch (err) {
          void message.error(extractApiError(err));
        }
      },
    });
  }

  // Which payment the account is actually running on — the same rule the
  // backend derives the plan with. Shown so "why does this account have that
  // plan?" is answerable from the ledger instead of guessed.
  const currentPaymentId = payments
    .filter((row) => row.status === 'paid')
    .reduce<ExtPayment | null>((best, row) => {
      const at = new Date(row.appliedAt ?? row.createdAt).getTime();
      const bestAt = best
        ? new Date(best.appliedAt ?? best.createdAt).getTime()
        : -Infinity;
      return at > bestAt ? row : best;
    }, null)?.id;

  const paymentColumns: ColumnsType<ExtPayment> = [
    { title: 'Date', render: (_, row) => formatDate(row.createdAt), width: 150 },
    {
      title: 'Plan',
      width: 110,
      render: (_, row) => (
        <Space size={4} wrap>
          <span>{row.plan}</span>
          {row.kind === 'trial' && <Tag color="purple">trial</Tag>}
        </Space>
      ),
    },
    {
      title: 'Amount',
      width: 120,
      render: (_, row) => formatMoney(row.amount, row.currency),
    },
    {
      title: 'Status',
      width: 140,
      render: (_, row) => (
        <Space size={4}>
          <Tag color={row.status === 'paid' ? 'green' : 'default'}>
            {row.status}
          </Tag>
          {row.id === currentPaymentId && <Tag color="blue">in effect</Tag>}
        </Space>
      ),
    },
    {
      title: 'Until',
      width: 150,
      render: (_, row) => formatDate(row.appliedPlanExpiresAt),
    },
  ];

  const deviceColumns: ColumnsType<ExtDevice> = [
    {
      title: 'Device',
      render: (_, row) => row.label || row.deviceKey.slice(0, 8),
    },
    {
      title: 'Status',
      width: 90,
      render: (_, row) => (
        <Tag color={row.status === 'active' ? 'green' : 'default'}>
          {row.status}
        </Tag>
      ),
    },
    {
      title: 'Last seen',
      width: 150,
      render: (_, row) => formatDate(row.lastSeenAt),
    },
  ];

  const status = planStatus(user.planExpiresAt);

  return (
    <>
      <Drawer
        title={user.email}
        open={open}
        onClose={onClose}
        size={620}
        destroyOnHidden
      >
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="Name">{user.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Signed up via">
            <Tag>{user.createdVia}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {formatDate(user.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Last seen">
            {formatDate(user.lastSeenAt)}
          </Descriptions.Item>
        </Descriptions>

        <Divider titlePlacement="start">Plan</Divider>
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Space wrap>
            {user.plan ? (
              <Tag color="cyan">{plan?.name ?? user.plan}</Tag>
            ) : (
              <Tag>No plan</Tag>
            )}
            {user.plan && (
              <Tag
                color={
                  status === 'expired'
                    ? 'red'
                    : status === 'soon'
                      ? 'orange'
                      : status === 'never'
                        ? 'blue'
                        : 'green'
                }
              >
                {status === 'never'
                  ? 'no end date'
                  : `until ${formatDate(user.planExpiresAt)}`}
              </Tag>
            )}
          </Space>
          <Space>
            <Button type="primary" onClick={() => setGrantOpen(true)}>
              {user.plan ? 'Renew or change plan' : 'Grant plan'}
            </Button>
            {user.plan && (
              <Button danger onClick={handleRevokePlan}>
                Revoke plan
              </Button>
            )}
          </Space>
        </Space>

        <Divider titlePlacement="start">Feature access</Divider>
        {!user.isActive || user.removed ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            title="Account is disabled — every feature is off regardless of the plan."
          />
        ) : null}
        <div className="feature-grid">
          {EXT_FEATURE_KEYS.map((key) => {
            const override = overrides[key];
            const effective =
              !user.isActive || user.removed
                ? false
                : (override ?? planFeatures[key]);
            return (
              <div className="feature-row" key={key}>
                <span className="feature-name">
                  {EXT_FEATURE_LABELS[key]}
                  <Tooltip
                    title={
                      override === undefined
                        ? 'Follows the plan'
                        : 'Overridden for this account'
                    }
                  >
                    <Tag
                      color={effective ? 'green' : 'default'}
                      style={{ marginLeft: 8 }}
                    >
                      {effective ? 'on' : 'off'}
                    </Tag>
                  </Tooltip>
                </span>
                <Segmented
                  size="small"
                  value={toOverrideValue(override)}
                  options={[
                    { value: 'inherit', label: 'Plan' },
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' },
                  ]}
                  onChange={(value) => {
                    setOverrides((prev) => {
                      const next = { ...prev };
                      if (value === 'inherit') delete next[key];
                      else next[key] = value === 'on';
                      return next;
                    });
                  }}
                />
              </div>
            );
          })}
        </div>

        <Divider titlePlacement="start">Account</Divider>
        <Form form={form} layout="vertical" onFinish={handleSaveAccount}>
          <Form.Item name="name" label="Name">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Admin note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size={32}>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="removed" label="Removed" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save account
              </Button>
              <Button danger onClick={handleLogoutEverywhere}>
                Sign out everywhere
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Divider titlePlacement="start">Payments</Divider>
        <Spin spinning={relatedLoading}>
          <Table
            className="admin-table"
            size="small"
            rowKey="id"
            columns={paymentColumns}
            dataSource={payments}
            pagination={false}
            locale={{ emptyText: 'No payments yet' }}
          />

          <Divider titlePlacement="start">Devices</Divider>
          <Table
            className="admin-table"
            size="small"
            rowKey="id"
            columns={deviceColumns}
            dataSource={devices}
            pagination={false}
            locale={{ emptyText: 'No devices yet' }}
          />
        </Spin>
      </Drawer>

      <GrantPlanModal
        open={grantOpen}
        user={user}
        onClose={() => setGrantOpen(false)}
        onDone={() => {
          setGrantOpen(false);
          void handlePlanGranted();
        }}
      />
    </>
  );
}
