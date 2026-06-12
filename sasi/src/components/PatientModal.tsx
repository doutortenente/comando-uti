// ============================================================================
// SASI · PatientModal — 3 abas: Detalhes / Editar / Evolução
// Redesign: SystemBlock com cor por sistema + labels clínicos (Gemini-style)
// Editar: edição inline de identificação (pacientes) e sistemas (evolucoes).
// Pendências aceitam toggle inline (RLS = user_id).
// ============================================================================
import { useEffect, useState, useCallback } from 'react';
import {
  X, Clock, User, Activity, Heart, Droplets,
  Thermometer, Brain, Wind, Zap, FlaskConical, TestTubes,
  ClipboardList, ChevronRight, Edit3, FileText,
  CheckCircle2, Circle, Loader2, BarChart3, Bug,
  Plus, Copy, Printer, Check,
} from 'lucide-react';
import {
  supabase,
  type Paciente,
  type Evolucao,
  type Pendencia,
  type EventoClinico,
} from '../lib/supabaseClient';
import { sofaColorClass, SYSTEM_COLORS, CLINICAL_LABELS } from '../lib/drugs';
import { clinicalText, hasClinicalContent } from '../lib/clinicalFormat';
import InfusionEditor, { type Infusion } from './InfusionEditor';
import MiniChart from './MiniChart';
import { ModalSkeleton, EmptyState } from './Skeletons';
import TimelineDrawer from './TimelineDrawer';
import DiureseCalc from './DiureseCalc';
import ClinicalExtras from './ClinicalExtras';
import VitalsLabsPanel from './VitalsLabsPanel';
import { generatePassagemTurno } from '../lib/exportText';
import FichaCompleta from './FichaCompleta';
import PatientSummaryView from './PatientSummary';
import type { PatientSummary } from '../lib/supabaseClient';
import { useSupabasePatients } from '../hooks/useSupabasePatients';

type Tab = 'detalhes' | 'editar' | 'evolucao';

interface Props {
  pacienteId: string;
  onClose: () => void;
  /** Navega pra página-prontuário (view Pacientes) e fecha o modal. */
  onOpenProntuario?: (id: string) => void;
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

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between items-baseline gap-2 py-1 border-b border-app-border/50">
      <span className="text-xs text-app-text-muted shrink-0">{label}</span>
      <span className="text-xs text-app-text-2 text-right font-medium tabular-nums">{String(value)}</span>
    </div>
  );
}

function EditSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-app-text-muted mb-0.5 block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg bg-app-tertiary border border-app-border/50 text-xs text-app-text-2 min-h-[28px] focus:outline-none focus:ring-1 focus:ring-app-accent focus:border-app-accent transition"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/** Mapa de ícones por sistema clínico */
const SYSTEM_ICONS: Record<string, React.ElementType> = {
  neuro: Brain,
  resp: Wind,
  hemo: Zap,
  tgi: Thermometer,
  renal: FlaskConical,
  hemato: TestTubes,
  infecto: Bug,
};

const SYSTEM_NAMES: Record<string, string> = {
  neuro: 'Neurológico',
  resp: 'Respiratório',
  hemo: 'Hemodinâmica',
  tgi: 'TGI / Nutrição',
  renal: 'Renal / Metabólico',
  hemato: 'Hematológico',
  infecto: 'Infectologia',
};

