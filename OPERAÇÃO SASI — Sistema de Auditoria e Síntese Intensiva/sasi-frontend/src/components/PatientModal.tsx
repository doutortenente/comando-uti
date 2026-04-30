// ============================================================================
// SASI · PatientModal — 3 abas: Detalhes / Editar (read-only) / Evolução
// Edge-function-first: writes never touch this modal — sempre via /ocr-ingest
// com audit log (LGPD art. 46). Pendências aceitam toggle inline (RLS = user_id).
// ============================================================================
import { useEffect, useState, useCallback } from 'react';
import {
  X, Clock, User, Activity, Heart, Droplets, AlertTriangle,
  Thermometer, Brain, Wind, Zap, FlaskConical, Microscope,
  ClipboardList, ChevronRight, Pill, Edit3, FileText,
  CheckCircle2, Circle, Lock,
} from 'lucide-react';
import {
  supabase,
  type Paciente,
  type Evolucao,
  type Pendencia,
  type EventoClinico,
} from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';
import InfusionEditor, { type Infusion } from './InfusionEditor';
import MiniChart from './MiniChart';

type Tab = 'detalhes' | 'editar' | 'evolucao';

interface Props {
  pacienteId: string;
  onClose: () => void;
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Tenta narrowing pra Infusion; retorna null se for string/legado. */
function asInfusion(x: unknown): Infusion | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.droga !== 'string') return null;
  return {
    droga: o.droga,
    diluicao: typeof o.diluicao === 'number' ? o.diluicao : 0,
    vazao:
      typeof o.vazao === 'string'
        ? o.vazao
        : typeof o.vazao === 'number'
        ? String(o.vazao)
        : '',
  };
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-text-muted mb-2">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between items-baseline gap-2 py-1 border-b border-app-border">
      <span className="text-xs text-app-text-muted shrink-0">{label}</span>
      <span className="text-xs text-app-text-2 text-right">{String(value)}</span>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-app-text-muted mb-0.5">
        {label}
      </div>
      <div className="px-2.5 py-1.5 rounded-lg bg-app-tertiary text-xs text-app-text-2 min-h-[28px]">
        {value == null || value === '' ? '—' : String(value)}
      </div>
    </div>
  );
}

function JsonFields({ data }: { data?: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0)
    return <p className="text-xs text-app-text-muted/60 italic">sem dados</p>;
  return (
    <div className="space-y-0.5">
      {Object.entries(data).map(([k, v]) => {
        if (v == null || v === '' || v === false) return null;
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return <Field key={k} label={k} value={val} />;
      })}
    </div>
  );
}

