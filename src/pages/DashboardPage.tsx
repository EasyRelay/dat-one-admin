import {
  DollarOutlined,
  LaptopOutlined,
  ReloadOutlined,
  SolutionOutlined,
  TeamOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { App, Button, Empty, Segmented } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboard } from '../api/dashboard.api';
import { extractApiError } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import type { ExtDashboard } from '../types/dashboard';
import { formatMoney } from '../utils/formatters';

const PLAN_COLORS = [
  '#0f766e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#f59e0b',
  '#94a3b8',
];

function monthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function DashboardPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<ExtDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getDashboard());
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    // Same shape as every list screen: the spinner flips synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const signupChart = useMemo(
    () =>
      (data?.monthlySignups ?? []).map((row) => ({
        label: monthLabel(row.year, row.month),
        count: row.count,
      })),
    [data],
  );

  const deviceChart = useMemo(
    () =>
      (data?.monthlyActiveDevices ?? []).map((row) => ({
        label: monthLabel(row.year, row.month),
        count: row.count,
      })),
    [data],
  );

  // Revenue arrives split per currency; summing UZS and USD into one bar would
  // be meaningless, so one currency is charted at a time.
  const currencies = useMemo(
    () => [...new Set((data?.monthlyRevenue ?? []).map((row) => row.currency))],
    [data],
  );

  const activeCurrency = currency ?? currencies[0] ?? null;

  const revenueChart = useMemo(
    () =>
      (data?.monthlyRevenue ?? [])
        .filter((row) => row.currency === activeCurrency)
        .map((row) => ({
          label: monthLabel(row.year, row.month),
          amount: row.amount,
        })),
    [data, activeCurrency],
  );

  const planChart = useMemo(
    () =>
      (data?.planBreakdown ?? []).map((row) => ({
        name: row.plan === 'none' ? 'No plan' : row.plan,
        value: row.count,
      })),
    [data],
  );

  const paidTotals = data?.payments.paidAmountByCurrency ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Accounts, devices and revenue at a glance"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Total users"
          value={data?.users.total ?? '—'}
          hint={`+${data?.users.createdThisMonth ?? 0} this month`}
          icon={<TeamOutlined />}
          variant="primary"
          loading={loading && !data}
        />
        <StatCard
          label="Active"
          value={data?.users.active ?? '—'}
          hint={`${data?.users.removed ?? 0} removed`}
          icon={<SolutionOutlined />}
          variant="success"
          loading={loading && !data}
        />
        <StatCard
          label="Online"
          value={data?.users.online ?? '—'}
          hint={`${data?.users.seenLast24h ?? 0} seen 24h`}
          icon={<WifiOutlined />}
          variant="warning"
          loading={loading && !data}
        />
        <StatCard
          label="Devices"
          value={data?.devices.active ?? '—'}
          hint={`${data?.devices.online ?? 0} online · ${data?.devices.total ?? 0} total`}
          icon={<LaptopOutlined />}
          variant="neutral"
          loading={loading && !data}
        />
        <StatCard
          label="On a plan"
          value={data?.users.withPlan ?? '—'}
          hint={`${data?.payments.pending ?? 0} pending payment(s)`}
          icon={<SolutionOutlined />}
          variant="primary"
          loading={loading && !data}
        />
        <StatCard
          label="Collected"
          value={
            paidTotals.length
              ? formatMoney(paidTotals[0].amount, paidTotals[0].currency)
              : '—'
          }
          hint={
            paidTotals.length > 1
              ? paidTotals
                  .slice(1)
                  .map((row) => formatMoney(row.amount, row.currency))
                  .join(' · ')
              : `${data?.payments.paid ?? 0} paid payments`
          }
          icon={<DollarOutlined />}
          variant="success"
          loading={loading && !data}
        />
      </div>

      <div className="chart-grid">
        <div className="panel-card chart-card">
          <div className="chart-card-head">
            <h3>Revenue by month</h3>
            {currencies.length > 1 && (
              <Segmented
                size="small"
                value={activeCurrency ?? undefined}
                options={currencies}
                onChange={(value) => setCurrency(String(value))}
              />
            )}
          </div>
          {revenueChart.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No paid payments yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={64} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number'
                      ? formatMoney(value, activeCurrency ?? 'UZS')
                      : String(value ?? '')
                  }
                />
                <Bar dataKey="amount" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel-card chart-card">
          <div className="chart-card-head">
            <h3>Monthly signups</h3>
          </div>
          {signupChart.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={signupChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel-card chart-card">
          <div className="chart-card-head">
            <h3>Active devices by month</h3>
          </div>
          {deviceChart.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deviceChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel-card chart-card">
          <div className="chart-card-head">
            <h3>Accounts per plan</h3>
          </div>
          {planChart.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={planChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {planChart.map((row, index) => (
                    <Cell
                      key={row.name}
                      fill={PLAN_COLORS[index % PLAN_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
