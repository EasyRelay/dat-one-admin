import {
  App,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Skeleton,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { extractApiError } from '../../api/client';
import { getTollBotSettings, updateTollBotSettings } from '../../api/toll-bot.api';
import { formModalProps } from '../../theme/modal';
import type {
  TollBotDirectionsMap,
  TollBotDirectionsMode,
  TollBotDirectionsPageStyle,
  TollBotSettings,
} from '../../types/toll-bot';

interface FormValues {
  dailyLaneLimit: number | null;
  dailyFetchCap: number | null;
  dailyFetchCapEnabled: boolean;
  promoOn: boolean;
  promoText: string;
  promoUrl: string;
  newGroupsEnabled: boolean;
  privateChatEnabled: boolean;
  fullRoutesDailyLimitEnabled: boolean;
  directionsMode: TollBotDirectionsMode;
  directionsPageStyle: TollBotDirectionsPageStyle;
  directionsMap: TollBotDirectionsMap;
  replyDeleteMinutes: number | null;
  limitDeleteSeconds: number | null;
  inlinePickDeleteMinutes: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: TollBotSettings) => void;
}

/** A number to store: null when empty or just the default, so a later default change applies. */
function numberOrDefault(value: number | null | undefined, fallback: number): number | null {
  return value == null || value === fallback ? null : value;
}

