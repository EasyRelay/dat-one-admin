import { theme, type ThemeConfig } from 'antd';
import type { ThemeMode } from '../store/theme.store';

const shared: ThemeConfig = {
  token: {
    colorPrimary: '#0f766e',
    colorInfo: '#0f766e',
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    borderRadius: 10,
    borderRadiusLG: 14,
    fontFamily:
      "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    controlHeight: 40,
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 500,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(45, 212, 191, 0.18)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
      itemBorderRadius: 8,
      itemMarginInline: 4,
      itemHeight: 36,
      // Matches the Sider's collapsedWidth in AppLayout.
      collapsedWidth: 56,
      collapsedIconSize: 17,
    },
  },
};

const light: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...shared.token,
    colorBgLayout: '#eef2f6',
    colorBgContainer: '#ffffff',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
  },
  components: {
    ...shared.components,
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#64748b',
      rowHoverBg: '#f8fafc',
      borderColor: '#e2e8f0',
    },
  },
};

// Slate-navy rather than pure black, so the teal accent and the dark sidebar
// still read as separate layers.
const dark: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...shared.token,
    colorPrimary: '#14b8a6',
    colorInfo: '#14b8a6',
    colorBgLayout: '#0b1220',
    colorBgContainer: '#111a2b',
    colorBgElevated: '#162236',
    colorBorder: '#243044',
    colorBorderSecondary: '#1b2638',
  },
  components: {
    ...shared.components,
    Table: {
      headerBg: '#152033',
      headerColor: '#94a3b8',
      rowHoverBg: '#152033',
      borderColor: '#243044',
    },
  },
};

export function adminTheme(mode: ThemeMode): ThemeConfig {
  return mode === 'dark' ? dark : light;
}