/** Renderiza campos de um sistema com labels clínicos e cor */
function ClinicalSystemBlock({
  systemKey,
  data,
}: {
  systemKey: string;
  data: Record<string, unknown> | null | undefined;
}) {
  const color = SYSTEM_COLORS[systemKey];
  const labels = CLINICAL_LABELS[systemKey] ?? {};
  const Icon = SYSTEM_ICONS[systemKey] ?? Activity;
  const name = SYSTEM_NAMES[systemKey] ?? systemKey;

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className={`sys-${systemKey} rounded-r-xl border-l-4 p-3 ${color?.border ?? ''} ${color?.bg ?? 'bg-app-card'}`}>
        <div className={`sys-title flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2 ${color?.text ?? 'text-app-text-muted'}`}>
          <Icon className="w-3.5 h-3.5" />
          {name}
        </div>
        <p className="text-xs text-app-text-muted/60 italic">sem dados</p>
      </div>
    );
  }

  // Filtra nulos/vazios e renderiza com labels traduzidos
  const entries = Object.entries(data).filter(([, v]) => hasClinicalContent(v));

  return (
    <div className={`sys-${systemKey} rounded-r-xl border-l-4 p-3 ${color?.border ?? ''} ${color?.bg ?? 'bg-app-card'}`}>
      <div className={`sys-title flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2 pb-2 border-b border-app-border/30 ${color?.text ?? 'text-app-text-muted'}`}>
        <Icon className="w-3.5 h-3.5" />
        {name}
        <span className="text-[9px] font-normal opacity-60 ml-auto">{entries.length} campos</span>
      </div>
      <div className="space-y-0.5">
        {entries.map(([k, v]) => {
          const label = labels[k] ?? k.replace(/_/g, ' ');
          return <Field key={k} label={label} value={clinicalText(v)} />;
        })}
      </div>
    </div>
  );
}

// ── Evolução tab ──────────────────────────────────────────────────────────

