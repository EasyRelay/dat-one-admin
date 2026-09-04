import { Alert, App, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { createNotification } from '../../api/notifications.api';
import { extractApiError } from '../../api/client';
import { formModalProps } from '../../theme/modal';
import type {
  ExtAdminNotification,
  NotificationLevel,
} from '../../types/notification';
import type { ExtUser } from '../../types/user';

const FORM_ID = 'send-notification-form';

interface FormValues {
  level: NotificationLevel;
  title: string;
  body: string;
  expiresAt: dayjs.Dayjs | null;
}

interface Props {
  open: boolean;
  /** Fixed recipient, or null to send to every extension account. */
  user: ExtUser | null;
  onClose: () => void;
  onSent: (notification: ExtAdminNotification) => void;
}

/**
 * Writes a notice the extension panel will show.
 *
 * The audience is decided by where this was opened from — a user's drawer
 * sends to that account, the Notifications page sends to everyone — rather
 * than by a control inside the dialog, so "who is this going to?" cannot be
 * misread at the moment of sending.
 */
export function SendNotificationModal({ open, user, onClose, onSent }: Props) {
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={user ? `Notify ${user.email}` : 'Notify every account'}
      open={open}
      onCancel={onClose}
      okText="Send"
      okButtonProps={{ htmlType: 'submit', form: FORM_ID, loading: saving }}
      width={520}
      destroyOnHidden
      {...formModalProps}
    >
      {open && (
        <SendNotificationForm
          user={user}
          onClose={onClose}
          onSent={onSent}
          onSavingChange={setSaving}
        />
      )}
    </Modal>
  );
}

function SendNotificationForm({
  user,
  onClose,
  onSent,
  onSavingChange,
}: Omit<Props, 'open'> & { onSavingChange: (saving: boolean) => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  async function handleSubmit(values: FormValues) {
    onSavingChange(true);
    try {
      const created = await createNotification({
        title: values.title.trim(),
        body: values.body.trim(),
        level: values.level,
        userId: user ? user.id : null,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      });
      void message.success(user ? 'Notice sent' : 'Notice sent to everyone');
      onSent(created);
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
      initialValues={{ level: 'info', expiresAt: null }}
    >
      {!user && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="This goes to every extension account"
          description="Everyone signed in to Easy DAT sees it in their panel until they open it."
        />
      )}

      <Form.Item name="level" label="Kind">
        <Select
          options={[
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
            { value: 'success', label: 'Good news' },
          ]}
        />
      </Form.Item>

      <Form.Item
        name="title"
        label="Title"
        rules={[{ required: true, message: 'Title required' }, { max: 120 }]}
      >
        <Input placeholder="Maintenance on Sunday" showCount maxLength={120} />
      </Form.Item>

      <Form.Item
        name="body"
        label="Message"
        rules={[{ required: true, message: 'Message required' }, { max: 1000 }]}
      >
        <Input.TextArea
          rows={4}
          showCount
          maxLength={1000}
          placeholder="What the user needs to know."
        />
      </Form.Item>

      <Form.Item
        name="expiresAt"
        label="Stop showing after"
        extra="Optional. Leave empty to keep it until you withdraw it."
      >
        <DatePicker showTime style={{ width: '100%' }} />
      </Form.Item>
    </Form>
  );
}
