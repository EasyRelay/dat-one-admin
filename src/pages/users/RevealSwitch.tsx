import { App, Space, Switch, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { getRevealSwitch, setRevealSwitch, type RevealSwitchState } from '../../api/users.api';
import { extractApiError } from '../../api/client';

/**
 * The hidden-load reveal for everyone. Off = nobody can reveal, even accounts
 * turned on one by one; on = those accounts can again (their own switches in
 * the account drawer are kept either way).
 */
export function RevealSwitch() {
  const { message } = App.useApp();
  const [state, setState] = useState<RevealSwitchState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // An older backend without the endpoint just shows no switch.
    getRevealSwitch()
      .then(setState)
      .catch(() => setState(null));
  }, []);

  if (!state) return null;

  async function toggle(enabled: boolean) {
    setBusy(true);
    try {
      setState(await setRevealSwitch(enabled));
      void message.success(
        enabled ? 'Hidden-load reveal on for allowed accounts' : 'Hidden-load reveal off for everyone',
      );
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tooltip
      title={
        state.enabled
          ? `On: the ${state.allowedAccounts} account(s) you turned it on for can reveal hidden loads. Off stops it for everyone.`
          : 'Off for everyone. Accounts keep their own switch and can reveal again once this is on.'
      }
    >
      <Space size={6}>
        <span className="cell-sub">Hidden-load reveal</span>
        <Switch
          checked={state.enabled}
          loading={busy}
          onChange={(enabled) => void toggle(enabled)}
          checkedChildren="On"
          unCheckedChildren="Off"
        />
      </Space>
    </Tooltip>
  );
}
