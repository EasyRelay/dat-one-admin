import {
  App,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
} from 'antd';
import { useEffect, useState } from 'react';
import { usePlansStore } from '../../store/plans.store';
import { formModalProps } from '../../theme/modal';
import {
  defaultFeatures,
  EXT_FEATURE_KEYS,
  EXT_FEATURE_LABELS,
  type ExtFeatureKey,
} from '../../types/features';
import type { ExtPlan } from '../../types/plan';

interface Props {
  open: boolean;
  plan: ExtPlan | null;
  onClose: () => void;
}

interface FormValues {
  code: string;
  name: string;
  description: string;
  price: number;
  currency: 'UZS' | 'USD';
  defaultDurationDays: number;
  isActive: boolean;
  isTrialPlan: boolean;
  trialDays: number;
  features: ExtFeatureKey[];
}

export function PlanFormModal({ open, plan, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const createPlan = usePlansStore((s) => s.createPlan);
  const updatePlan = usePlansStore((s) => s.updatePlan);
  const hydrate = usePlansStore((s) => s.hydrate);
  const [saving, setSaving] = useState(false);
  const isEdit = !!plan;

  useEffect(() => {
    if (!open) return;
    if (plan) {
      form.setFieldsValue({
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        defaultDurationDays: plan.defaultDurationDays,
        isActive: plan.isActive,
        isTrialPlan: plan.trialDays !== null,
        trialDays: plan.trialDays ?? 7,
        features: EXT_FEATURE_KEYS.filter((key) => plan.features[key]),
      });
    } else {
      form.setFieldsValue({
        code: '',
        name: '',
        description: '',
        price: 0,
        currency: 'UZS',
        defaultDurationDays: 30,
        isActive: true,
        isTrialPlan: false,
        trialDays: 7,
        features: EXT_FEATURE_KEYS.filter((key) =>
          ['darkMode', 'leftMenu', 'routeMap'].includes(key),
        ),
      });
    }
  }, [open, plan, form]);

  async function handleSubmit(values: FormValues) {
    const features = defaultFeatures(false);
    for (const key of values.features) features[key] = true;
    // The switch and the number are one field on the wire: null means "not the
    // trial plan", and only one plan may hold it.
    const trialDays = values.isTrialPlan ? values.trialDays : null;

    setSaving(true);
    try {
      if (isEdit && plan) {
        await updatePlan(plan.id, {
          name: values.name,
          description: values.description,
          price: values.price,
          currency: values.currency,
          defaultDurationDays: values.defaultDurationDays,
          isActive: values.isActive,
          trialDays,
          features,
        });
        void message.success('Plan updated');
      } else {
        await createPlan({
          code: values.code.trim().toLowerCase(),
          name: values.name,
          description: values.description,
          price: values.price,
          currency: values.currency,
          defaultDurationDays: values.defaultDurationDays,
          isActive: values.isActive,
          trialDays,
          features,
        });
        void message.success('Plan created');
      }
      // Marking this plan as the trial clears the flag on whichever plan held
      // it before, so the whole list is re-read rather than patched.
      await hydrate();
      onClose();
    } catch (err) {
      void message.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit plan' : 'Create plan'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText={isEdit ? 'Save' : 'Create'}
      width={560}
      destroyOnHidden
      {...formModalProps}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {!isEdit && (
          <Form.Item
            name="code"
            label="Code"
            rules={[
              { required: true },
              { pattern: /^[a-z0-9-]+$/, message: 'lowercase letters, numbers, -' },
            ]}
          >
            <Input placeholder="pro" />
          </Form.Item>
        )}
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="price" label="Price" rules={[{ required: true }]}>
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
          name="defaultDurationDays"
          label="Default duration (days)"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          name="isTrialPlan"
          label="Free trial plan"
          valuePropName="checked"
          extra="Every new account starts on this plan automatically. Only one plan can be the trial — turning it on here turns it off elsewhere."
        >
          <Switch />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(before: FormValues, after: FormValues) =>
            before.isTrialPlan !== after.isTrialPlan
          }
        >
          {({ getFieldValue }) =>
            getFieldValue('isTrialPlan') ? (
              <Form.Item
                name="trialDays"
                label="Trial length (days)"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item
          name="features"
          label="Features"
          rules={[{ required: true, message: 'Pick at least one feature' }]}
        >
          <Checkbox.Group
            options={EXT_FEATURE_KEYS.map((key) => ({
              value: key,
              label: EXT_FEATURE_LABELS[key],
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
