import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'dat-one-admin:theme';

/** Saved choice, else the OS preference. */
function initialMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** `data-theme` on <html> drives the CSS variables in index.css. */
function applyMode(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
}

const startMode = initialMode();
applyMode(startMode);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: startMode,

  toggle() {
    const mode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    applyMode(mode);
    set({ mode });
  },
}));
