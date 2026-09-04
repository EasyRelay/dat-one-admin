import { App, Form, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { updateDevice } from '../../api/devices.api';
import { extractApiError } from '../../api/client';
import { formModalProps } from '../../theme/modal';
import type { ExtDevice } from '../../types/device';

interface FormValues {
  label: string | null;
  company: string | null;
  note: string | null;
}

interface Props {
  open: boolean;
  device: ExtDevice | null;
  onClose: () => void;
  onSaved: (device: ExtDevice) => void;
}

/**
 * Only the fields an admin owns. The device key, the account it belongs to and
 * the last-seen stamp are all written by the extension itself.
 */
export function EditDeviceModal({ open, device, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !device) return;
    form.setFieldsValue({
      label: device.label,
      company: device.company,
      note: device.note,
    });
  }, [open, device, form]);

  async function handleSubmit(values: FormValues) {
    if (!device) return;
    setSaving(true);
    try {
      const saved = await updateDevice(device.id, {
        label: values.label?.trim() || null,
        company: values.company?.trim() || null,
        note: values.note?.trim() || null,
      });
      void message.success('Device saved');
      onSaved(saved);
      onClose();
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={device ? `Edit ${device.label || device.deviceKey}` : 'Edit device'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText="Save"
      destroyOnHidden
      {...formModalProps}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="label"
          label="Label"
          extra="Shown instead of the device key in every list."
        >
          <Input placeholder="e.g. Office PC" />
        </Form.Item>
        <Form.Item name="company" label="Company">
          <Input />
        </Form.Item>
        <Form.Item name="note" label="Admin note">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
