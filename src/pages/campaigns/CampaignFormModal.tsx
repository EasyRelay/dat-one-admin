import { App, Form, Input, Modal, Switch } from 'antd';
import { useEffect, useState } from 'react';
import { createCampaign, updateCampaign } from '../../api/campaigns.api';
import { extractApiError } from '../../api/client';
import { formModalProps } from '../../theme/modal';
import type { ExtCampaign } from '../../types/campaign';

const STORE_URL =
  'https://chromewebstore.google.com/detail/easy-dat-fraud-check-truc/effcgcdiokabamebngbmdkdnnbdpanfi?hl=en-US&utm_source=ext_sidebar';

interface Props {
  open: boolean;
  campaign: ExtCampaign | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  name: string;
  destinationUrl: string;
  enabled: boolean;
}

export function CampaignFormModal({ open, campaign, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const isEdit = !!campaign;

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      form.setFieldsValue({
        name: campaign.name,
        destinationUrl: campaign.destinationUrl,
        enabled: campaign.enabled,
      });
    } else {
      form.setFieldsValue({
        name: '',
        destinationUrl: STORE_URL,
        enabled: true,
      });
    }
  }, [open, campaign, form]);

  async function handleSubmit(values: FormValues) {
    setSaving(true);
    try {
      if (isEdit && campaign) {
        await updateCampaign(campaign.id, {
          name: values.name.trim(),
          destinationUrl: values.destinationUrl.trim(),
          enabled: values.enabled,
        });
        void message.success('Campaign updated');
      } else {
        await createCampaign({
          name: values.name.trim(),
          destinationUrl: values.destinationUrl.trim(),
          enabled: values.enabled,
        });
        void message.success('Campaign created');
      }
      onSaved();
      onClose();
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      {...formModalProps}
      title={isEdit ? 'Edit campaign' : 'New campaign'}
      open={open}
      onCancel={onClose}
      okText={isEdit ? 'Save' : 'Create'}
      confirmLoading={saving}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void handleSubmit(values)}
      >
        <Form.Item
          name="name"
          label="Name"
          extra="Only you see this. The public link gets a random code."
          rules={[{ required: true, message: 'Give this campaign a name' }]}
        >
          <Input placeholder="Telegram — October, channel A" maxLength={80} />
        </Form.Item>
        <Form.Item
          name="destinationUrl"
          label="Sends people to"
          rules={[
            { required: true, message: 'Enter a destination' },
            { type: 'url', message: 'Enter a full http(s) URL' },
          ]}
        >
          <Input placeholder={STORE_URL} maxLength={2000} />
        </Form.Item>
        <Form.Item name="enabled" label="Counting" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
