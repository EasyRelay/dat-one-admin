import { DisconnectOutlined, WarningFilled } from '@ant-design/icons';
import { Space, Tag, Tooltip } from 'antd';
import type { ExtInstallSummary } from '../types/user';
import { formatDate } from '../utils/formatters';

/**
 * "Is the extension in use": Open / Closed from the live presence ping, and
 * Removed when Chrome reported every install of the account uninstalled. Some
 * but not all removed adds a small warning next to the tag. The uninstall mark
 * is only a marker — anyone can open that URL, and a device that talks to us
 * again clears its own.
 */
export function DatPresenceTag({
  open,
  installs,
  long = false,
}: {
  open: number;
  installs: ExtInstallSummary | null;
  /** Spelled-out wording, for the drawer. */
  long?: boolean;
}) {
  const removed = installs?.uninstalled ?? 0;
  const total = installs?.installs ?? 0;
  const when = installs?.lastUninstalledAt ? formatDate(installs.lastUninstalledAt) : null;

  if (open === 0 && total > 0 && removed === total) {
    return (
      <Tooltip
        title={`Extension removed from ${total === 1 ? 'its only computer' : `all ${total} computers`}${when ? ` · last on ${when}` : ''}`}
      >
        <Tag icon={<DisconnectOutlined />} className="tag-removed" style={{ marginInlineEnd: 0 }}>
          Removed
        </Tag>
      </Tooltip>
    );
  }

  const tag =
    open > 0 ? (
      <Tag
        color="green"
        style={{ marginInlineEnd: 0 }}
        title={`one.dat.com is open on ${open} computer${open === 1 ? '' : 's'}`}
      >
        {long ? `Open on ${open} computer${open === 1 ? '' : 's'}` : `Open${open > 1 ? ` · ${open} PCs` : ''}`}
      </Tag>
    ) : (
      <Tag color="red" style={{ marginInlineEnd: 0 }} title="No one.dat.com tab open">
        Closed
      </Tag>
    );

  if (removed === 0) return tag;
  return (
    <Space size={4} wrap={false}>
      {tag}
      <Tooltip title={`Extension removed from ${removed} of ${total} computers${when ? ` · last on ${when}` : ''}`}>
        <WarningFilled className="tag-removed-partial" aria-label="Some installs removed" />
      </Tooltip>
    </Space>
  );
}
