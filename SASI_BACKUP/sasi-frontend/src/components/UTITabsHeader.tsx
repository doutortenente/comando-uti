// ============================================================================
// SASI · UTITabsHeader — Onda 4
// 3 tabs grandes (UTI 2 / UTI 3 / UTI 4) com contagem e cor de carga.
// Cor: verde < 50%, amarelo 50-80%, vermelho > 80%.
// ============================================================================
import type { DashboardRow } from '../lib/supabaseClient';

export type ActiveUTI = 'UTI2' | 'UTI3' | 'UTI4';

interface UtiSpec {
  id: ActiveUTI;
  label: string;
  capacity: number;
}

const UTI_SPECS: readonly UtiSpec[] = [
  { id: 'UTI2', label: 'UTI 2', capacity: 12 },
  { id: 'UTI3', label: 'UTI 3', capacity: 13 },
  { id: 'UTI4', label: 'UTI 4', capacity: 8  },
];

function loadClass(pct: number): string {
  if (pct > 80) return 'bg-red-500/20 border-red-500/60 text-red-300';
  if (pct >= 50) return 'bg-amber-400/15 border-amber-400/50 text-amber-300';
  return 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300';
}

interface Props {
  dashboard: DashboardRow[];
  activeUTI: ActiveUTI;
  onSelect: (uti: ActiveUTI) => void;
}

export default function UTITabsHeader({ dashboard, activeUTI, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      {UTI_SPECS.map(({ id, label, capacity }) => {
        const occupied = dashboard.filter((r) => r.uti === id).length;
        const pct = capacity > 0 ? (occupied / capacity) * 100 : 0;
        const isActive = activeUTI === id;
        const colorClass = loadClass(pct);

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={isActive}
            className={`flex flex-col items-center px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
              isActive
                ? `${colorClass} ring-2 ring-offset-1 ring-offset-app-card ring-current`
                : `bg-app-tertiary/40 border-app-border/50 text-app-text-muted hover:border-app-border hover:text-app-text-2`
            }`}
            title={`${label} · ${occupied}/${capacity} leitos`}
          >
            <span className="text-sm font-black leading-tight">{label}</span>
            <span className={`text-[10px] font-normal leading-tight ${isActive ? 'opacity-90' : 'opacity-60'}`}>
              {occupied}/{capacity}
            </span>
          </button>
        );
      })}
    </div>
  );
}
