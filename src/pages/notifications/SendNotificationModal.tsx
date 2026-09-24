import {
  Alert,
  App,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { createNotification } from '../../api/notifications.api';
import { listUsers } from '../../api/users.api';
import { extractApiError } from '../../api/client';
import { formModalProps } from '../../theme/modal';
import type {
  ExtAdminNotification,
  NotificationLevel,
} from '../../types/notification';
import type { ExtUser } from '../../types/user';

const FORM_ID = 'send-notification-form';

type Audience = 'all' | 'user';

interface FormValues {
  audience: Audience;
  userId?: string;
  level: NotificationLevel;
  title: string;
  body: string;
  expiresAt: dayjs.Dayjs | null;
}

interface Props {
  open: boolean;
  /** Fixed recipient, or null to let the admin pick everyone or one account. */
  user: ExtUser | null;
  onClose: () => void;
  onSent: (notification: ExtAdminNotification) => void;
}

export function SendNotificationModal({ open, user, onClose, onSent }: Props) {
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={user ? `Notify ${user.email}` : 'Send notification'}
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

function UserPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const { message } = App.useApp();
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const requestId = useRef(0);

  const search = (text: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const page = await listUsers({
          search: text.trim() || undefined,
          limit: 20,
          removed: false,
        });
        if (id !== requestId.current) return;
        setOptions(
          page.items.map((row) => ({
            value: row.id,
            label: row.name ? `${row.email} (${row.name})` : row.email,
          })),
        );
      } catch (err) {
        void message.error(extractApiError(err));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    search('');
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder="Search by email or name"
      filterOption={false}
      onSearch={search}
      options={options}
      notFoundContent={loading ? <Spin size="small" /> : 'No accounts found'}
    />
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
  const audience = Form.useWatch('audience', form) ?? 'all';

  async function handleSubmit(values: FormValues) {
    const targetId = user
      ? user.id
      : values.audience === 'user'
        ? (values.userId ?? null)
        : null;
    if (!user && values.audience === 'user' && !targetId) {
      void message.error('Pick an account');
      return;
    }
    onSavingChange(true);
    try {
      const created = await createNotification({
        title: values.title.trim(),
        body: values.body.trim(),
        level: values.level,
        userId: targetId,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      });
      void message.success(targetId ? 'Notice sent' : 'Notice sent to everyone');
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
      initialValues={{ audience: 'all', level: 'info', expiresAt: null }}
    >
      {!user && (
        <>
          <Form.Item name="audience" label="Send to">
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={[
                { value: 'all', label: 'Everyone' },
                { value: 'user', label: 'One account' },
              ]}
            />
          </Form.Item>

          {audience === 'user' ? (
            <Form.Item
              name="userId"
              label="Account"
              rules={[{ required: true, message: 'Pick an account' }]}
            >
              <UserPicker />
            </Form.Item>
          ) : (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              title="This goes to every Easy DAT account"
              description="Everyone sees it in the extension panel and on their account page on the website."
            />
          )}
        </>
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