function EvolucaoTab({
  pacienteId, evolucao, onCreated,
}: {
  pacienteId: string;
  evolucao: Evolucao | null;
  onCreated: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [plantao, setPlantao] = useState(() => {
    const h = new Date().getHours();
    return h >= 7 && h < 13 ? 'MANHÃ' : h >= 13 && h < 19 ? 'TARDE' : 'NOITE';
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function criarEvolucao() {
    setCreating(true);
    setMsg(null);

    const { error } = await supabase.from('evolucoes').insert({
      paciente_id: pacienteId,
      data_evolucao: new Date().toISOString(),
      plantao,
      neuro: {}, resp: {}, hemo: {}, tgi: {},
      renal: {}, hemato: {}, infecto: {},
      dvas: [], sedativos: [],
      impressao: [], conduta: [],
      sofa_snapshot: {},
    });

    if (error) {
      setMsg({ ok: false, text: `Erro: ${error.message}` });
    } else {
      setMsg({ ok: true, text: 'Evolução criada! Edite na aba Editar.' });
      onCreated();
    }
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-app-tertiary border border-app-border">
        <div className="flex items-center gap-2 font-semibold text-app-text text-sm mb-3">
          <FileText className="w-4 h-4" />
          Nova evolução
        </div>
        <div className="flex items-end gap-3">
          <EditSelect
            label="Plantão"
            value={plantao}
            onChange={setPlantao}
            options={[
              { value: 'MANHÃ', label: 'Manhã (07-13h)' },
              { value: 'TARDE', label: 'Tarde (13-19h)' },
              { value: 'NOITE', label: 'Noite (19-07h)' },
            ]}
          />
          <button
            onClick={criarEvolucao}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white text-sm font-semibold transition h-[34px]"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? 'Criando...' : 'Criar evolução'}
          </button>
        </div>
        {msg && (
          <div className={`mt-2 text-xs font-medium ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg.text}
          </div>
        )}
      </div>

      {evolucao && (
        <div className="text-[11px] text-app-text-muted border-t border-app-border pt-3">
          <span className="font-semibold">Última evolução:</span>{' '}
          {new Date(evolucao.created_at).toLocaleString('pt-BR')} · Plantão: {evolucao.plantao}
          <p className="mt-1 text-app-text-muted/60">
            Após criar, edite os sistemas clínicos na aba <strong>Editar</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function PatientModal({ pacienteId, onClose, onOpenProntuario }: Props) {
  const [tab, setTab] = useState<Tab>('detalhes');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [sofaHistory, setSofaHistory] = useState<EventoClinico[]>([]);
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [patientSummaryLoading, setPatientSummaryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [copied, setCopied] = useState(false);

  const { getPatientSummary, savePatientSummary } = useSupabasePatients();

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

    // Carrega PatientSummary (defensivo — se coluna não existir ainda, fica null)
    setPatientSummaryLoading(true);
    try {
      const ps = await getPatientSummary(pacienteId);
      setPatientSummary(ps);
    } catch {
      setPatientSummary(null);
    } finally {
      setPatientSummaryLoading(false);
    }

    setLoading(false);
  }, [pacienteId, getPatientSummary]);

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
      setPendencias((prev) =>
        prev.map((p) => (p.id === id ? { ...p, concluida: current } : p))
      );
      return;
    }
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

  // ── Editar tab state agora gerenciado pela FichaCompleta ──

  const TABS: { key: Tab; label: string; Icon: typeof Edit3 }[] = [
    { key: 'detalhes', label: 'Detalhes', Icon: User },
    { key: 'editar', label: 'Editar', Icon: Edit3 },
    { key: 'evolucao', label: 'Evolução', Icon: FileText },
  ];

  const SYSTEMS = ['neuro', 'resp', 'hemo', 'tgi', 'renal', 'hemato', 'infecto'] as const;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-app-card border border-app-border rounded-2xl shadow-2xl my-4 sasi-fade-in">
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-app-tertiary rounded-lg text-app-text-muted hover:text-app-text transition z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {loading && <ModalSkeleton />}

        {!loading && paciente && (
          <>
            {/* HEADER + TABS */}
            <div className="px-5 pt-5 border-b border-app-border">
              <div className="flex items-start gap-3 pb-4">
                <div className="flex-1 pr-10">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-black text-app-text tabular-nums">
                      {paciente.leito}
                    </span>
                    <span className="text-xs text-app-text-muted font-mono">
                      {paciente.uti}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-app-text">{paciente.nome}</h2>
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
                      <span className="text-xs text-app-text-muted">
                        {paciente.idade}a
                      </span>
                    )}
                    {paciente.peso && (
                      <span className="text-xs text-app-text-muted">
                        {paciente.peso}kg
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => {
                          const text = generatePassagemTurno(paciente, evolucao, pendencias);
                          navigator.clipboard.writeText(text).then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-[11px] font-medium transition"
                        title="Copiar passagem de turno"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-[11px] font-medium transition"
                        title="Imprimir"
                      >
                        <Printer className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setShowTimeline(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-[11px] font-medium transition"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Timeline
                      </button>
                      {onOpenProntuario && (
                        <button
                          onClick={() => onOpenProntuario(pacienteId)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-muted hover:text-app-text-2 text-[11px] font-medium transition"
                          title="Abrir prontuário do paciente"
                        >
                          <FileText className="w-3 h-3" />
                          Prontuário
                        </button>
                      )}
                    </div>
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
                <>
                  <PatientSummaryView 
                    summary={patientSummary} 
                    loading={patientSummaryLoading}
                    onSave={async (updated) => {
                      try {
                        await savePatientSummary(pacienteId, updated);
                        setPatientSummary(updated as PatientSummary);
                      } catch (e: any) {
                        const msg = e?.message?.includes('patient_summary') 
                          ? 'Coluna patient_summary ainda não existe no banco. Rode o ALTER TABLE no Supabase SQL Editor.'
                          : 'Erro ao salvar Patient Summary: ' + (e?.message || e);
                        alert(msg);
                      }
                    }}
                    onEdit={() => { /* opcional: pode focar a aba de edição */ }}
                  />
                  <div className="h-4" />
                </>
              )}

              {tab === 'detalhes' && (
                <div className="space-y-4">
                  {/* IDENTIFICAÇÃO + SOFA row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-text-muted mb-2">
                        <User className="w-3.5 h-3.5" />
                        Identificação
                      </div>
                      <div className="grid grid-cols-2 gap-x-4">
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

                    {/* SOFA TREND + BREAKDOWN */}
                    <div className="space-y-3">
                      {sofaValues.length > 0 && (
                        <div className="rounded-lg border border-app-border bg-app-card p-3">
                          <MiniChart
                            values={sofaValues}
                            label={`SOFA (últimas ${sofaValues.length} medidas)`}
                            current={evolucao?.sofa_total ?? '—'}
                          />
                        </div>
                      )}
                      {evolucao?.sofa_snapshot?.components && (
                        <div className="rounded-lg border border-app-border bg-app-card p-3">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-text-muted mb-2">
                            <Activity className="w-3.5 h-3.5" />
                            SOFA Breakdown
                          </div>
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
                    </div>
                  </div>

                  {/* DVAs */}
                  {(dvasInfusions.length > 0 || dvasStrings.length > 0) && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-300 mb-2">
                        <Heart className="w-3.5 h-3.5" />
                        Drogas Vasoativas ({dvasInfusions.length + dvasStrings.length})
                      </div>
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
                              className="text-xs text-rose-300 bg-rose-950/30 px-2.5 py-1.5 rounded-lg"
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
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-300 mb-2">
                        <Droplets className="w-3.5 h-3.5" />
                        Sedação / Analgesia ({sedInfusions.length + sedStrings.length})
                      </div>
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

                  {/* SINAIS VITAIS + LABORATÓRIO — FASE 1 da planilha */}
                  {evolucao && (
                    <VitalsLabsPanel
                      vitals={{
                        ...(evolucao.hemo as Record<string, unknown> ?? {}),
                        ...(evolucao.resp as Record<string, unknown> ?? {}),
                        tax: ((evolucao.infecto as Record<string, unknown>)?.tmax ?? (evolucao.infecto as Record<string, unknown>)?.temperatura ?? (evolucao.infecto as Record<string, unknown>)?.temp) as string | number | undefined,
                        dx: ((evolucao.tgi as Record<string, unknown>)?.dx ?? (evolucao.tgi as Record<string, unknown>)?.glicemia) as string | number | undefined,
                        bh: ((evolucao.renal as Record<string, unknown>)?.bh_ml ?? (evolucao.renal as Record<string, unknown>)?.bh ?? (evolucao.renal as Record<string, unknown>)?.balanco_hidrico) as string | number | undefined,
                        diurese: ((evolucao.renal as Record<string, unknown>)?.diurese_total_ml ?? (evolucao.renal as Record<string, unknown>)?.diurese ?? (evolucao.renal as Record<string, unknown>)?.diurese_24h) as string | number | undefined,
                      }}
                      labs={{
                        hb: (evolucao.hemato as Record<string, unknown>)?.hb as string | undefined,
                        ht: (evolucao.hemato as Record<string, unknown>)?.ht as string | undefined,
                        plaq: (evolucao.hemato as Record<string, unknown>)?.plaquetas as string | undefined ?? (evolucao.hemato as Record<string, unknown>)?.plaq as string | undefined,
                        leuco: (evolucao.hemato as Record<string, unknown>)?.leucocitos as string | undefined ?? (evolucao.hemato as Record<string, unknown>)?.leuco as string | undefined,
                        cr: (evolucao.renal as Record<string, unknown>)?.creatinina as string | undefined ?? (evolucao.renal as Record<string, unknown>)?.cr as string | undefined,
                        ur: (evolucao.renal as Record<string, unknown>)?.ureia as string | undefined ?? (evolucao.renal as Record<string, unknown>)?.ur as string | undefined,
                        na: (evolucao.renal as Record<string, unknown>)?.na as string | undefined ?? (evolucao.renal as Record<string, unknown>)?.sodio as string | undefined,
                        k: (evolucao.renal as Record<string, unknown>)?.k as string | undefined ?? (evolucao.renal as Record<string, unknown>)?.potassio as string | undefined,
                        mg: (evolucao.renal as Record<string, unknown>)?.mg as string | undefined,
                        cai: (evolucao.renal as Record<string, unknown>)?.ca as string | undefined ?? (evolucao.renal as Record<string, unknown>)?.cai as string | undefined,
                        lactato: (evolucao.hemo as Record<string, unknown>)?.lactato as string | undefined,
                        pcr: (evolucao.infecto as Record<string, unknown>)?.pcr as string | undefined,
                        ph: (evolucao.renal as Record<string, unknown>)?.ph as string | undefined,
                        pco2: (evolucao.resp as Record<string, unknown>)?.paco2 as string | undefined,
                        hco3: (evolucao.renal as Record<string, unknown>)?.bic as string | undefined ?? (evolucao.renal as Record<string, unknown>)?.bicarbonato as string | undefined,
                        bb: (evolucao.hemato as Record<string, unknown>)?.bilirrubina as string | undefined ?? (evolucao.tgi as Record<string, unknown>)?.bilirrubina as string | undefined,
                      }}
                    />
                  )}

                  {/* SISTEMAS CLÍNICOS — grid 2 colunas com cor por sistema */}
                  {evolucao && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {SYSTEMS.map((sys) => {
                        const data = evolucao[sys] as Record<string, unknown> | null | undefined;
                        // Hemo ocupa full width se tiver muitos dados
                        const isWide = sys === 'hemo' && data && Object.keys(data).length > 5;
                        return (
                          <div key={sys} className={isWide ? 'lg:col-span-2' : ''}>
                            <ClinicalSystemBlock systemKey={sys} data={data} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* IMPRESSÃO CLÍNICA */}
                  {evolucao && Array.isArray(evolucao.impressao) && evolucao.impressao.length > 0 && (
                    <div className="rounded-r-xl border-l-4 border-l-red-500 bg-red-950/10 p-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-300 mb-2">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Problemas Ativos / Impressão ({(evolucao.impressao as string[]).length})
                      </div>
                      <ul className="space-y-1.5">
                        {(evolucao.impressao as string[]).map((imp, i) => (
                          <li key={i} className="flex gap-2 text-xs text-app-text-2">
                            <span className="shrink-0 text-red-400 font-bold">{i + 1}.</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CONDUTA */}
                  {evolucao && Array.isArray(evolucao.conduta) && evolucao.conduta.length > 0 && (
                    <div className="rounded-r-xl border-l-4 border-l-emerald-500 bg-emerald-950/10 p-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300 mb-2">
                        <ChevronRight className="w-3.5 h-3.5" />
                        Plano / Conduta ({(evolucao.conduta as string[]).length})
                      </div>
                      <ul className="space-y-1.5">
                        {(evolucao.conduta as string[]).map((c, i) => (
                          <li key={i} className="flex gap-2 text-xs text-app-text-2">
                            <span className="shrink-0 text-emerald-400 font-bold">{i + 1}.</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* PENDÊNCIAS */}
                  {pendencias.length > 0 && (
                    <div className="rounded-r-xl border-l-4 border-l-amber-500 bg-amber-950/10 p-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pendências abertas ({pendencias.length})
                      </div>
                      <ul className="space-y-1.5">
                        {pendencias.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-app-tertiary/50 hover:bg-app-tertiary/70 transition cursor-pointer text-xs"
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

                  {/* DIURESE CALC */}
                  {paciente && (
                    <DiureseCalc pesoInicial={paciente.peso} />
                  )}

                  {/* REFERÊNCIAS CLÍNICAS */}
                  <ClinicalExtras />

                  {!evolucao && (
                    <EmptyState
                      icon={FileText}
                      title="Nenhuma evolução registrada"
                      description="Use a skill sasi-ingest-export ou a edge function /ocr-ingest pra registrar a primeira evolução."
                    />
                  )}
                </div>
              )}

              {/* ═══════════ TAB: EDITAR — Ficha completa estilo Gemini ═══════════ */}
              {tab === 'editar' && (
                <FichaCompleta
                  paciente={paciente}
                  evolucao={evolucao}
                  pendencias={pendencias}
                  onSaved={() => void load()}
                />
              )}

              {/* ═══════════ TAB: EVOLUÇÃO ═══════════ */}
              {tab === 'evolucao' && (
                <EvolucaoTab
                  pacienteId={pacienteId}
                  evolucao={evolucao}
                  onCreated={load}
                />
              )}
            </div>
          </>
        )}
      </div>

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
