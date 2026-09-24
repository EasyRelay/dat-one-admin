import { NotificationOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Space,
  Spin,
  Table,
  Tabs,
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
  purgeUser,
  revokePlan,
  updateUser,
} from '../../api/users.api';
import { extractApiError } from '../../api/client';
import { usePlansStore } from '../../store/plans.store';
import type { ExtDevice } from '../../types/device';
import {
  EXT_FEATURE_KEYS,
  EXT_FEATURE_LABELS,
  type ExtFeatureMap,
} from '../../types/features';
import type { ExtPayment } from '../../types/payment';
import type { ExtUser } from '../../types/user';
import { formatDate, formatMoney, planStatus } from '../../utils/formatters';
import { SendNotificationModal } from '../notifications/SendNotificationModal';
import { FeatureAccessModal } from './FeatureAccessModal';
import { GrantPlanModal } from './GrantPlanModal';

interface DetailsFormValues {
  name: string | null;
  note: string | null;
}

interface Props {
  open: boolean;
  user: ExtUser | null;
  onClose: () => void;
  /** Called whenever anything about the account changed on the server. */
  onChanged: (user: ExtUser) => void;
  /** Called after a permanent delete — the row no longer exists anywhere. */
  onDeleted?: (userId: string) => void;
}

export function UserDrawer({
  open,
  user,
  onClose,
  onChanged,
  onDeleted,
}: Props) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<DetailsFormValues>();
  const plans = usePlansStore((s) => s.plans);
  const freeFeatures = usePlansStore((s) => s.freeFeatures);

  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
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

  useEffect(() => {
    if (!open || !user) return;
    form.setFieldsValue({ name: user.name, note: user.note });
    // Same shape as every list screen: the spinner flips synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRelated(user.id);
  }, [open, user, form, loadRelated]);

  if (!user) return null;

  const plan = plans.find((row) => row.code === user.plan) ?? null;
  // What the account would get from its plan alone, before overrides. No plan
  // (or an expired one) falls back to the free baseline.
  const planFeatures: ExtFeatureMap =
    plan && planStatus(user.planExpiresAt) !== 'expired'
      ? plan.features
      : freeFeatures;

  const status = planStatus(user.planExpiresAt);
  const featuresOn = EXT_FEATURE_KEYS.filter((key) => user.features[key]);
  const overrideCount = Object.keys(user.featureOverrides ?? {}).length;

  async function runAction(
    action: () => Promise<ExtUser>,
    success: string,
  ): Promise<void> {
    setBusy(true);
    try {
      const saved = await action();
      void message.success(success);
      onChanged(saved);
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDetails(values: DetailsFormValues) {
    if (!user) return;
    setSaving(true);
    try {
      const saved = await updateUser(user.id, {
        name: values.name?.trim() || null,
        note: values.note?.trim() || null,
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
    const id = user.id;
    modal.confirm({
      title: 'Revoke plan?',
      content:
        'The account drops to free access immediately. Payment history is kept.',
      okText: 'Revoke',
      okButtonProps: { danger: true },
      onOk: () => runAction(() => revokePlan(id), 'Plan revoked'),
    });
  }

  function handleLogoutEverywhere() {
    if (!user) return;
    const id = user.id;
    modal.confirm({
      title: 'Sign out every device?',
      content: 'Every install of this account has to sign in again.',
      okText: 'Sign out',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await logoutUserEverywhere(id);
          void message.success('All devices signed out');
        } catch (err) {
          void message.error(extractApiError(err));
        }
      },
    });
  }

  function handleToggleActive() {
    if (!user) return;
    const { id, isActive } = user;
    modal.confirm({
      title: isActive ? 'Disable this account?' : 'Enable this account?',
      content: isActive
        ? 'Every feature switches off and the extension stops working on the next request. The account and its history stay.'
        : 'The account can sign in and use whatever its plan grants again.',
      okText: isActive ? 'Disable' : 'Enable',
      okButtonProps: { danger: isActive },
      onOk: () =>
        runAction(
          () => updateUser(id, { isActive: !isActive }),
          isActive ? 'Account disabled' : 'Account enabled',
        ),
    });
  }

  function handleArchive() {
    if (!user) return;
    const id = user.id;
    modal.confirm({
      title: 'Archive this account?',
      content:
        'It moves to the Archive and is disabled — the extension stops working for it. Nothing is deleted, and you can restore it at any time.',
      okText: 'Archive',
      okButtonProps: { danger: true },
      onOk: () =>
        runAction(() => updateUser(id, { removed: true }), 'Account archived'),
    });
  }

  function handleRestore() {
    if (!user) return;
    const id = user.id;
    modal.confirm({
      title: 'Restore this account?',
      content:
        'It comes back to the accounts list. It stays disabled until you enable it, so nobody regains access by accident.',
      okText: 'Restore',
      onOk: () =>
        runAction(() => updateUser(id, { removed: false }), 'Account restored'),
    });
  }

  /**
   * The one irreversible action in the panel, so it asks for the address to be
   * typed rather than for one more click on a button that is already there.
   */
  function handleDeleteForever() {
    if (!user) return;
    const { id, email } = user;
    let typed = '';
    modal.confirm({
      title: 'Delete permanently?',
      width: 480,
      okText: 'Delete forever',
      okButtonProps: { danger: true },
      content: (
        <div>
          <p style={{ marginTop: 0 }}>
            This erases the account together with its payments, devices and
            notices. It cannot be undone, and the ledger loses the money this
            account ever paid.
          </p>
          <p>
            Type <strong>{email}</strong> to confirm:
          </p>
          <Input
            placeholder={email}
            onChange={(e) => {
              typed = e.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        if (typed.trim().toLowerCase() !== email.toLowerCase()) {
          void message.error('The address does not match — nothing was deleted');
          return Promise.reject(new Error('confirmation mismatch'));
        }
        try {
          const result = await purgeUser(id);
          void message.success(
            `${result.email} deleted — ${result.payments} payment(s), ${result.devices} device(s) removed`,
          );
          onDeleted?.(id);
          onClose();
        } catch (err) {
          void message.error(extractApiError(err));
          return Promise.reject(err instanceof Error ? err : new Error('failed'));
        }
        return undefined;
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
      render: formatDate,
      dataIndex: 'lastSeenAt',
    },
  ];

  const overview = (
    <Space orientation="vertical" size={20} style={{ width: '100%' }}>
      {user.removed ? (
        <Alert
          type="warning"
          showIcon
          title="This account is archived"
          description="It is disabled and cannot sign in. Restore it to bring it back, or delete it permanently below."
        />
      ) : !user.isActive ? (
        <Alert
          type="warning"
          showIcon
          title="This account is disabled"
          description="Every feature is off regardless of its plan, and the extension stops on its next request."
        />
      ) : null}

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

      <section>
        <p className="drawer-section-title">Plan</p>
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
          <Space wrap>
            <Button type="primary" onClick={() => setGrantOpen(true)}>
              {user.plan ? 'Renew or change plan' : 'Grant plan'}
            </Button>
            {user.plan && (
              <Button danger onClick={handleRevokePlan} disabled={busy}>
                Revoke plan
              </Button>
            )}
          </Space>
        </Space>
      </section>

      <section>
        <p className="drawer-section-title">Feature access</p>
        <div className="drawer-inline-row">
          <Space size={6} wrap>
            <Tooltip
              title={
                featuresOn.length
                  ? featuresOn.map((key) => EXT_FEATURE_LABELS[key]).join(', ')
                  : 'No features'
              }
            >
              <Tag color={featuresOn.length ? 'green' : 'red'}>
                {featuresOn.length}/{EXT_FEATURE_KEYS.length} on
              </Tag>
            </Tooltip>
            {overrideCount > 0 ? (
              <Tag color="purple">{overrideCount} custom</Tag>
            ) : (
              <span className="cell-sub">follows the plan</span>
            )}
          </Space>
          <Button onClick={() => setAccessOpen(true)}>Manage access</Button>
        </div>
      </section>

      <section>
        <p className="drawer-section-title">Notifications</p>
        <div className="drawer-inline-row">
          <span className="cell-sub">
            Send a message only this account sees, in the extension panel and
            on its account page.
          </span>
          <Button
            icon={<NotificationOutlined />}
            onClick={() => setNotifyOpen(true)}
            disabled={user.removed}
          >
            Send notification
          </Button>
        </div>
      </section>

      <section>
        <p className="drawer-section-title">Details</p>
        <Form form={form} layout="vertical" onFinish={handleSaveDetails}>
          <Form.Item name="name" label="Name">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Admin note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save details
            </Button>
          </Form.Item>
        </Form>
      </section>

      <section>
        <p className="drawer-section-title">Account status</p>
        <div className="drawer-danger-zone">
          {user.removed ? (
            <>
              <div className="drawer-inline-row">
                <span className="cell-sub">
                  Bring this account back to the accounts list. It stays
                  disabled until you enable it.
                </span>
                <Button type="primary" onClick={handleRestore} disabled={busy}>
                  Restore
                </Button>
              </div>
              <div className="drawer-inline-row">
                <span className="cell-sub">
                  Erase the account, its payments, devices and notices. This
                  cannot be undone.
                </span>
                <Button danger type="primary" onClick={handleDeleteForever}>
                  Delete permanently
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="drawer-inline-row">
                <span className="cell-sub">
                  {user.isActive
                    ? 'Switch the account off without archiving it — useful while something is being sorted out.'
                    : 'Let this account sign in and use its plan again.'}
                </span>
                <Button onClick={handleToggleActive} disabled={busy}>
                  {user.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
              <div className="drawer-inline-row">
                <span className="cell-sub">
                  Move the account to the Archive. It is disabled there and can
                  be restored or deleted for good.
                </span>
                <Button danger onClick={handleArchive} disabled={busy}>
                  Archive
                </Button>
              </div>
            </>
          )}
          <div className="drawer-inline-row">
            <span className="cell-sub">
              Invalidate every token, so all installs have to sign in again.
            </span>
            <Button danger onClick={handleLogoutEverywhere}>
              Sign out everywhere
            </Button>
          </div>
        </div>
      </section>
    </Space>
  );

  return (
    <>
      <Drawer
        title={
          <Space size={8} wrap>
            <span>{user.email}</span>
            {user.removed ? (
              <Tag>archived</Tag>
            ) : (
              <Tag color={user.isActive ? 'green' : 'red'}>
                {user.isActive ? 'active' : 'disabled'}
              </Tag>
            )}
          </Space>
        }
        open={open}
        onClose={onClose}
        size={620}
        destroyOnHidden
      >
        {/* Tabs rather than one long scroll: payments and devices are reference
            material, and unfolding all three at once buried the controls. */}
        <Tabs
          defaultActiveKey="overview"
          items={[
            { key: 'overview', label: 'Overview', children: overview },
            {
              key: 'payments',
              label: `Payments${payments.length ? ` (${payments.length})` : ''}`,
              children: (
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
                </Spin>
              ),
            },
            {
              key: 'devices',
              label: `Devices${devices.length ? ` (${devices.length})` : ''}`,
              children: (
                <Spin spinning={relatedLoading}>
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
              ),
            },
          ]}
        />
      </Drawer>

      <FeatureAccessModal
        open={accessOpen}
        user={user}
        planFeatures={planFeatures}
        onClose={() => setAccessOpen(false)}
        onSaved={onChanged}
      />

      <SendNotificationModal
        open={notifyOpen}
        user={user}
        onClose={() => setNotifyOpen(false)}
        onSent={() => undefined}
      />

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
