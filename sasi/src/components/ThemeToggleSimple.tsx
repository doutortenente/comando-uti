// ============================================================================
// SASI · ThemeToggleSimple — alterna Tático (dark/vermelho) ⇄ Clínico (claro/azul)
// Toggle complementar ao ThemeToggle (3 vias); usado na TopBar do Plantão Board.
// ============================================================================
import { Moon, Sun } from 'lucide-react';
import { useUI } from '../lib/theme';

export default function ThemeToggleSimple() {
  const { theme, toggleTacticalClinical } = useUI();
  const isClinical = theme === 'clinical';
  return (
    <button
      onClick={toggleTacticalClinical}
      title={isClinical ? 'Tema tático (escuro/vermelho)' : 'Tema clínico (claro/azul)'}
      aria-label="Alternar tema"
      className="p-2 rounded-lg border border-app-border bg-app-card text-app-text-muted hover:bg-app-tertiary hover:text-app-text transition"
    >
      {isClinical ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
}
