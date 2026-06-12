// ============================================================================
// SASI · Janela 4 — Eixo Problema→Ação (impressão 1:1 com condutas + metas)
// ============================================================================
import { Target, ArrowRight, Sparkles } from 'lucide-react';
import type { Evolucao } from '../../lib/supabaseClient';
import { extractProblemas, extractCondutas } from '../../lib/clinicalExtract';
import { SYSTEM_COLORS } from '../../lib/drugs';

interface Props {
  evolucao: Evolucao | null;
  loading: boolean;
  onOpenFicha?: () => void;
}

const VETOR_CLASS: Record<string, string> = {
  '↑': 'text-red-400',
  '↓': 'text-emerald-400',
  '=': 'text-slate-400',
};

export default function EixoProblemaAcao({ evolucao, loading, onOpenFicha }: Props) {
  if (loading) {
    return <div className="text-center text-app-text-muted py-12 animate-pulse">Carregando problema→ação…</div>;
  }

  if (!evolucao) {
    return (
      <div className="bg-app-card border border-app-border rounded-xl p-8 text-center">
        <p className="text-sm text-app-text-muted mb-3">Sem evolução para avaliar problemas e condutas.</p>
        {onOpenFicha && (
          <button onClick={onOpenFicha} className="text-xs px-4 py-2 bg-app-accent text-white rounded-lg">
            Abrir Ficha Completa
          </button>
        )}
      </div>
    );
  }

  const problemas = extractProblemas(evolucao);
  const condutas = extractCondutas(evolucao);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-app-text">
          <Target className="w-4 h-4" /> Problema Ativo → Ação (1:1)
        </h2>
        {onOpenFicha && (
          <button
            onClick={onOpenFicha}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-app-tertiary hover:bg-app-accent/20 rounded-lg text-app-text-2"
          >
            <Sparkles className="w-3 h-3" /> Editar na Ficha
          </button>
        )}
      </div>

      {problemas.length === 0 && condutas.length === 0 ? (
        <div className="bg-app-card border border-app-border rounded-xl p-6 text-center text-app-text-muted text-sm">
          Nenhum problema/conduta estruturado. Use a Ficha Completa ou síntese SASI.
        </div>
      ) : (
        <div className="space-y-3">
          {problemas.map((prob, i) => {
            const cond = condutas[i] ?? condutas.find(c => c.sistema === prob.sistema) ?? condutas[0];
            const sysColor = prob.sistema ? SYSTEM_COLORS[prob.sistema] : null;

            return (
              <div
                key={prob.id ?? i}
                className={`bg-app-card border border-app-border rounded-xl p-4 ${
                  sysColor ? `${sysColor.border} border-l-4` : ''
                }`}
              >
                <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                  {/* Problema */}
                  <div>
                    <div className="text-[10px] font-bold uppercase text-app-text-muted mb-1">Problema</div>
                    <div className="flex items-start gap-2">
                      {prob.vetor && (
                        <span className={`text-2xl font-black leading-none ${VETOR_CLASS[prob.vetor] ?? ''}`}>
                          {prob.vetor}
                        </span>
                      )}
                      <p className="text-sm font-medium text-app-text">{prob.texto}</p>
                    </div>
                    {prob.sistema && (
                      <span className="text-[10px] text-app-text-muted mt-1 inline-block uppercase">
                        {prob.sistema}
                      </span>
                    )}
                  </div>

                  <ArrowRight className="w-5 h-5 text-app-text-muted hidden md:block mt-6" />

                  {/* Conduta */}
                  <div>
                    <div className="text-[10px] font-bold uppercase text-app-text-muted mb-1">Conduta 12-24h</div>
                    {cond ? (
                      <>
                        <p className="text-sm text-app-text-2">{cond.texto}</p>
                        {cond.meta && (
                          <div className="mt-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded inline-block">
                            Meta: {cond.meta}
                          </div>
                        )}
                        {cond.prazo && (
                          <span className="text-[10px] text-app-text-muted ml-2">{cond.prazo}</span>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-app-text-muted italic">Conduta não pareada</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {condutas.length > problemas.length && (
            <div className="bg-app-card border border-app-border rounded-xl p-4">
              <div className="text-[10px] font-bold uppercase text-app-text-muted mb-2">Condutas adicionais</div>
              {condutas.slice(problemas.length).map((c, i) => (
                <div key={i} className="text-sm text-app-text-2 py-1">
                  • {c.texto}{c.meta ? ` [${c.meta}]` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}