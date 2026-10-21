import { App, Empty, Modal, Spin } from 'antd';
import { useCallback, useState } from 'react';
import { extractApiError } from '../../api/client';
import { getOnlineUsers } from '../../api/online.api';
import { useVisiblePoll } from '../../hooks/useVisiblePoll';
import type { ExtOnline } from '../../types/online';
import { seenAgo } from '../../utils/presence';

const POLL_MS = 15_000;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Who has a one.dat.com tab open with the extension right now. Polls while open. */
export function OnlineUsersModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Online now" width={480} destroyOnHidden>
      {/* Mounted only while open, so it polls only while someone is looking. */}
      {open ? <OnlineList /> : null}
    </Modal>
  );
}

function OnlineList() {
  const { message } = App.useApp();
  const [data, setData] = useState<ExtOnline | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getOnlineUsers());
    } catch (err) {
      void message.error(extractApiError(err));
    }
  }, [message]);

  useVisiblePoll(load, POLL_MS);

  if (!data) {
    return (
      <div className="online-empty">
        <Spin />
      </div>
    );
  }
  if (data.items.length === 0) return <Empty description="Nobody has DAT open right now" />;
  return (
    <>
      <div className="online-count">{data.count} online</div>
      <ul className="online-list">
        {data.items.map((user) => (
          <li key={user.id}>
            <i className="online-dot" />
            <div className="online-who">
              <div className="cell-main">{user.email}</div>
              {user.name ? <div className="cell-sub">{user.name}</div> : null}
            </div>
            <span className="cell-sub">{seenAgo(user.lastSeenAt)}</span>
          </li>
        ))}
      </ul>
      <div className="cell-sub online-foot">
        Has a DAT tab open with the extension, seen within the last{' '}
        {Math.round(data.windowSeconds / 60)} min. Refreshes every 15s.
      </div>
    </>
  );
}
