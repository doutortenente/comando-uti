// ============================================================================
// SASI · PatientStrip — barra de contexto do paciente selecionado (janelas 2-4)
// ============================================================================
import { ChevronLeft, ChevronRight, User, Edit3 } from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';
import { getSeverity } from '../lib/severity';
import { extractDiagnosticoPrincipal } from '../lib/clinicalExtract';
import { sofaColorClass } from '../lib/drugs';

interface Props {
  row: DashboardRow | null;
  onPrev?: () => void;
  onNext?: () => void;
  onEdit?: () => void;
  onSelectFromLeitos?: () => void;
}

export default function PatientStrip({ row, onPrev, onNext, onEdit, onSelectFromLeitos }: Props) {
  if (!row) {
    return (
      <div className="bg-app-card border border-app-border rounded-xl p-4 text-center">
        <p className="text-sm text-app-text-muted">Nenhum paciente selecionado.</p>
        {onSelectFromLeitos && (
          <button
            onClick={onSelectFromLeitos}
            className="mt-2 text-xs px-3 py-1.5 bg-app-accent hover:bg-app-accent-hover text-white rounded-lg"
          >
            Ir para Leitos e selecionar
          </button>
        )}
      </div>
    );
  }

  const sev = getSeverity(row.gravidade);
  const diag = extractDiagnosticoPrincipal(row);

  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border border-app-border ${sev.cardClass}`}>
      <div className="flex items-center gap-1">
        {onPrev && (
          <button onClick={onPrev} className="p-1 rounded hover:bg-app-tertiary text-app-text-muted" title="Paciente anterior (k)">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {onNext && (
          <button onClick={onNext} className="p-1 rounded hover:bg-app-tertiary text-app-text-muted" title="Próximo paciente (j)">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <User className="w-4 h-4 text-app-text-muted shrink-0" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-black text-lg tabular-nums">{row.leito}</span>
            <span className="text-[10px] font-mono text-app-text-muted">{row.uti}</span>
            <span className="font-bold text-app-text truncate">{row.nome}</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.badgeClass}`}>
              {sev.label}
            </span>
          </div>
          <div className="text-xs text-app-text-2 truncate" title={diag}>{diag}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs shrink-0">
        <span className={`font-bold ${sofaColorClass(row.sofa_total)}`}>
          SOFA {row.sofa_total ?? '—'}
        </span>
        <span className="text-app-text-muted">D{row.dias_internacao}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-app-tertiary hover:bg-app-accent/20 text-app-text-2 text-xs"
          >
            <Edit3 className="w-3 h-3" /> Evolução
          </button>
        )}
      </div>
    </div>
  );
}