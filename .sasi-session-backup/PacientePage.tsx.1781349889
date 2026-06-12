// ============================================================================
// SASI · PacientePage — prontuário do paciente (view "Pacientes")
// Layout da Ficha do Paciente (design system SASI · Comando UTI):
//   cabeçalho de identificação → Situação Atual (Eixo Estado) + Avaliação por
//   sistemas (Eixo Problema) → Problemas ⇄ Condutas 1:1 (Eixo Ação) →
//   Paciente Sumário com HPMA + tabelão serial (Eixo Tempo).
// FichaCompleta (edição) fica atrás do toggle "Editar Ficha"; histórico de
// evoluções read-only no rodapé. Timeline continua no TimelineDrawer.
// ============================================================================
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, ClipboardList, Clock, FileText,
  History, PencilLine, Target, X,
} from 'lucide-react';
import type {
  DashboardRow, Evolucao, Paciente, PatientSummary, SystemKey,
} from '../lib/supabaseClient';
import {
  sofaColorClass, SYSTEM_COLORS, checkVitalAlert, checkLabAlert,
} from '../lib/drugs';
import { TABELAO_LABS } from '../lib/sasiSchema';
import {
  extractCondutas, extractDispositivos, extractExameFisico,
  extractPlanilhaoVitais, extractProblemas, extractTabelaoLabs,
  buildPassagem3Linhas,
} from '../lib/clinicalExtract';
import { clinicalNum } from '../lib/clinicalFormat';
import { severityLabel } from '../lib/severity';
import { useToasts } from '../lib/useToasts';
import { usePacienteFicha } from '../hooks/usePacienteFicha';
import FichaCompleta from './FichaCompleta';
import TimelineDrawer from './TimelineDrawer';
import { ModalSkeleton, EmptyState } from './Skeletons';

interface Props {
  pacienteId: string;
  onBack: () => void;
}

const SYSTEM_LABELS: Record<SystemKey, string> = {
  neuro: 'Neuro', resp: 'Resp', hemo: 'Hemo', tgi: 'TGI',
  renal: 'Renal', hemato: 'Hemato', infecto: 'Infecto',
};

const VETOR_CLASS: Record<string, string> = {
  '↑': 'text-red-400',
  '↓': 'text-emerald-400',
  '=': 'text-slate-400',
};

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

// ── Blocos visuais da ficha (design system: card numerado + eyebrow) ─────────

function FichaCard({
  number, eyebrow, title, action, className = '', children,
}: {
  number?: string;
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`bg-app-card border border-app-border rounded-2xl p-5 sasi-fade-in ${className}`}>
      <header className="flex items-center gap-2.5 mb-4">
        {number && (
          <span className="shrink-0 w-6 h-6 rounded-md bg-app-accent/15 text-app-accent font-mono text-xs font-bold flex items-center justify-center tabular-nums">
            {number}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[9px] font-bold uppercase tracking-widest text-app-text-muted leading-tight">
              {eyebrow}
            </div>
          )}
          <h3 className="text-sm font-bold text-app-text leading-tight">{title}</h3>
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function SecLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted mb-2">
      {children}
    </div>
  );
}

