// ============================================================================
// SASI · theme.tsx
// Estado global de tema (3 modos) e modo de visualização (3 modos).
// Persiste em localStorage. Aplica `body.theme-{tema}` pra CSS vars.
// ============================================================================
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'clinical' | 'light';
export type ViewMode = 'plantao' | 'round' | 'editor';

const THEME_KEY = 'sasi.theme';
const VIEW_KEY = 'sasi.viewMode';

interface UIState {
  theme: Theme;
  viewMode: ViewMode;
  cycleTheme: () => void;
  toggleTacticalClinical: () => void;
  setTheme: (t: Theme) => void;
  setViewMode: (v: ViewMode) => void;
}

const UIContext = createContext<UIState | null>(null);

function readStored<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

const THEMES: readonly Theme[] = ['dark', 'clinical', 'light'];
const VIEW_MODES: readonly ViewMode[] = ['plantao', 'round', 'editor'];

export function UIProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStored<Theme>(THEME_KEY, 'dark', THEMES)
  );
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    readStored<ViewMode>(VIEW_KEY, 'plantao', VIEW_MODES)
  );

  // Aplica classe no <body> pro CSS responder
  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-dark', 'theme-clinical', 'theme-light');
    body.classList.add(`theme-${theme}`);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* no-op */
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, viewMode);
    } catch {
      /* no-op */
    }
  }, [viewMode]);

  const value = useMemo<UIState>(
    () => ({
      theme,
      viewMode,
      setTheme: setThemeState,
      setViewMode: setViewModeState,
      cycleTheme: () => {
        const idx = THEMES.indexOf(theme);
        setThemeState(THEMES[(idx + 1) % THEMES.length]);
      },
      // Sidebar/topbar toggle: only flips Tactical (dark) ↔ Clinical (light/blue).
      // Legacy 'light' theme is treated as Tactical-ish and goes to Clinical.
      toggleTacticalClinical: () => {
        setThemeState(theme === 'clinical' ? 'dark' : 'clinical');
      },
    }),
    [theme, viewMode]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
