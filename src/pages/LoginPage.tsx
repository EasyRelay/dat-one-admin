import { App, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmAdminTotp, login, type AdminLoginResponse } from '../api/auth.api';
import { extractApiError } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface LoginFormValues {
  email: string;
  password: string;
}

interface CodeFormValues {
  code: string;
}

type LoginStage =
  | { name: 'password' }
  | {
      name: 'setup';
      email: string;
      challengeToken: string;
      qrDataUrl: string;
      manualKey: string;
    }
  | { name: 'code'; email: string; challengeToken: string }
  | { name: 'backup'; codes: string[]; accessToken: string };

export function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<LoginStage>({ name: 'password' });
  const [form] = Form.useForm<LoginFormValues>();
  const [codeForm] = Form.useForm<CodeFormValues>();

  function enterApp(accessToken: string) {
    setToken(accessToken);
    void navigate('/');
  }

  function applyLoginResult(email: string, result: AdminLoginResponse) {
    if (
      result.totpSetupRequired &&
      result.challengeToken &&
      result.qrDataUrl &&
      result.manualKey
    ) {
      setStage({
        name: 'setup',
        email,
        challengeToken: result.challengeToken,
        qrDataUrl: result.qrDataUrl,
        manualKey: result.manualKey,
      });
      return;
    }
    if (result.totpRequired && result.challengeToken) {
      setStage({
        name: 'code',
        email,
        challengeToken: result.challengeToken,
      });
      return;
    }
    void message.error('Sign-in could not continue. Try again.');
  }

  async function handleLogin(values: LoginFormValues) {
    setLoading(true);
    try {
      const result = await login(values);
      applyLoginResult(values.email.trim(), result);
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(values: CodeFormValues) {
    if (stage.name !== 'setup' && stage.name !== 'code') return;
    setLoading(true);
    try {
      const result = await confirmAdminTotp({
        challengeToken: stage.challengeToken,
        code: values.code.trim(),
      });
      if (result.backupCodes && result.backupCodes.length > 0) {
        setStage({
          name: 'backup',
          codes: result.backupCodes,
          accessToken: result.accessToken,
        });
        return;
      }
      enterApp(result.accessToken);
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function copyBackupCodes(codes: string[]) {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      void message.success('Backup codes copied');
    } catch {
      void message.error('Could not copy. Write the codes down instead.');
    }
  }

  const heading =
    stage.name === 'setup'
      ? 'Set up Google Authenticator'
      : stage.name === 'code'
        ? 'Authentication code'
        : stage.name === 'backup'
          ? 'Save your backup codes'
          : 'Sign in';

  const subheading =
    stage.name === 'setup'
      ? 'Scan the QR code, then enter the 6-digit code. This same authenticator signs you into VPN DAT admin as well.'
      : stage.name === 'code'
        ? 'Enter the 6-digit code from Google Authenticator, or a backup code.'
        : stage.name === 'backup'
          ? 'Each code works once if you lose your phone. They will not be shown again.'
          : 'Use your admin email and password. Google Authenticator is required next.';

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
          <h2>{heading}</h2>
          <p className="login-card-sub">{subheading}</p>

          {stage.name === 'password' && (
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
                Continue
              </Button>
            </Form>
          )}

          {(stage.name === 'setup' || stage.name === 'code') && (
            <Form form={codeForm} layout="vertical" onFinish={handleCode}>
              {stage.name === 'setup' && (
                <>
                  <img
                    className="login-totp-qr"
                    src={stage.qrDataUrl}
                    alt="Google Authenticator QR code"
                  />
                  <p className="login-totp-key">{stage.manualKey}</p>
                </>
              )}
              {stage.name === 'code' && (
                <div className="login-email-chip">{stage.email}</div>
              )}
              <Form.Item
                name="code"
                label={stage.name === 'setup' ? '6-digit code' : 'Code'}
                rules={[
                  { required: true, message: 'Code required' },
                  { min: 6, message: 'Enter the 6-digit code or a backup code' },
                ]}
              >
                <Input
                  size="large"
                  autoComplete="one-time-code"
                  inputMode={stage.name === 'setup' ? 'numeric' : 'text'}
                  maxLength={stage.name === 'setup' ? 6 : 19}
                  placeholder="123456"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                {stage.name === 'setup' ? 'Enable and sign in' : 'Sign in'}
              </Button>
              <Button
                type="link"
                block
                disabled={loading}
                onClick={() => {
                  codeForm.resetFields();
                  setStage({ name: 'password' });
                }}
              >
                Back
              </Button>
            </Form>
          )}

          {stage.name === 'backup' && (
            <>
              <ul className="login-backup-codes">
                {stage.codes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <Button block onClick={() => void copyBackupCodes(stage.codes)}>
                Copy codes
              </Button>
              <Button
                type="primary"
                block
                style={{ marginTop: 8 }}
                onClick={() => enterApp(stage.accessToken)}
              >
                I saved these codes
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
