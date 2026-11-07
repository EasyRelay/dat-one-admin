import { App, Checkbox, Modal, Typography } from 'antd';
import { useState } from 'react';
import { extractApiError } from '../../api/client';
import { resetTollBotUserToday } from '../../api/toll-bot.api';
import type { TollBotUser } from '../../types/toll-bot';
import { tollBotUserLabel } from './tollBotUserLabel';

interface Props {
  user: TollBotUser | null;
  onClose: () => void;
  onDone: (user: TollBotUser) => void;
}

/**
 * Gives a user today back: the lanes counted today and the per-minute count
 * are cleared, so they can calculate again at once. Optionally the bot tells
 * them so in Telegram.
 */
export function TollBotResetModal({ user, onClose, onDone }: Props) {
  const { message } = App.useApp();
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  async function handleOk() {
    if (!user) return;
    setBusy(true);
    try {
      const updated = await resetTollBotUserToday(user.telegramId, notify);
      void message.success(notify ? 'Limit reset — user notified in Telegram' : 'Limit reset');
      onDone(updated);
      onClose();
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Reset today's limit"
      open={user !== null}
      onCancel={onClose}
      onOk={() => void handleOk()}
      confirmLoading={busy}
      okText="Reset"
      destroyOnHidden
      afterClose={() => setNotify(true)}
      centered
    >
      {user ? (
        <>
          <Typography.Paragraph>
            {tollBotUserLabel(user)} has used{' '}
            <b>
              {user.lanesToday}/{user.dailyLimit}
            </b>{' '}
            lanes today. Resetting clears today&apos;s count, so they get all {user.dailyLimit} again.
          </Typography.Paragraph>
          <Checkbox checked={notify} onChange={(event) => setNotify(event.target.checked)}>
            Tell them in Telegram that they can calculate again
          </Checkbox>
        </>
      ) : null}
    </Modal>
  );
}
