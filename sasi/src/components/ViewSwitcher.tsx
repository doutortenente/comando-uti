// ============================================================================
// SASI · ViewSwitcher — 3 modos: Plantão (Cards) / Round (Split) / Editor (Tabela)
// ============================================================================
import { LayoutGrid, List, Table } from 'lucide-react';
import { useUI, type ViewMode } from '../lib/theme';

interface ModeDef {
  key: ViewMode;
  label: string;
  Icon: typeof LayoutGrid;
  hint: string;
}

const MODES: ModeDef[] = [
  { key: 'plantao', label: 'Cards', Icon: LayoutGrid, hint: 'Plantão — grid de cards' },
  { key: 'round', label: 'Round', Icon: List, hint: 'Round — lista lateral + detalhes' },
  { key: 'editor', label: 'Tabela', Icon: Table, hint: 'Editor — view densa estilo Excel' },
];

export default function ViewSwitcher() {
  const { viewMode, setViewMode } = useUI();
  return (
    <div className="flex gap-0.5 p-0.5 rounded-lg border border-app-border bg-app">
      {MODES.map(({ key, label, Icon, hint }) => {
        const active = viewMode === key;
        return (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            title={hint}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
              active
                ? 'bg-app-accent text-white'
                : 'text-app-text-muted hover:bg-app-tertiary hover:text-app-text-2'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
