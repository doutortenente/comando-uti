// ============================================================================
// SASI · ThemeToggle — cicla entre dark → clinical → light
// ============================================================================
import { Moon, Sun, Stethoscope } from 'lucide-react';
import { useUI } from '../lib/theme';

const ICONS = {
  dark: Moon,
  clinical: Stethoscope,
  light: Sun,
} as const;

const LABELS = {
  dark: 'Tema escuro (clique pra Clínico)',
  clinical: 'Tema clínico (clique pra Claro)',
  light: 'Tema claro (clique pra Escuro)',
} as const;

export default function ThemeToggle() {
  const { theme, cycleTheme } = useUI();
  const Icon = ICONS[theme];
  return (
    <button
      onClick={cycleTheme}
      title={LABELS[theme]}
      aria-label={LABELS[theme]}
      className="p-2 rounded-lg border border-app-border bg-app-card text-app-text-muted hover:bg-app-tertiary hover:text-app-text transition"
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
