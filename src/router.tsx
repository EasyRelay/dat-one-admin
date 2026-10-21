import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { HandoffPage } from './pages/HandoffPage';
import { HANDOFF_PATH } from './config/admin-panels';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { DevicesPage } from './pages/DevicesPage';
import { TollBrowsersPage } from './pages/TollBrowsersPage';
import { PlansPage } from './pages/PlansPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PromoCodesPage } from './pages/PromoCodesPage';
import { NotificationsPage } from './pages/NotificationsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: HANDOFF_PATH,
    element: <HandoffPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'devices', element: <DevicesPage /> },
          { path: 'tollguru', element: <TollBrowsersPage /> },
          { path: 'plans', element: <PlansPage /> },
          { path: 'payments', element: <PaymentsPage /> },
          { path: 'promo-codes', element: <PromoCodesPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          // `/subscriptions` was folded into Users; old bookmarks still work.
          { path: 'subscriptions', element: <Navigate to="/users" replace /> },
        ],
      },
    ],
  },
  // Without this, an unknown path rendered a blank page.
  { path: '*', element: <Navigate to="/" replace /> },
]);