function VitalChip({
  label, value, status = 'ok',
}: {
  label: string;
  value: string;
  status?: 'ok' | 'low' | 'high' | 'absurd';
}) {
  const color =
    status === 'high' || status === 'absurd'
      ? 'text-red-400 bg-red-950/30'
      : status === 'low'
        ? 'text-sky-400 bg-sky-950/30'
        : 'text-app-text bg-app-tertiary/50';
  return (
    <div className={`px-2.5 py-1.5 rounded-lg ${color}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-app-text-muted">
        {label}
      </div>
      <div className="font-mono text-sm font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

function SystemPanelRO({
  sys, children,
}: {
  sys?: SystemKey;
  children: ReactNode;
}) {
  const color = sys ? SYSTEM_COLORS[sys] : undefined;
  return (
    <div
      className={`sys-${sys ?? 'geral'} ${color?.bg ?? 'bg-app-tertiary/40'} ${
        color?.border ?? 'border-l-slate-500'
      } border-l-4 rounded-xl px-3 py-2.5`}
    >
      {sys && (
        <div className={`sys-title text-[10px] font-bold uppercase tracking-widest mb-1 ${color?.text ?? ''}`}>
          {SYSTEM_LABELS[sys]}
        </div>
      )}
      {children}
    </div>
  );
}

function ProblemaLinha({ texto, vetor }: { texto: string; vetor: string | null }) {
  return (
    <div className="flex items-start gap-2">
      {vetor && (
        <span className={`text-lg font-black leading-none ${VETOR_CLASS[vetor] ?? ''}`}>
          {vetor}
        </span>
      )}
      <p className="text-xs font-medium text-app-text leading-snug m-0">{texto}</p>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function PacientePage({ pacienteId, onBack }: Props) {
  const { paciente, evolucao, evolucoes, pendencias, loading, error, reload } =
    usePacienteFicha(pacienteId);
  const [showTimeline, setShowTimeline] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { addToast } = useToasts();

  const diasInternacao = paciente
    ? Math.floor((Date.now() - new Date(paciente.data_adm).getTime()) / 86400000)
    : 0;

  const sofaAtual = evolucao?.sofa_total ?? null;
  const sofaPrev = evolucoes[1]?.sofa_total ?? null;
  const deltaSofa = sofaAtual != null && sofaPrev != null ? sofaAtual - sofaPrev : null;

  const summary = paciente
    ? ((paciente as Paciente & { patient_summary?: PatientSummary }).patient_summary ?? null)
    : null;

  /** DashboardRow sintética pros extractors que esperam a view do dashboard. */
  const rowSintetica = paciente
    ? ({
        paciente_id: paciente.id,
        leito: paciente.leito,
        uti: paciente.uti,
        nome: paciente.nome,
        idade: paciente.idade,
        peso: paciente.peso,
        hd: paciente.hd,
        gravidade: paciente.gravidade,
        status_leito: paciente.status_leito,
        data_adm: paciente.data_adm,
        dias_internacao: diasInternacao,
        sofa_total: sofaAtual ?? undefined,
        sofa_snapshot: (evolucao?.sofa_snapshot ?? undefined) as
          | Record<string, unknown>
          | undefined,
        delta_sofa_24h: deltaSofa ?? undefined,
        pendencias_abertas: pendencias.length,
      } as DashboardRow)
    : null;

  // ── Dados derivados (ZERO ALUCINAÇÃO: seção sem fonte não renderiza) ──────
  const planilhao = extractPlanilhaoVitais(evolucao);
  const vitais = ['pam', 'fc', 'spo2', 'tax', 'fr']
    .map((k) => planilhao.find((r) => r.key === k))
    .filter((r): r is NonNullable<typeof r> => r != null && (r.max !== '' || r.min !== ''))
    .map((r) => {
      const value = r.max && r.min && r.max !== r.min ? `${r.max}–${r.min}` : r.max || r.min;
      const nMax = clinicalNum(r.max);
      const nMin = clinicalNum(r.min);
      const aMax = nMax != null ? checkVitalAlert(r.key, nMax) : 'ok';
      const aMin = nMin != null ? checkVitalAlert(r.key, nMin) : 'ok';
      const status = [aMax, aMin].includes('absurd')
        ? 'absurd' as const
        : aMax === 'high'
          ? 'high' as const
          : aMin === 'low' || aMax === 'low'
            ? 'low' as const
            : 'ok' as const;
      return { label: r.label, value, status };
    });

  const renal = (evolucao?.renal ?? {}) as Record<string, unknown>;
  const bh = clinicalNum(renal.bh_ml ?? renal.balanco_hidrico ?? renal.bh);

  const nDva = (evolucao?.dvas ?? []).length;
  const nSed = (evolucao?.sedativos ?? []).length;
  const resp = (evolucao?.resp ?? {}) as Record<string, unknown>;
  const infecto = (evolucao?.infecto ?? {}) as Record<string, unknown>;
  const temVM = Boolean(resp.suporte ?? resp.modo_ventilatorio);
  const temATB = Boolean(infecto.atb_atual ?? infecto.atb ?? infecto.atbs);
  const temTerapias = nDva > 0 || nSed > 0 || temVM || temATB;

  const dispositivos = rowSintetica ? extractDispositivos(rowSintetica, summary) : [];
  const exameFisico = extractExameFisico(evolucao);
  const problemas = extractProblemas(evolucao);
  const condutas = extractCondutas(evolucao);
  const tabelao = extractTabelaoLabs(evolucoes)
    .map((row, i) => ({ ...row, key: TABELAO_LABS[i].key }))
    .filter((row) => row.val1 || row.val2);

  const copiarPassagem = () => {
    if (!rowSintetica) return;
    const { linha1, linha2, linha3 } = buildPassagem3Linhas(
      rowSintetica, evolucao, pendencias, summary
    );
    void navigator.clipboard.writeText(`${linha1}\n${linha2}\n${linha3}`).then(
      () => addToast('success', 'Passagem copiada (3 linhas)'),
      () => addToast('danger', 'Falha ao copiar passagem'),
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
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
          {/* CABEÇALHO DE IDENTIFICAÇÃO */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 sasi-fade-in">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="font-mono text-3xl font-bold text-app-text tabular-nums whitespace-nowrap leading-none">
                  Leito {paciente.leito}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-app-text truncate">
                    {paciente.nome}
                    {paciente.idade != null && `, ${paciente.idade}`}
                  </div>
                  <div className="text-xs text-app-text-muted truncate">
                    {paciente.uti} · Dia UTI {diasInternacao}
                    {paciente.hd ? ` · ${paciente.hd}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <span
                  className={`gravidade-${paciente.gravidade} text-[10px] font-bold uppercase px-2 py-0.5 rounded`}
                >
                  {severityLabel(paciente.gravidade)}
                </span>
                {sofaAtual != null && (
                  <span className={`font-mono text-sm font-bold tabular-nums ${sofaColorClass(sofaAtual)}`}>
                    SOFA {sofaAtual}
                    {deltaSofa != null && deltaSofa !== 0 && (
                      <span className="ml-1 text-xs">
                        {deltaSofa > 0 ? '↑' : '↓'}{deltaSofa > 0 ? '+' : ''}{deltaSofa}
                      </span>
                    )}
                  </span>
                )}
                <span className="text-xs text-app-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  adm {new Date(paciente.data_adm).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={() => setShowTimeline(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-[11px] font-medium transition"
                >
                  <BarChart3 className="w-3 h-3" />
                  Timeline
                </button>
                <button
                  onClick={copiarPassagem}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-[11px] font-medium transition"
                >
                  <ClipboardList className="w-3 h-3" />
                  Passagem
                </button>
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    editMode
                      ? 'bg-app-tertiary text-app-text-2 hover:bg-app-tertiary/70'
                      : 'bg-app-accent text-white hover:bg-app-accent-hover'
                  }`}
                >
                  {editMode ? <X className="w-3 h-3" /> : <PencilLine className="w-3 h-3" />}
                  {editMode ? 'Fechar edição' : 'Editar Ficha'}
                </button>
              </div>
            </div>
          </div>

          {editMode ? (
            /* FICHA COMPLETA — edição dos 7 sistemas + DVAs + síntese */
            <div className="bg-app-card border border-app-border rounded-2xl p-5">
              <FichaCompleta
                paciente={paciente}
                evolucao={evolucao}
                pendencias={pendencias}
                onSaved={() => void reload()}
              />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* EIXO ESTADO — SITUAÇÃO ATUAL */}
              <FichaCard number="3" eyebrow="Eixo Estado" title="Situação Atual">
                {vitais.length === 0 && bh == null && !temTerapias &&
                  dispositivos.length === 0 && exameFisico.length === 0 &&
                  pendencias.length === 0 && (
                    <p className="text-xs text-app-text-muted/60 italic m-0">
                      Sem dados de estado na última evolução.
                    </p>
                  )}

                {(vitais.length > 0 || bh != null) && (
                  <>
                    <SecLabel>Sinais vitais & balanço 24h</SecLabel>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {vitais.map((v) => (
                        <VitalChip key={v.label} label={v.label} value={v.value} status={v.status} />
                      ))}
                      {bh != null && (
                        <VitalChip label="BH" value={`${bh > 0 ? '+' : ''}${bh} ml`} />
                      )}
                    </div>
                  </>
                )}

                {temTerapias && (
                  <>
                    <SecLabel>Terapias vigentes</SecLabel>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {nDva > 0 && (
                        <span className="badge-dva text-[10px] font-bold px-2 py-0.5 rounded-full">
                          DVA {nDva}
                        </span>
                      )}
                      {nSed > 0 && (
                        <span className="badge-sed text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Sed {nSed}
                        </span>
                      )}
                      {temVM && (
                        <span className="badge-vm text-[10px] font-bold px-2 py-0.5 rounded-full">
                          VM
                        </span>
                      )}
                      {temATB && (
                        <span className="badge-atb text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ATB
                        </span>
                      )}
                    </div>
                  </>
                )}

                {dispositivos.length > 0 && (
                  <>
                    <SecLabel>Dispositivos</SecLabel>
                    <ul className="list-disc pl-4 text-xs text-app-text-2 space-y-0.5 mb-4">
                      {dispositivos.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </>
                )}

                {exameFisico.length > 0 && (
                  <>
                    <SecLabel>Exame físico</SecLabel>
                    <ul className="text-xs text-app-text-2 space-y-1 mb-4 list-none pl-0">
                      {exameFisico.map((e) => (
                        <li key={e.sistema}>
                          <span className="font-bold text-app-text">{e.sistema}:</span> {e.notas}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {pendencias.length > 0 && (
                  <>
                    <SecLabel>Pendências abertas</SecLabel>
                    <ul className="text-xs text-app-text-2 space-y-1 list-none pl-0">
                      {pendencias.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <span className="badge-pend text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            P{p.prioridade}
                          </span>
                          {p.tarefa}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </FichaCard>

              {/* EIXO PROBLEMA — AVALIAÇÃO POR SISTEMAS */}
              <FichaCard number="4" eyebrow="Eixo Problema" title="Avaliação por sistemas">
                {problemas.length === 0 ? (
                  <p className="text-xs text-app-text-muted/60 italic m-0">
                    Nenhum problema ativo estruturado. Use Editar Ficha.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {problemas.map((p, i) => (
                      <SystemPanelRO key={p.id ?? i} sys={p.sistema}>
                        <ProblemaLinha texto={p.texto} vetor={p.vetor} />
                      </SystemPanelRO>
                    ))}
                  </div>
                )}

                {Array.isArray(evolucao?.impressao) && evolucao.impressao.length > 0 && (
                  <>
                    <div className="mt-4">
                      <SecLabel>Impressão clínica</SecLabel>
                    </div>
                    <p className="text-xs text-app-text-2 leading-relaxed m-0">
                      {evolucao.impressao.join(' · ')}
                    </p>
                  </>
                )}
              </FichaCard>

              {/* EIXO AÇÃO — PROBLEMAS ⇄ CONDUTAS 1:1 */}
              <FichaCard
                eyebrow="Eixo Ação"
                title="Problemas Ativos ⇄ Condutas 12–24h"
                className="md:col-span-2"
              >
                {problemas.length === 0 && condutas.length === 0 ? (
                  <p className="text-xs text-app-text-muted/60 italic m-0">
                    Nenhum problema/conduta estruturado. Use Editar Ficha ou síntese SASI.
                  </p>
                ) : (
                  <div>
                    <div className="hidden md:grid md:grid-cols-[1fr_24px_1.2fr] gap-2.5 pb-2">
                      <SecLabel>Problema ativo</SecLabel>
                      <span />
                      <SecLabel>Conduta · dose + meta numérica</SecLabel>
                    </div>
                    {problemas.map((prob, i) => {
                      const cond =
                        condutas[i] ??
                        condutas.find((c) => c.sistema === prob.sistema) ??
                        condutas[0];
                      const condColor = cond && cond.sistema !== 'geral'
                        ? SYSTEM_COLORS[cond.sistema]
                        : undefined;
                      return (
                        <div
                          key={prob.id ?? i}
                          className="grid md:grid-cols-[1fr_24px_1.2fr] gap-2.5 items-center py-2.5 border-t border-app-border/40"
                        >
                          <div>
                            <ProblemaLinha texto={prob.texto} vetor={prob.vetor} />
                            {prob.sistema && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-app-text-muted mt-1 inline-block">
                                {SYSTEM_LABELS[prob.sistema]}
                              </span>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-app-text-muted hidden md:block" />
                          {cond ? (
                            <div
                              className={`bg-app-tertiary/50 border border-app-border/40 rounded-lg px-3 py-2 ${
                                condColor ? `${condColor.border} border-l-[3px]` : ''
                              }`}
                            >
                              <div className="text-xs font-bold text-app-text leading-snug">
                                {cond.texto}
                              </div>
                              {cond.meta && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
                                  <Target className="w-3 h-3" />
                                  META: {cond.meta}
                                </span>
                              )}
                              {cond.prazo && (
                                <span className="text-[10px] text-app-text-muted ml-2">
                                  {cond.prazo}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-app-text-muted italic m-0">
                              Conduta não pareada
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {condutas.length > problemas.length && (
                      <div className="pt-2.5 border-t border-app-border/40">
                        <SecLabel>Condutas adicionais</SecLabel>
                        {condutas.slice(problemas.length).map((c, i) => (
                          <div key={i} className="text-xs text-app-text-2 py-0.5">
                            • {c.texto}{c.meta ? ` [meta: ${c.meta}]` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </FichaCard>

              {/* EIXO TEMPO — HPMA & TABELÃO */}
              <FichaCard
                number="2"
                eyebrow="Eixo Tempo · HPMA & Tabelão"
                title="Paciente Sumário"
                className="md:col-span-2"
              >
                {summary?.hpma && (
                  <p className="text-xs text-app-text-2 leading-relaxed mb-4">
                    {summary.hpma}
                  </p>
                )}
                {!summary?.hpma && tabelao.length === 0 && (
                  <p className="text-xs text-app-text-muted/60 italic m-0">
                    Sem HPMA nem laboratório serial registrados.
                  </p>
                )}
                {tabelao.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-app-border">
                          <th className="text-left py-1.5 px-2 font-mono text-[10px] text-app-text-muted">
                            Exame
                          </th>
                          <th className="text-right py-1.5 px-2 font-mono text-[10px] text-app-text-muted">
                            Ref
                          </th>
                          <th className="text-right py-1.5 px-2 font-mono text-[10px] text-app-text-muted">
                            Tendência
                          </th>
                          <th className="text-right py-1.5 px-2 font-mono text-[10px] text-app-text-muted">
                            Anterior
                          </th>
                          <th className="text-right py-1.5 px-2 font-mono text-[10px] text-app-text-muted">
                            Atual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabelao.map((row) => {
                          const n = clinicalNum(row.val1);
                          const alert = n != null ? checkLabAlert(row.key, n) : 'normal';
                          const valClass =
                            alert === 'high'
                              ? 'text-red-400 font-bold'
                              : alert === 'low'
                                ? 'text-sky-400 font-bold'
                                : 'text-app-text';
                          return (
                            <tr key={row.key} className="border-b border-app-border/30 last:border-0">
                              <td className="py-1.5 px-2 font-semibold text-app-text">
                                {row.exame}
                                <span className="text-app-text-muted font-normal ml-1">
                                  {row.unidade}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono tabular-nums text-app-text-muted">
                                {row.ref}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono tabular-nums text-app-text-muted">
                                {row.tendencia || '—'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono tabular-nums text-app-text-2">
                                {row.val2 || '—'}
                              </td>
                              <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${valClass}`}>
                                {row.val1 || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </FichaCard>
            </div>
          )}

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
