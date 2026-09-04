export interface ExtDashboard {
  users: {
    total: number;
    active: number;
    removed: number;
    withPlan: number;
    online: number;
    seenLast24h: number;
    seenLast7d: number;
    createdLast7d: number;
    createdThisMonth: number;
  };
  devices: {
    total: number;
    active: number;
    inactive: number;
    online: number;
    seenLast24h: number;
  };
  payments: {
    total: number;
    paid: number;
    pending: number;
    paidAmountByCurrency: Array<{ currency: string; amount: number }>;
  };
  monthlySignups: Array<{ year: number; month: number; count: number }>;
  monthlyActiveDevices: Array<{ year: number; month: number; count: number }>;
  monthlyRevenue: Array<{
    year: number;
    month: number;
    currency: string;
    amount: number;
    count: number;
  }>;
  planBreakdown: Array<{ plan: string; count: number }>;
}
