// ============================================================================
// SASI · theme.tsx
// Estado global: 3 temas + 5 janelas de navegação.
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

/** 3 view modes do Plantão Board (Cards / Round / Tabela) */
export type ViewMode = 'plantao' | 'round' | 'editor';

/** 5 janelas do redesign SASI (Jun 2026) */
export type Janela = 'leitos' | 'tempo' | 'estado' | 'problema' | 'passagem';

export const JANELAS: readonly { id: Janela; label: string; shortcut: string }[] = [
  { id: 'leitos', label: 'Leitos', shortcut: '1' },
  { id: 'tempo', label: 'Eixo Tempo', shortcut: '2' },
  { id: 'estado', label: 'Planilhão', shortcut: '3' },
  { id: 'problema', label: 'Ficha Evolução', shortcut: '4' },
  { id: 'passagem', label: 'Passagem', shortcut: '5' },
] as const;

const THEME_KEY = 'sasi.theme';
const JANELA_KEY = 'sasi.janela';
const VIEW_KEY = 'sasi.viewMode';

interface UIState {
  theme: Theme;
  viewMode: ViewMode;
  janela: Janela;
  cycleTheme: () => void;
  toggleTacticalClinical: () => void;
  setTheme: (t: Theme) => void;
  setViewMode: (v: ViewMode) => void;
  setJanela: (j: Janela) => void;
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
const JANELA_IDS: readonly Janela[] = ['leitos', 'tempo', 'estado', 'problema', 'passagem'];

export function UIProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStored<Theme>(THEME_KEY, 'dark', THEMES)
  );
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    readStored<ViewMode>(VIEW_KEY, 'plantao', VIEW_MODES)
  );
  const [janela, setJanelaState] = useState<Janela>(() =>
    readStored<Janela>(JANELA_KEY, 'leitos', JANELA_IDS)
  );

  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-dark', 'theme-clinical', 'theme-light');
    body.classList.add(`theme-${theme}`);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch { /* no-op */ }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, viewMode);
    } catch { /* no-op */ }
  }, [viewMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(JANELA_KEY, janela);
    } catch { /* no-op */ }
  }, [janela]);

  const value = useMemo<UIState>(
    () => ({
      theme,
      viewMode,
      janela,
      setTheme: setThemeState,
      setViewMode: setViewModeState,
      setJanela: setJanelaState,
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
    [theme, viewMode, janela]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}