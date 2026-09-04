import type { ReactNode } from 'react';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  variant?: Variant;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  variant = 'neutral',
  loading,
}: Props) {
  if (loading) {
    return (
      <div className={`stat-card stat-card--${variant}`}>
        <div>
          <div className="stat-card-label">{label}</div>
          <div className="stat-card-value skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className={`stat-card stat-card--${variant}`}>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {hint != null ? <div className="stat-card-hint">{hint}</div> : null}
      </div>
      {icon ? <div className="stat-card-icon">{icon}</div> : null}
    </div>
  );
}
