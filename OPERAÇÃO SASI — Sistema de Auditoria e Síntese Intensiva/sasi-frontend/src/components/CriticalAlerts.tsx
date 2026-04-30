// ============================================================================
// SASI · CriticalAlerts — painel destacado pra pacientes críticos
// ============================================================================
import { AlertTriangle } from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';

interface Props {
  patients: DashboardRow[];
  onSelect: (id: string) => void;
}

export default function CriticalAlerts({ patients, onSelect }: Props) {
  const critical = patients.filter(
    (p) => p.gravidade === 'critico' || (p.sofa_total ?? 0) >= 11
  );

  if (critical.length === 0) return null;

  return (
    <div
      className="rounded-xl p-3 sasi-fade-in mb-3"
      style={{
        background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        border: '1px solid #dc2626',
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 font-bold text-white">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">
            {critical.length} PACIENTE{critical.length > 1 ? 'S' : ''} CRÍTICO
            {critical.length > 1 ? 'S' : ''}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {critical.map((p) => {
            const firstName = p.nome.split(' ')[0];
            return (
              <button
                key={p.paciente_id}
                onClick={() => onSelect(p.paciente_id)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-white border border-white/30 bg-white/20 hover:bg-white/30 transition"
              >
                {p.leito} · {firstName} (SOFA {p.sofa_total ?? '—'})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
