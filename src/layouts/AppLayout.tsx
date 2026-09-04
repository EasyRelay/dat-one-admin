import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Tooltip } from 'antd';
import {
  DashboardOutlined,
  DollarOutlined,
  CreditCardOutlined,
  TeamOutlined,
  LaptopOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { PaymentsBell } from '../components/PaymentsBell';
import { useAuthStore } from '../store/auth.store';
import { emailFromToken } from '../utils/jwt';

const { Sider, Header, Content } = Layout;

/**
 * Ordered the way the work flows: who is signed up, what they run it on, what
 * is for sale, what was paid. "Subscriptions" used to sit between them showing
 * the same accounts as Users — it is now a column on the Users table.
 */
const NAV_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/users', icon: <TeamOutlined />, label: 'Users' },
  { key: '/devices', icon: <LaptopOutlined />, label: 'Devices' },
  { key: '/plans', icon: <CreditCardOutlined />, label: 'Plans' },
  { key: '/payments', icon: <DollarOutlined />, label: 'Payments' },
  { key: '/promo-codes', icon: <TagsOutlined />, label: 'Promo codes' },
  {
    key: '/notifications',
    icon: <NotificationOutlined />,
    label: 'Notifications',
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Users',
  '/devices': 'Devices',
  '/plans': 'Plans',
  '/payments': 'Payments',
  '/promo-codes': 'Promo codes',
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const [collapsed, setCollapsed] = useState(false);

  const adminEmail = emailFromToken(token);

  const selectedKey =
    location.pathname === '/'
      ? '/'
      : (NAV_ITEMS.find(
          (item) => item.key !== '/' && location.pathname.startsWith(item.key),
        )?.key ?? '/');

  return (
    <Layout className="admin-shell">
      <Sider
        className="admin-sidebar"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
      >
        <div
          className={`admin-sidebar-logo${collapsed ? ' admin-sidebar-logo--collapsed' : ''}`}
        >
          <div className="admin-sidebar-logo-mark">
            <img src="/one-admin.png" alt="Easy DAT Admin" />
          </div>
          {!collapsed && (
            <div className="admin-sidebar-logo-text">
              <div className="admin-sidebar-logo-title">Easy DAT</div>
              <div className="admin-sidebar-logo-sub">Admin</div>
            </div>
          )}
        </div>
        <Menu
          className="admin-sidebar-menu"
          mode="inline"
          theme="dark"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header className="admin-header">
          <div className="admin-header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
            />
            <h2>{PAGE_TITLES[selectedKey] ?? 'Admin'}</h2>
          </div>
          <div className="admin-header-right">
            <PaymentsBell />
            {adminEmail && <span className="admin-header-user">{adminEmail}</span>}
            <Tooltip title="Sign out">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                Sign out
              </Button>
            </Tooltip>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