function SystemBlock({
  icon: Icon,
  label,
  data,
}: {
  icon: React.ElementType;
  label: string;
  data: Record<string, unknown> | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-app-border bg-app-card p-3">
      <SectionTitle icon={Icon} label={label} />
      <JsonFields data={data} />
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function PatientModal({ pacienteId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('detalhes');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [sofaHistory, setSofaHistory] = useState<EventoClinico[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [pacRes, evolRes, pendRes, sofaRes] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', pacienteId).single(),
      supabase
        .from('evolucoes')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('pendencias')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('concluida', false)
        .order('prioridade', { ascending: true }),
      supabase
        .from('eventos_clinicos')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('tipo', 'sofa')
        .order('ts', { ascending: true })
        .limit(7),
    ]);
    setPaciente(pacRes.data ?? null);
    setEvolucao(evolRes.data?.[0] ?? null);
    setPendencias(pendRes.data ?? []);
    setSofaHistory(sofaRes.data ?? []);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Fecha com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function togglePendencia(id: string, current: boolean) {
    // Optimistic update
    setPendencias((prev) =>
      prev.map((p) => (p.id === id ? { ...p, concluida: !current } : p))
    );
    const { error } = await supabase
      .from('pendencias')
      .update({
        concluida: !current,
        concluida_at: !current ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) {
      // Reverte se falhar (RLS, conflito, etc.)
      setPendencias((prev) =>
        prev.map((p) => (p.id === id ? { ...p, concluida: current } : p))
      );
      return;
    }
    // Concluída → some da lista. Recarrega só pra manter ordenação correta.
    const { data } = await supabase
      .from('pendencias')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('concluida', false)
      .order('prioridade', { ascending: true });
    setPendencias(data ?? []);
  }

  const diasInternacao = paciente
    ? Math.floor((Date.now() - new Date(paciente.data_adm).getTime()) / 86400000)
    : 0;

  // DVAs/Sedativos: tenta parsing como Infusion[]; legado/string fica no fallback.
  const dvasRaw = (evolucao?.dvas ?? []) as unknown[];
  const sedRaw = (evolucao?.sedativos ?? []) as unknown[];
  const dvasInfusions = dvasRaw
    .map(asInfusion)
    .filter((i): i is Infusion => i !== null);
  const dvasStrings = dvasRaw
    .filter((i) => asInfusion(i) === null)
    .map((i) => (typeof i === 'string' ? i : JSON.stringify(i)));
  const sedInfusions = sedRaw
    .map(asInfusion)
    .filter((i): i is Infusion => i !== null);
  const sedStrings = sedRaw
    .filter((i) => asInfusion(i) === null)
    .map((i) => (typeof i === 'string' ? i : JSON.stringify(i)));

  const sofaValues = sofaHistory
    .map((e) => e.valor_num)
    .filter((v): v is number => typeof v === 'number');

  const TABS: { key: Tab; label: string; Icon: typeof Edit3 }[] = [
    { key: 'detalhes', label: 'Detalhes', Icon: User },
    { key: 'editar', label: 'Editar', Icon: Edit3 },
    { key: 'evolucao', label: 'Evolução', Icon: FileText },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-app-card border border-app-border rounded-2xl shadow-2xl my-4 sasi-fade-in">
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-app-tertiary rounded-lg text-app-text-muted hover:text-app-text transition z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {loading && (
          <div className="p-12 text-center text-app-text-muted text-sm">
            Carregando dados do paciente…
          </div>
        )}

        {!loading && paciente && (
          <>
            {/* HEADER + TABS */}
            <div className="px-5 pt-5 border-b border-app-border">
              <div className="flex items-start gap-3 pb-4">
                <div className="flex-1 pr-10">
                  <div className="text-xs text-app-text-muted font-mono mb-1">
                    {paciente.uti} · LEITO {paciente.leito}
                  </div>
                  <h2 className="text-xl font-bold text-app-text">{paciente.nome}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`badge gravidade-${paciente.gravidade} text-[10px] font-bold uppercase px-2 py-0.5 rounded`}
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
                  </div>
                </div>
              </div>

              {/* TABS */}
              <div className="flex gap-1">
                {TABS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition ${
                      tab === key
                        ? 'border-app-accent text-app-text'
                        : 'border-transparent text-app-text-muted hover:text-app-text-2'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="p-5">
              {/* ═══════════ TAB: DETALHES ═══════════ */}
              {tab === 'detalhes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IDENTIFICAÇÃO */}
                  <div className="md:col-span-2">
                    <SectionTitle icon={User} label="Identificação" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4">
                      <Field label="Idade" value={paciente.idade ? `${paciente.idade} anos` : null} />
                      <Field label="Peso" value={paciente.peso ? `${paciente.peso} kg` : null} />
                      <Field label="Altura" value={paciente.altura ? `${paciente.altura} cm` : null} />
                      <Field label="Alergias" value={paciente.alergias ?? 'NKDA'} />
                    </div>
                    {paciente.hd && (
                      <div className="mt-2 p-2.5 bg-app-tertiary rounded-lg text-xs text-app-text-2 leading-relaxed">
                        <span className="font-semibold text-app-text-muted">HD: </span>
                        {paciente.hd}
                      </div>
                    )}
                  </div>

                  {/* SOFA TREND */}
                  {sofaValues.length > 0 && (
                    <div className="rounded-lg border border-app-border bg-app-card p-3">
                      <MiniChart
                        values={sofaValues}
                        label={`SOFA (últimas ${sofaValues.length} medidas)`}
                        current={evolucao?.sofa_total ?? '—'}
                      />
                    </div>
                  )}

                  {/* SOFA BREAKDOWN */}
                  {evolucao?.sofa_snapshot?.components && (
                    <div className="rounded-lg border border-app-border bg-app-card p-3">
                      <SectionTitle icon={Activity} label="SOFA Breakdown" />
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(evolucao.sofa_snapshot.components).map(([sys, val]) => (
                          <div
                            key={sys}
                            className="bg-app-tertiary rounded-lg px-2 py-1 text-center min-w-[50px]"
                          >
                            <div className="text-[10px] text-app-text-muted uppercase">{sys}</div>
                            <div className={`text-sm font-bold tabular-nums ${sofaColorClass(val)}`}>
                              {val}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DVAs */}
                  {(dvasInfusions.length > 0 || dvasStrings.length > 0) && (
                    <div className="md:col-span-2">
                      <SectionTitle icon={Heart} label="DVAs" />
                      {dvasInfusions.length > 0 && (
                        <InfusionEditor
                          infusions={dvasInfusions}
                          isDVA
                          peso={paciente.peso}
                        />
                      )}
                      {dvasStrings.length > 0 && (
                        <ul className="space-y-1 mt-1">
                          {dvasStrings.map((d, i) => (
                            <li
                              key={i}
                              className="text-xs text-red-300 bg-red-950/30 px-2.5 py-1.5 rounded-lg"
                            >
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* SEDAÇÃO */}
                  {(sedInfusions.length > 0 || sedStrings.length > 0) && (
                    <div className="md:col-span-2">
                      <SectionTitle icon={Droplets} label="Sedação / Analgesia" />
                      {sedInfusions.length > 0 && (
                        <InfusionEditor
                          infusions={sedInfusions}
                          isDVA={false}
                          peso={paciente.peso}
                        />
                      )}
                      {sedStrings.length > 0 && (
                        <ul className="space-y-1 mt-1">
                          {sedStrings.map((s, i) => (
                            <li
                              key={i}
                              className="text-xs text-purple-300 bg-purple-950/30 px-2.5 py-1.5 rounded-lg"
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* SISTEMAS */}
                  {evolucao && (
                    <>
                      <SystemBlock
                        icon={Brain}
                        label="Neurológico"
                        data={evolucao.neuro as Record<string, unknown>}
                      />
                      <SystemBlock
                        icon={Wind}
                        label="Respiratório"
                        data={evolucao.resp as Record<string, unknown>}
                      />
                      <SystemBlock
                        icon={Zap}
                        label="Hemodinâmica"
                        data={evolucao.hemo as Record<string, unknown>}
                      />
                      <SystemBlock
                        icon={Thermometer}
                        label="TGI"
                        data={evolucao.tgi as Record<string, unknown>}
                      />
                      <SystemBlock
                        icon={FlaskConical}
                        label="Renal"
                        data={evolucao.renal as Record<string, unknown>}
                      />
                      <SystemBlock
                        icon={Microscope}
                        label="Infecto"
                        data={evolucao.infecto as Record<string, unknown>}
                      />
                    </>
                  )}

                  {/* IMPRESSÃO */}
                  {evolucao && Array.isArray(evolucao.impressao) && evolucao.impressao.length > 0 && (
                    <div className="md:col-span-2">
                      <SectionTitle icon={ClipboardList} label="Impressão Clínica" />
                      <ul className="space-y-1.5">
                        {(evolucao.impressao as string[]).map((imp, i) => (
                          <li key={i} className="flex gap-2 text-xs text-app-text-2">
                            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-app-text-muted mt-0.5" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CONDUTA */}
                  {evolucao && Array.isArray(evolucao.conduta) && evolucao.conduta.length > 0 && (
                    <div className="md:col-span-2">
                      <SectionTitle icon={AlertTriangle} label="Conduta" />
                      <ul className="space-y-1.5">
                        {(evolucao.conduta as string[]).map((c, i) => (
                          <li key={i} className="flex gap-2 text-xs text-app-text">
                            <span className="shrink-0 text-red-400 font-bold">{i + 1}.</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* PENDÊNCIAS */}
                  {pendencias.length > 0 && (
                    <div className="md:col-span-2">
                      <SectionTitle
                        icon={CheckCircle2}
                        label={`Pendências abertas (${pendencias.length})`}
                      />
                      <ul className="space-y-1.5">
                        {pendencias.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 transition cursor-pointer text-xs"
                            onClick={() => togglePendencia(p.id, p.concluida)}
                          >
                            {p.concluida ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-app-text-muted shrink-0" />
                            )}
                            <span
                              className={
                                p.concluida
                                  ? 'line-through text-app-text-muted'
                                  : 'text-app-text-2'
                              }
                            >
                              {p.tarefa}
                            </span>
                            <span
                              className={`ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                p.prioridade === 1
                                  ? 'bg-red-950 text-red-300'
                                  : p.prioridade === 2
                                  ? 'bg-amber-950 text-amber-300'
                                  : 'bg-app-tertiary text-app-text-muted'
                              }`}
                            >
                              P{p.prioridade}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!evolucao && (
                    <div className="md:col-span-2 text-center py-8 text-app-text-muted text-sm">
                      Nenhuma evolução registrada ainda.
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════ TAB: EDITAR (read-only) ═══════════ */}
              {tab === 'editar' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-900 text-amber-200 text-xs">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Modo somente-leitura.</strong> Edição de evoluções acontece via skill{' '}
                      <code className="bg-amber-950/60 px-1 py-0.5 rounded">sasi-ingest-export</code>{' '}
                      ou pela edge function{' '}
                      <code className="bg-amber-950/60 px-1 py-0.5 rounded">/ocr-ingest</code>, com
                      audit log (LGPD art. 46). Esta aba mostra todos os campos pra revisão.
                    </div>
                  </div>

                  <div>
                    <SectionTitle icon={User} label="Identificação" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <ReadField label="UTI" value={paciente.uti} />
                      <ReadField label="Leito" value={paciente.leito} />
                      <ReadField label="Gravidade" value={paciente.gravidade} />
                      <ReadField label="Idade" value={paciente.idade ?? null} />
                      <ReadField label="Peso (kg)" value={paciente.peso ?? null} />
                      <ReadField label="Altura (cm)" value={paciente.altura ?? null} />
                      <ReadField label="Alergias" value={paciente.alergias ?? 'NKDA'} />
                      <ReadField
                        label="Data adm"
                        value={new Date(paciente.data_adm).toLocaleDateString('pt-BR')}
                      />
                      <ReadField label="Status leito" value={paciente.status_leito} />
                    </div>
                    <div className="mt-3">
                      <ReadField label="HD" value={paciente.hd ?? null} />
                    </div>
                  </div>

                  {evolucao && (
                    <>
                      <div>
                        <SectionTitle icon={Pill} label="Última evolução" />
                        <div className="grid grid-cols-2 gap-3">
                          <ReadField label="Plantão" value={evolucao.plantao} />
                          <ReadField
                            label="Data"
                            value={new Date(evolucao.data_evolucao).toLocaleString('pt-BR')}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <SystemBlock
                          icon={Brain}
                          label="Neurológico"
                          data={evolucao.neuro as Record<string, unknown>}
                        />
                        <SystemBlock
                          icon={Wind}
                          label="Respiratório"
                          data={evolucao.resp as Record<string, unknown>}
                        />
                        <SystemBlock
                          icon={Zap}
                          label="Hemodinâmica"
                          data={evolucao.hemo as Record<string, unknown>}
                        />
                        <SystemBlock
                          icon={Thermometer}
                          label="TGI"
                          data={evolucao.tgi as Record<string, unknown>}
                        />
                        <SystemBlock
                          icon={FlaskConical}
                          label="Renal"
                          data={evolucao.renal as Record<string, unknown>}
                        />
                        <SystemBlock
                          icon={Microscope}
                          label="Infecto"
                          data={evolucao.infecto as Record<string, unknown>}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ═══════════ TAB: EVOLUÇÃO ═══════════ */}
              {tab === 'evolucao' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-app-tertiary border border-app-border text-sm text-app-text-2 leading-relaxed">
                    <div className="flex items-center gap-2 font-semibold text-app-text mb-2">
                      <FileText className="w-4 h-4" />
                      Nova evolução
                    </div>
                    <p>
                      A criação de novas evoluções acontece <strong>fora deste modal</strong> por
                      motivos de auditoria e LGPD (art. 46).
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-app-text-muted">
                      <li>
                        · Use a skill{' '}
                        <code className="bg-app-card px-1.5 py-0.5 rounded">
                          sasi-ingest-export
                        </code>{' '}
                        no Claude pra parsing estruturado
                      </li>
                      <li>
                        · Ou poste um print no canal e a edge function{' '}
                        <code className="bg-app-card px-1.5 py-0.5 rounded">/ocr-ingest</code> faz o
                        resto com audit log
                      </li>
                      <li>
                        · Toda escrita é registrada em{' '}
                        <code className="bg-app-card px-1.5 py-0.5 rounded">audit_log</code> (RLS +
                        service role)
                      </li>
                    </ul>
                  </div>

                  {evolucao && (
                    <div className="text-[11px] text-app-text-muted text-right border-t border-app-border pt-3">
                      Última evolução: {new Date(evolucao.created_at).toLocaleString('pt-BR')} ·
                      Plantão: {evolucao.plantao}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
