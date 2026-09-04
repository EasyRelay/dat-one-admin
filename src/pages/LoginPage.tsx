import { App, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth.api';
import { extractApiError } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  async function handleLogin(values: LoginFormValues) {
    setLoading(true);
    try {
      const { accessToken } = await login(values);
      setToken(accessToken);
      void navigate('/');
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div>
          <h1>Easy DAT Admin</h1>
          <p>
            Manage extension users, plans, payments and feature permissions.
          </p>
        </div>
      </div>
      <div className="login-form-panel">
        <div className="login-card">
          <h2>Sign in</h2>
          <p className="login-card-sub">
            Use your admin email and password.
          </p>
          <Form form={form} layout="vertical" onFinish={handleLogin}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email required' },
                { type: 'email', message: 'Invalid email' },
              ]}
            >
              <Input autoComplete="username" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password required' }]}
            >
              <Input.Password autoComplete="current-password" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Sign in
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
