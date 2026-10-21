import { useState } from 'react';
import { App, Button, Tooltip } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { issueAdminHandoff } from '../api/handoff.api';
import { extractApiError } from '../api/client';
import { OTHER_ADMIN_PANEL } from '../config/admin-panels';
import { buildHandoffUrl } from '../utils/handoff';

interface SwitchAdminPanelButtonProps {
  /** Icon only (narrow headers). */
  compact?: boolean;
}

/** Opens VPN DAT admin in a new tab, already signed in as this admin. */
export function SwitchAdminPanelButton({ compact = false }: SwitchAdminPanelButtonProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  if (!OTHER_ADMIN_PANEL.url) return null;
  const panelUrl = OTHER_ADMIN_PANEL.url;

  async function handleClick() {
    // Opened before the request: a tab opened after an await counts as a
    // popup and gets blocked.
    const tab = window.open('about:blank', '_blank');
    setLoading(true);
    try {
      const { code } = await issueAdminHandoff();
      const url = buildHandoffUrl(panelUrl, code);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      tab?.close();
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tooltip title={`Open ${OTHER_ADMIN_PANEL.name}, signed in`} placement="bottom">
      <Button
        icon={<SwapOutlined />}
        loading={loading}
        onClick={() => void handleClick()}
        aria-label={`Switch to ${OTHER_ADMIN_PANEL.name}`}
      >
        {!compact && OTHER_ADMIN_PANEL.name}
      </Button>
    </Tooltip>
  );
}
