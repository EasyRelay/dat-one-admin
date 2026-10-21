import { useEffect, useRef } from 'react';
import { App, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { redeemAdminHandoff } from '../api/handoff.api';
import { extractApiError } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { readHandoffCode } from '../utils/handoff';

/**
 * Landing page of the switch from the other admin panel: trades the one-time
 * code in the URL fragment for a token and goes to the dashboard. A failed
 * code keeps whatever session this panel already had.
 */
export function HandoffPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const { message } = App.useApp();
  // The code is single-use; StrictMode's second effect run must not spend it twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = readHandoffCode(window.location.hash);
    window.history.replaceState(null, '', window.location.pathname);

    if (!code) {
      void navigate('/', { replace: true });
      return;
    }

    redeemAdminHandoff(code)
      .then(({ accessToken }) => {
        setToken(accessToken);
        void navigate('/', { replace: true });
      })
      .catch((err: unknown) => {
        void message.error(extractApiError(err));
        const signedIn = useAuthStore.getState().token !== null;
        void navigate(signedIn ? '/' : '/login', { replace: true });
      });
  }, [message, navigate, setToken]);

  return <Spin fullscreen tip="Signing in…" />;
}
