import {
  Alert,
  App,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { createPayment } from '../../api/payments.api';
import { extractApiError } from '../../api/client';
import { usePlansStore } from '../../store/plans.store';
import { formModalProps } from '../../theme/modal';
import type { Currency } from '../../types/plan';
import type { ExtPayment, PaymentStatus } from '../../types/payment';
import type { ExtUser } from '../../types/user';
import { formatDate } from '../../utils/formatters';

type TermMode = 'days' | 'date';

interface FormValues {
  email?: string;
  plan: string;
  termMode: TermMode;
  durationDays: number;
  expiresAt: dayjs.Dayjs;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  note?: string;
}

interface Props {
  open: boolean;
  /** Fixed account, or null to ask for an email (the payments ledger case). */
  user: ExtUser | null;
  onClose: () => void;
  onDone: (payment: ExtPayment) => void;
}

/**
 * The one way a plan is granted.
 *
 * Selling and recording are the same action here on purpose: the admin panel
 * used to let a plan be set straight on the account, which left the payment
 * ledger describing a different reality from the account itself.
 */
/**
 * Ties the modal's own footer to the form inside it.
 *
 * The buttons used to live in the form body, which put them inside the part
 * that scrolls — on a short window they went off the bottom of the screen with
 * the rest of the fields. Submitting through the HTML `form` attribute keeps
 * the form instance (and the clock the preview is anchored to) inside the
 * remounting child while the buttons stay in the fixed footer.
 */
const FORM_ID = 'grant-plan-form';

export function GrantPlanModal({ open, user, onClose, onDone }: Props) {
  const renewing = !!user?.plan;
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={
        user
          ? `${renewing ? 'Renew or change plan' : 'Grant plan'} — ${user.email}`
          : 'New payment'
      }
      open={open}
      onCancel={onClose}
      okText={renewing ? 'Renew' : 'Grant'}
      okButtonProps={{ htmlType: 'submit', form: FORM_ID, loading: saving }}
      width={520}
      destroyOnHidden
      {...formModalProps}
    >
      {/* Mounted fresh on every open, so the form, the term mode and the clock
          the preview is anchored to all start clean without reset logic. */}
      {open && (
        <GrantPlanForm
          user={user}
          onClose={onClose}
          onDone={onDone}
          renewing={renewing}
          onSavingChange={setSaving}
        />
      )}
    </Modal>
  );
}

function GrantPlanForm({
  user,
  onClose,
  onDone,
  renewing,
  onSavingChange,
}: Omit<Props, 'open'> & {
  renewing: boolean;
  onSavingChange: (saving: boolean) => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const plans = usePlansStore((s) => s.plans);
  const [termMode, setTermMode] = useState<TermMode>('days');
  // Frozen at mount: the preview only needs "now" once, and reading the clock
  // while rendering would make the component impure.
  const [openedAt] = useState(() => Date.now());

  const activePlans = plans.filter((plan) => plan.isActive);

  // Watched rather than copied into state on change, so the preview is correct
  // on the very first render for an account that already has a plan.
  const selectedPlan = Form.useWatch('plan', form);
  const durationDays = Form.useWatch('durationDays', form);

  /**
   * Mirrors the backend rule so the admin sees the term before committing:
   * renewing the SAME plan adds to the time left, switching plans starts now.
   */
  const preview =
    selectedPlan && durationDays
      ? dayjs(
          user?.plan === selectedPlan && user.planExpiresAt
            ? Math.max(openedAt, new Date(user.planExpiresAt).getTime())
            : openedAt,
        )
          .add(durationDays, 'day')
          .toISOString()
      : null;

  async function handleSubmit(values: FormValues) {
    onSavingChange(true);
    try {
      const payment = await createPayment({
        userId: user?.id,
        email: user ? undefined : values.email?.trim(),
        amount: values.amount,
        currency: values.currency,
        plan: values.plan,
        durationDays:
          values.termMode === 'days' ? values.durationDays : undefined,
        expiresAt:
          values.termMode === 'date'
            ? values.expiresAt.toISOString()
            : undefined,
        status: values.status,
        note: values.note?.trim() || undefined,
      });
      void message.success(
        values.status === 'paid' ? 'Plan granted' : 'Pending payment created',
      );
      onDone(payment);
      onClose();
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <Form
      id={FORM_ID}
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        plan: user?.plan ?? undefined,
        termMode: 'days',
        durationDays: 30,
        expiresAt: dayjs().add(30, 'day'),
        amount: 0,
        currency: 'UZS',
        status: 'paid',
      }}
    >
      {!user && (
        <Form.Item
          name="email"
          label="Account email"
          rules={[
            { required: true, message: 'Email required' },
            { type: 'email', message: 'Invalid email' },
          ]}
        >
          <Input placeholder="user@example.com" />
        </Form.Item>
      )}

      <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
        <Select
          placeholder={activePlans.length ? 'Select a plan' : 'No active plans'}
          options={activePlans.map((plan) => ({
            value: plan.code,
            label: `${plan.name} (${plan.code})`,
          }))}
          onChange={(code: string) => {
            const plan = plans.find((row) => row.code === code);
            if (!plan) return;
            form.setFieldsValue({
              amount: plan.price,
              currency: plan.currency,
              durationDays: plan.defaultDurationDays,
              expiresAt: dayjs().add(plan.defaultDurationDays, 'day'),
            });
          }}
        />
      </Form.Item>

      <Form.Item name="termMode" label="Term">
        <Segmented
          options={[
            { value: 'days', label: 'Add days' },
            { value: 'date', label: 'Exact end date' },
          ]}
          onChange={(value) => setTermMode(value === 'date' ? 'date' : 'days')}
        />
      </Form.Item>

      {termMode === 'days' ? (
        <Form.Item
          name="durationDays"
          label="Days"
          rules={[{ required: true }]}
          extra={
            renewing
              ? 'Renewing the same plan adds these days to the time left.'
              : undefined
          }
        >
          <InputNumber min={1} max={3650} style={{ width: '100%' }} />
        </Form.Item>
      ) : (
        <Form.Item
          name="expiresAt"
          label="Plan ends"
          rules={[{ required: true }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      )}

      {termMode === 'days' && preview && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`Plan will run until ${formatDate(preview)}`}
        />
      )}

      <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
        <Select
          options={[
            { value: 'UZS', label: 'UZS' },
            { value: 'USD', label: 'USD' },
          ]}
        />
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        extra="Pending records the sale without granting the plan yet; mark it paid from Payments."
      >
        <Select
          options={[
            { value: 'paid', label: 'Paid — grant the plan now' },
            { value: 'pending', label: 'Pending — do not grant yet' },
          ]}
        />
      </Form.Item>

      <Form.Item name="note" label="Note">
        <Input.TextArea
          rows={2}
          placeholder="e.g. free trial, bank transfer #123"
        />
      </Form.Item>

    </Form>
  );
}
