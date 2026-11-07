import { App, Form, InputNumber, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { extractApiError } from '../../api/client';
import { updateTollBotUser } from '../../api/toll-bot.api';
import { formModalProps } from '../../theme/modal';
import type { TollBotUser } from '../../types/toll-bot';
import { tollBotUserLabel } from './tollBotUserLabel';

interface FormValues {
  dailyLimit: number | null;
}

interface Props {
  user: TollBotUser | null;
  /** The bot-wide default, for the hint; null while unknown. */
  defaultLimit: number | null;
  onClose: () => void;
  onSaved: (user: TollBotUser) => void;
}

/** One user's own lanes per day. Empty = follow the bot-wide default. */
export function TollBotUserLimitModal({ user, defaultLimit, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) form.setFieldsValue({ dailyLimit: user.dailyLimitOverride });
  }, [user, form]);

  async function handleSubmit(values: FormValues) {
    if (!user) return;
    setSaving(true);
    try {
      const saved = await updateTollBotUser(user.telegramId, {
        dailyLimit: values.dailyLimit ?? null,
      });
      void message.success(
        saved.dailyLimitOverride === null
          ? 'Back to the default limit'
          : `Limit set to ${saved.dailyLimitOverride} lanes per day`,
      );
      onSaved(saved);
      onClose();
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  const defaultText = defaultLimit === null ? 'the default' : `the default (${defaultLimit})`;

  return (
    <Modal
      title={user ? `Daily limit — ${tollBotUserLabel(user)}` : 'Daily limit'}
      open={user !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText="Save"
      destroyOnHidden
      {...formModalProps}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="dailyLimit"
          label="Lanes per day"
          extra={`Empty = ${defaultText}. Takes effect on their next message.`}
        >
          <InputNumber
            min={1}
            max={1000}
            precision={0}
            placeholder={defaultLimit === null ? 'default' : String(defaultLimit)}
            style={{ width: 180 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
