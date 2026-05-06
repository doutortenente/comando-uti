// ============================================================================
// SASI · SplitView — modo "Round" (lista lateral + preview do paciente)
// ============================================================================
import { useState } from 'react';
import { BedDouble, Edit3 } from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';
import LeitoCard from './LeitoCard';
import { EmptyState } from './Skeletons';

interface Props {
  patients: DashboardRow[];
  onOpenFull: (id: string) => void;
}

export default function SplitView({ patients, onOpenFull }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    patients[0]?.paciente_id ?? null
  );
  const selected = patients.find((p) => p.paciente_id === selectedId) ?? patients[0];

  if (!selected) {
    return (
      <EmptyState
        icon={BedDouble}
        title="Nenhum paciente ativo"
        description="Admita um paciente pra usar o modo Round."
      />
    );
  }

  return (
    <div className="grid gap-3 h-[calc(100vh-220px)]" style={{ gridTemplateColumns: '320px 1fr' }}>
      {/* Lista lateral */}
      <div className="overflow-y-auto pr-1 space-y-2">
        {patients.map((p) => (
          <div
            key={p.paciente_id}
            onClick={() => setSelectedId(p.paciente_id)}
            className={`rounded-lg transition ${
              p.paciente_id === selected.paciente_id
                ? 'ring-2 ring-app-accent'
                : 'opacity-80 hover:opacity-100'
            }`}
          >
            <LeitoCard row={p} compact onSelect={() => setSelectedId(p.paciente_id)} />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="overflow-y-auto rounded-xl border border-app-border bg-app-card p-5">
        <div className="text-xs font-mono text-app-text-muted">
          {selected.uti} · LEITO {selected.leito}
        </div>
        <h2 className="text-2xl font-bold text-app-text mt-1">{selected.nome}</h2>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={`badge gravidade-${selected.gravidade} text-[10px] px-2 py-0.5 rounded font-bold uppercase`}>
            {selected.gravidade}
          </span>
          <span className={`text-sm font-bold ${sofaColorClass(selected.sofa_total)}`}>
            SOFA {selected.sofa_total ?? '—'}
          </span>
          <span className="text-xs text-app-text-muted">
            D{selected.dias_internacao} · {selected.idade ?? '?'}a / {selected.peso ?? '?'}kg
          </span>
        </div>

        {selected.hd && (
          <div className="mt-4 p-3 rounded-lg bg-app-tertiary text-sm text-app-text-2 leading-relaxed">
            <span className="font-semibold text-app-text-muted">HD: </span>
            {selected.hd}
          </div>
        )}

        <button
          onClick={() => onOpenFull(selected.paciente_id)}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover text-white text-sm font-semibold transition"
        >
          <Edit3 className="w-4 h-4" />
          Abrir ficha completa
        </button>

        <div className="mt-6 text-xs text-app-text-muted">
          Use modo <strong>Editor</strong> pra view tabular densa, ou clique em "Abrir ficha completa"
          pra ver todos os sistemas.
        </div>
      </div>
    </div>
  );
}
