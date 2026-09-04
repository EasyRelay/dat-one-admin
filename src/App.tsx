import { useEffect } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './store/auth.store';
import { usePlansStore } from './store/plans.store';
import { adminTheme } from './theme/adminTheme';

function StoreBootstrap() {
  const token = useAuthStore((state) => state.token);
  const hydratePlans = usePlansStore((state) => state.hydrate);

  useEffect(() => {
    if (!token) return;
    void hydratePlans();
  }, [token, hydratePlans]);

  return null;
}

export function App() {
  return (
    <ConfigProvider theme={adminTheme}>
      <AntdApp>
        <StoreBootstrap />
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
}
