import { Empty, Modal } from 'antd';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ExtCampaign } from '../../types/campaign';

const SLICE_COLORS = [
  '#0f766e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#f59e0b',
  '#94a3b8',
];

interface Props {
  open: boolean;
  campaigns: ExtCampaign[];
  onClose: () => void;
}

function slices(
  campaigns: ExtCampaign[],
  key: 'clickCount' | 'uniqueClickCount' | 'installCount',
): { name: string; value: number }[] {
  return campaigns
    .filter((row) => row[key] > 0)
    .map((row) => ({ name: row.name, value: row[key] }));
}

function CampaignPie({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number }[];
}) {
  return (
    <div className="panel-card chart-card">
      <div className="chart-card-head">
        <h3>{title}</h3>
      </div>
      {data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label
            >
              {data.map((row, index) => (
                <Cell
                  key={`${row.name}-${index}`}
                  fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function CampaignChartsModal({ open, campaigns, onClose }: Props) {
  return (
    <Modal
      title="Diagrams"
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      centered
      destroyOnHidden
    >
      <div className="chart-grid">
        <CampaignPie title="Clicks" data={slices(campaigns, 'clickCount')} />
        <CampaignPie
          title="Unique"
          data={slices(campaigns, 'uniqueClickCount')}
        />
        <CampaignPie
          title="Installs"
          data={slices(campaigns, 'installCount')}
        />
      </div>
    </Modal>
  );
}