/** "5 min", "never", "1 h", "1 h 30 min" — what an auto-delete value means. */
function minutesText(minutes: number): string {
  if (minutes === 0) return 'never';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** The value to store: null when it is just the default, so a later default change applies. */
function orDefault(value: string, fallback: string): string | null {
  const trimmed = value.trim();
  return trimmed === fallback ? null : trimmed;
}

/**
 * The toll bot's settings: limits (an empty field = the server's env value),
 * the promo button under every card, and whether new groups may use the bot
 * before an admin switches them on.
 */
export function TollBotLimitsModal({ open, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [settings, setSettings] = useState<TollBotSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const promoOn = Form.useWatch('promoOn', form);
  const capOn = Form.useWatch('dailyFetchCapEnabled', form);

  useEffect(() => {
    if (!open) return;
    getTollBotSettings()
      .then((loaded) => {
        setSettings(loaded);
        form.setFieldsValue({
          dailyLaneLimit: loaded.dailyLaneLimitSet,
          dailyFetchCap: loaded.dailyFetchCapSet,
          dailyFetchCapEnabled: loaded.dailyFetchCapEnabled,
          promoOn: loaded.promoText !== '',
          promoText: loaded.promoText || loaded.promoDefaultText,
          promoUrl: loaded.promoUrl,
          newGroupsEnabled: loaded.newGroupsEnabled,
          privateChatEnabled: loaded.privateChatEnabled,
          fullRoutesDailyLimitEnabled: loaded.fullRoutesDailyLimitEnabled,
          directionsMode: loaded.directionsMode,
          directionsPageStyle: loaded.directionsPageStyle,
          directionsMap: loaded.directionsMap,
          replyDeleteMinutes: loaded.replyDeleteMinutes,
          limitDeleteSeconds: loaded.limitDeleteSeconds,
          inlinePickDeleteMinutes: loaded.inlinePickDeleteMinutes,
        });
      })
      .catch((err: unknown) => void message.error(extractApiError(err)));
  }, [open, form, message]);

  async function handleSubmit(values: FormValues) {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await updateTollBotSettings({
        dailyLaneLimit: values.dailyLaneLimit ?? null,
        dailyFetchCap: values.dailyFetchCap ?? null,
        dailyFetchCapEnabled: values.dailyFetchCapEnabled,
        promoText: values.promoOn ? orDefault(values.promoText, settings.promoDefaultText) : '',
        promoUrl: values.promoOn ? orDefault(values.promoUrl, settings.promoDefaultUrl) : settings.promoUrlSet,
        newGroupsEnabled: values.newGroupsEnabled,
        privateChatEnabled: values.privateChatEnabled,
        fullRoutesDailyLimitEnabled: values.fullRoutesDailyLimitEnabled,
        directionsMode: values.directionsMode,
        directionsPageStyle: values.directionsPageStyle,
        directionsMap: values.directionsMap,
        replyDeleteMinutes: numberOrDefault(values.replyDeleteMinutes, settings.replyDeleteMinutesDefault),
        limitDeleteSeconds: numberOrDefault(values.limitDeleteSeconds, settings.limitDeleteSecondsDefault),
        inlinePickDeleteMinutes: numberOrDefault(
          values.inlinePickDeleteMinutes,
          settings.inlinePickDeleteMinutesDefault,
        ),
      });
      void message.success('Settings saved');
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
      title="Toll bot settings"
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
          <Divider titlePlacement="start" style={{ marginTop: 0 }}>
            Limits
          </Divider>
          <Form.Item
            name="dailyLaneLimit"
            label="Lanes per user per day"
            extra={`For every user without a limit of their own. Empty = server default (${settings.envDailyLaneLimit}). In force now: ${settings.dailyLaneLimit}. The day starts at midnight US Eastern time.`}
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
            name="fullRoutesDailyLimitEnabled"
            label="Limit full route views to one calculation per day"
            valuePropName="checked"
            extra="On (default): only the first successful calculation of the day may open every route; later results stay on the cheapest. Off: every result may open every route."
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="dailyFetchCapEnabled"
            label="Limit TollGuru requests per day (all Telegram users)"
            valuePropName="checked"
            extra="Off: no daily cap for Telegram — only each user's own lanes per day still apply."
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="dailyFetchCap"
            label="TollGuru requests per day"
            extra={`Only new lanes count; cached lanes are free. 0 = cached lanes only. Empty = server default (${settings.envDailyFetchCap}).`}
          >
            <InputNumber
              min={0}
              max={100000}
              precision={0}
              disabled={!capOn}
              placeholder={String(settings.envDailyFetchCap)}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Typography.Text type="secondary">
            {capOn
              ? `Used today: ${settings.fetchCapUsedToday} / ${settings.dailyFetchCap}`
              : `Used today: ${settings.fetchCapUsedToday} · no cap`}
          </Typography.Text>
          {capOn ? (
            <Progress
              percent={usedPct}
              size="small"
              status={usedPct >= 100 ? 'exception' : 'normal'}
              showInfo={false}
            />
          ) : null}

          <Divider titlePlacement="start">Promo button</Divider>
          <Form.Item name="promoOn" label="Show a button under every result card" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="promoText"
            label="Button text"
            rules={[
              { required: promoOn, whitespace: true, message: 'Enter the button text' },
              { max: 64, message: 'At most 64 characters' },
            ]}
          >
            <Input disabled={!promoOn} placeholder={settings.promoDefaultText} maxLength={64} />
          </Form.Item>
          <Form.Item
            name="promoUrl"
            label="Link"
            rules={[
              { required: promoOn, message: 'Enter the link' },
              { type: 'url', message: 'Enter a full https:// link' },
              { pattern: /^https:\/\//, message: 'The link must start with https://' },
            ]}
          >
            <Input disabled={!promoOn} placeholder={settings.promoDefaultUrl} />
          </Form.Item>

          <Divider titlePlacement="start">Get directions</Divider>
          <Form.Item
            name="directionsMode"
            label="When someone taps Get directions on a result card"
            extra="Applies to cards sent from now on; cards already in the chats keep what they had."
          >
            <Radio.Group>
              <Radio value="link" style={{ display: 'flex', marginBottom: 8 }}>
                Open a link (as now) — the directions page with a Copy button, or the bot's private chat
              </Radio>
              <Radio value="chat" style={{ display: 'flex' }}>
                Post in the chat — the bot sends the directions to that group in one collapsed block (the first
                few lines show, the rest open with a tap; deleted after 5 minutes like the card)
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="directionsPageStyle"
            label="Directions page look (map.easydat.us)"
            extra="Applies at once, also to links already sent."
          >
            <Radio.Group>
              <Radio value="classic" style={{ display: 'flex', marginBottom: 8 }}>
                Classic — the original page: one column, big Copy directions button, no site menu
              </Radio>
              <Radio value="modern" style={{ display: 'flex' }}>
                Modern — the Easy DAT site look: site menu, costs card, numbered steps
              </Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="directionsMap" label="Map on the directions page" extra="Shown in both looks.">
            <Radio.Group>
              <Radio value="google" style={{ display: 'flex', marginBottom: 8 }}>
                Google Maps — Google's free map, following the card's Google Maps link
              </Radio>
              <Radio value="osm" style={{ display: 'flex' }}>
                OpenStreetMap — the exact TollGuru route line
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Divider titlePlacement="start">Auto-delete</Divider>
          <Form.Item
            name="replyDeleteMinutes"
            label="Delete the result card after"
            extra={`The toll answer (map + prices) in any chat, and the bot's other replies in a group. 0 = never. Empty = default (${minutesText(settings.replyDeleteMinutesDefault)}). Now: ${minutesText(settings.replyDeleteMinutes)}. Applies to answers sent from now on.`}
          >
            <InputNumber
              min={0}
              max={2760}
              precision={0}
              placeholder={String(settings.replyDeleteMinutesDefault)}
              suffix="min"
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item
            name="limitDeleteSeconds"
            label="Delete the daily-limit message after"
            extra={`0 = never. Empty = default (${settings.limitDeleteSecondsDefault} s). Now: ${
              settings.limitDeleteSeconds === 0 ? 'never' : `${settings.limitDeleteSeconds} s`
            }.`}
          >
            <InputNumber
              min={0}
              max={3600}
              precision={0}
              placeholder={String(settings.limitDeleteSecondsDefault)}
              suffix="sec"
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item
            name="inlinePickDeleteMinutes"
            label="Delete a lane picked with @easydat_bot after"
            extra={`The user's own "🚚 City → City" message. In a group the bot must be an admin allowed to delete messages. 0 = never. Empty = default (${minutesText(settings.inlinePickDeleteMinutesDefault)}). Now: ${minutesText(settings.inlinePickDeleteMinutes)}. Telegram allows deleting only within 48 h, so at most 2760 min (46 h).`}
          >
            <InputNumber
              min={0}
              max={2760}
              precision={0}
              placeholder={String(settings.inlinePickDeleteMinutesDefault)}
              suffix="min"
              style={{ width: 180 }}
            />
          </Form.Item>

          <Divider titlePlacement="start">Groups</Divider>
          <Form.Item
            name="newGroupsEnabled"
            label="New groups can use the bot right away"
            valuePropName="checked"
            extra="Off (default): a group the bot is added to stays off until you switch it on in the Groups tab."
          >
            <Switch />
          </Form.Item>

          <Divider titlePlacement="start">Private chat</Divider>
          <Form.Item
            name="privateChatEnabled"
            label="Everyone can calculate in a private chat with the bot"
            valuePropName="checked"
            extra="Off (default): lanes work in groups; in the private chat only users you allow in the Users list (Private chat column). Directions always arrive there."
            style={{ marginBottom: 0 }}
          >
            <Switch />
          </Form.Item>
        </Form>
      ) : (
        <Skeleton active paragraph={{ rows: 6 }} />
      )}
    </Modal>
  );
}
