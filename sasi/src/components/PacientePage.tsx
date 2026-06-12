// ============================================================================
// SASI · PacientePage — prontuário do paciente (view "Pacientes")
// Página dedicada (sem modal): cabeçalho + FichaCompleta reutilizada inline +
// histórico de evoluções read-only. Timeline continua no TimelineDrawer.
// ============================================================================
import { useState } from 'react';
import {
  ArrowLeft, BarChart3, Clock, FileText, History,
} from 'lucide-react';
import type { Evolucao } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';
import { usePacienteFicha } from '../hooks/usePacienteFicha';
import FichaCompleta from './FichaCompleta';
import TimelineDrawer from './TimelineDrawer';
import { ModalSkeleton, EmptyState } from './Skeletons';

interface Props {
  pacienteId: string;
  onBack: () => void;
}

/** Resumo de uma evolução pro histórico: impressão legada ou problemas SASI. */
function resumoEvolucao(e: Evolucao): string {
  if (Array.isArray(e.impressao) && e.impressao.length > 0) {
    return e.impressao.join(' · ');
  }
  if (e.problemas_ativos && e.problemas_ativos.length > 0) {
    return e.problemas_ativos.map((p) => p.texto).join(' · ');
  }
  return '—';
}

export default function PacientePage({ pacienteId, onBack }: Props) {
  const { paciente, evolucao, evolucoes, pendencias, loading, error, reload } =
    usePacienteFicha(pacienteId);
  const [showTimeline, setShowTimeline] = useState(false);

  const diasInternacao = paciente
    ? Math.floor((Date.now() - new Date(paciente.data_adm).getTime()) / 86400000)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-xs font-medium border border-app-border transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Pacientes
      </button>

      {loading && (
        <div className="bg-app-card border border-app-border rounded-2xl">
          <ModalSkeleton />
        </div>
      )}

      {!loading && !paciente && (
        <EmptyState
          icon={FileText}
          title="Paciente não encontrado"
          description={error ?? 'O paciente pode ter recebido alta. Volte ao índice de Pacientes.'}
        />
      )}

      {!loading && paciente && (
        <>
          {/* CABEÇALHO DO PRONTUÁRIO */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 sasi-fade-in">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-black text-app-text tabular-nums">
                {paciente.leito}
              </span>
              <span className="text-xs text-app-text-muted font-mono">{paciente.uti}</span>
            </div>
            <h2 className="text-xl font-bold text-app-text">{paciente.nome}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`gravidade-${paciente.gravidade} text-[10px] font-bold uppercase px-2 py-0.5 rounded`}
              >
                {paciente.gravidade}
              </span>
              {evolucao?.sofa_total != null && (
                <span className={`text-sm font-bold ${sofaColorClass(evolucao.sofa_total)}`}>
                  SOFA {evolucao.sofa_total}
                </span>
              )}
              <span className="text-xs text-app-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" /> D{diasInternacao} — adm{' '}
                {new Date(paciente.data_adm).toLocaleDateString('pt-BR')}
              </span>
              {paciente.idade && (
                <span className="text-xs text-app-text-muted">{paciente.idade}a</span>
              )}
              {paciente.peso && (
                <span className="text-xs text-app-text-muted">{paciente.peso}kg</span>
              )}
              <button
                onClick={() => setShowTimeline(true)}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-[11px] font-medium transition"
              >
                <BarChart3 className="w-3 h-3" />
                Timeline
              </button>
            </div>
          </div>

          {/* FICHA COMPLETA — edição dos 7 sistemas + DVAs + síntese */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5">
            <FichaCompleta
              paciente={paciente}
              evolucao={evolucao}
              pendencias={pendencias}
              onSaved={() => void reload()}
            />
          </div>

          {/* HISTÓRICO DE EVOLUÇÕES (read-only) */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-text-muted mb-3">
              <History className="w-3.5 h-3.5" />
              Histórico de evoluções ({evolucoes.length})
            </div>
            {evolucoes.length === 0 && (
              <p className="text-xs text-app-text-muted/60 italic">
                Nenhuma evolução registrada.
              </p>
            )}
            <ul className="space-y-1.5">
              {evolucoes.map((e, i) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-app-tertiary/50 text-xs"
                >
                  <span className="shrink-0 tabular-nums text-app-text-2 font-medium">
                    {new Date(e.data_evolucao).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase text-app-text-muted">
                    {e.plantao}
                  </span>
                  {e.sofa_total != null && (
                    <span className={`shrink-0 font-bold tabular-nums ${sofaColorClass(e.sofa_total)}`}>
                      SOFA {e.sofa_total}
                    </span>
                  )}
                  <span className="text-app-text-muted truncate" title={resumoEvolucao(e)}>
                    {resumoEvolucao(e)}
                  </span>
                  {i === 0 && (
                    <span className="ml-auto shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-app-accent/15 text-app-accent">
                      atual
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {showTimeline && paciente && (
        <TimelineDrawer
          pacienteId={pacienteId}
          pacienteNome={paciente.nome}
          onClose={() => setShowTimeline(false)}
        />
      )}
    </div>
  );
}
