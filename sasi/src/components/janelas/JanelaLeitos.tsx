// ============================================================================
// SASI · Janela 1 — Leitos (grid de cards com filtros)
// ============================================================================
import type { DashboardRow } from '../../lib/supabaseClient';
import LeitoCard from '../LeitoCard';
import { LeitoCardSkeleton, EmptyState } from '../Skeletons';
import { BedDouble } from 'lucide-react';

interface Props {
  rows: DashboardRow[];
  loading: boolean;
  emptyTitle: string;
  emptyDesc: string;
  onSelect: (id: string) => void;
  selectedId?: string | null;
}

export default function JanelaLeitos({
  rows, loading, emptyTitle, emptyDesc, onSelect, selectedId,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <LeitoCardSkeleton key={i} />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState icon={BedDouble} title={emptyTitle} description={emptyDesc} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {rows.map(row => (
        <div
          key={row.paciente_id}
          className={selectedId === row.paciente_id ? 'ring-2 ring-app-accent rounded-2xl' : ''}
        >
          <LeitoCard row={row} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}