import { App, Form, InputNumber, Modal, Progress, Skeleton, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { extractApiError } from '../../api/client';
import { getTollBotSettings, updateTollBotSettings } from '../../api/toll-bot.api';
import { formModalProps } from '../../theme/modal';
import type { TollBotSettings } from '../../types/toll-bot';

interface FormValues {
  dailyLaneLimit: number | null;
  dailyFetchCap: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: TollBotSettings) => void;
}

/**
 * The bot-wide limits. An empty field means "use the server's env value", so
 * clearing a field is how a value set here is taken back.
 */
export function TollBotLimitsModal({ open, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [settings, setSettings] = useState<TollBotSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getTollBotSettings()
      .then((loaded) => {
        setSettings(loaded);
        form.setFieldsValue({
          dailyLaneLimit: loaded.dailyLaneLimitSet,
          dailyFetchCap: loaded.dailyFetchCapSet,
        });
      })
      .catch((err: unknown) => void message.error(extractApiError(err)));
  }, [open, form, message]);

  async function handleSubmit(values: FormValues) {
    setSaving(true);
    try {
      const saved = await updateTollBotSettings({
        dailyLaneLimit: values.dailyLaneLimit ?? null,
        dailyFetchCap: values.dailyFetchCap ?? null,
      });
      void message.success('Limits saved');
      onSaved(saved);
      onClose();
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  const usedPct =
    settings && settings.dailyFetchCap > 0
      ? Math.min(100, Math.round((settings.fetchCapUsedToday / settings.dailyFetchCap) * 100))
      : 0;

  return (
    <Modal
      title="Toll bot limits"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okButtonProps={{ disabled: !settings }}
      confirmLoading={saving}
      okText="Save"
      destroyOnHidden
      afterClose={() => setSettings(null)}
      {...formModalProps}
    >
      {settings ? (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="dailyLaneLimit"
            label="Lanes per user per day"
            extra={`For every user without a limit of their own. Empty = server default (${settings.envDailyLaneLimit}). In force now: ${settings.dailyLaneLimit}.`}
          >
            <InputNumber
              min={1}
              max={1000}
              precision={0}
              placeholder={String(settings.envDailyLaneLimit)}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item
            name="dailyFetchCap"
            label="TollGuru requests per day (all Telegram users)"
            extra={`Only new lanes count; cached lanes are free. 0 = cached lanes only. Empty = server default (${settings.envDailyFetchCap}).`}
          >
            <InputNumber
              min={0}
              max={100000}
              precision={0}
              placeholder={String(settings.envDailyFetchCap)}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Typography.Text type="secondary">
            Used today: {settings.fetchCapUsedToday} / {settings.dailyFetchCap}
          </Typography.Text>
          <Progress
            percent={usedPct}
            size="small"
            status={usedPct >= 100 ? 'exception' : 'normal'}
            showInfo={false}
          />
        </Form>
      ) : (
        <Skeleton active paragraph={{ rows: 4 }} />
      )}
    </Modal>
  );
}
