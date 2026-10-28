import { Space, Tag, Tooltip } from 'antd';
import type { ExtDevice } from '../types/device';
import { formatDate } from '../utils/formatters';

/**
 * Device status, plus a red "uninstalled" marker when Chrome reported the
 * extension removed from that install. The marker blocks nothing; a reinstall
 * shows up as a new device row.
 */
export function DeviceStatusTags({ device }: { device: ExtDevice }) {
  return (
    <Space size={4} wrap={false}>
      <Tag color={device.status === 'active' ? 'green' : 'default'} style={{ marginInlineEnd: 0 }}>
        {device.status}
      </Tag>
      {device.uninstalledAt ? (
        <Tooltip title={`Extension removed ${formatDate(device.uninstalledAt)}`}>
          <Tag color="red" style={{ marginInlineEnd: 0 }}>
            uninstalled
          </Tag>
        </Tooltip>
      ) : null}
    </Space>
  );
}
