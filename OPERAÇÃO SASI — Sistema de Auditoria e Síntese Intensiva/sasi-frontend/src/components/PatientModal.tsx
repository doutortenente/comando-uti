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
  ClipboardList, ChevronRight, Pill, Edit3, FileText,
  CheckCircle2, Circle, Save, Loader2, BarChart3, Bug,
  Plus, Trash2, Copy, Printer, Check,
} from 'lucide-react';
import {
  supabase,
  type Paciente,
  type Evolucao,
  type Pendencia,
  type EventoClinico,
} from '../lib/supabaseClient';
import { sofaColorClass, SYSTEM_COLORS, CLINICAL_LABELS } from '../lib/drugs';
import InfusionEditor, { type Infusion } from './InfusionEditor';
import MiniChart from './MiniChart';
import { ModalSkeleton, EmptyState } from './Skeletons';
import TimelineDrawer from './TimelineDrawer';
import DiureseCalc from './DiureseCalc';
import ClinicalExtras from './ClinicalExtras';
import VitalsLabsPanel from './VitalsLabsPanel';
import { generatePassagemTurno } from '../lib/exportText';

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

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between items-baseline gap-2 py-1 border-b border-app-border/50">
      <span className="text-xs text-app-text-muted shrink-0">{label}</span>
      <span className="text-xs text-app-text-2 text-right font-medium tabular-nums">{String(value)}</span>
    </div>
  );
}

function EditField({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number' | 'date';
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-app-text-muted mb-0.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full px-2.5 py-1.5 rounded-lg bg-app-tertiary border border-app-border/50 text-xs text-app-text-2 min-h-[28px] focus:outline-none focus:ring-1 focus:ring-app-accent focus:border-app-accent transition placeholder:text-app-text-muted/40"
      />
    </div>
  );
}

function EditTextarea({
  label, value, onChange, rows = 2, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-app-text-muted mb-0.5 block">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder ?? label}
        className="w-full px-2.5 py-1.5 rounded-lg bg-app-tertiary border border-app-border/50 text-xs text-app-text-2 focus:outline-none focus:ring-1 focus:ring-app-accent focus:border-app-accent transition resize-y placeholder:text-app-text-muted/40"
      />
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

function EditableSystemBlock({
  systemKey, data, labels, onChange,
}: {
  systemKey: string;
  data: Record<string, unknown>;
  labels: Record<string, string>;
  onChange: (updated: Record<string, unknown>) => void;
}) {
  const color = SYSTEM_COLORS[systemKey];
  const Icon = SYSTEM_ICONS[systemKey] ?? Activity;
  const name = SYSTEM_NAMES[systemKey] ?? systemKey;

  const entries = Object.entries(data);
  const [newKey, setNewKey] = useState('');

  function updateField(key: string, val: string) {
    onChange({ ...data, [key]: val === '' ? null : val });
  }

  function removeField(key: string) {
    const copy = { ...data };
    delete copy[key];
    onChange(copy);
  }

  function addField() {
    const k = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!k || data[k] != null) return;
    onChange({ ...data, [k]: '' });
    setNewKey('');
  }

  return (
    <div className={`sys-${systemKey} rounded-r-xl border-l-4 p-3 ${color?.border ?? ''} ${color?.bg ?? 'bg-app-card'}`}>
      <div className={`sys-title flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2 pb-2 border-b border-app-border/30 ${color?.text ?? 'text-app-text-muted'}`}>
        <Icon className="w-3.5 h-3.5" />
        {name}
        <span className="text-[9px] font-normal opacity-60 ml-auto">{entries.length} campos</span>
      </div>
      <div className="space-y-1.5">
        {entries.map(([k, v]) => {
          const label = labels[k] ?? k.replace(/_/g, ' ');
          return (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-[10px] text-app-text-muted w-24 shrink-0 truncate" title={label}>
                {label}
              </span>
              <input
                type="text"
                value={v == null ? '' : String(v)}
                onChange={(e) => updateField(k, e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-app-tertiary/80 border border-app-border/30 text-xs text-app-text-2 focus:outline-none focus:ring-1 focus:ring-app-accent transition"
              />
              <button
                onClick={() => removeField(k)}
                className="p-0.5 text-app-text-muted/40 hover:text-red-400 transition"
                title="Remover campo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 pt-1 border-t border-app-border/20">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addField()}
            placeholder="novo campo..."
            className="flex-1 px-2 py-1 rounded bg-app-tertiary/50 border border-dashed border-app-border/30 text-[10px] text-app-text-muted focus:outline-none focus:ring-1 focus:ring-app-accent transition placeholder:text-app-text-muted/30"
          />
          <button
            onClick={addField}
            className="p-0.5 text-app-text-muted/40 hover:text-emerald-400 transition"
            title="Adicionar campo"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
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
  const entries = Object.entries(data).filter(
    ([, v]) => v != null && v !== '' && v !== false
  );

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
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return <Field key={k} label={label} value={val} />;
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

export default function PatientModal({ pacienteId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('detalhes');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [sofaHistory, setSofaHistory] = useState<EventoClinico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // ── Editar tab state ──
  const [pacDraft, setPacDraft] = useState<Record<string, string>>({});
  const [evolDraft, setEvolDraft] = useState<Record<string, Record<string, unknown>>>({});
  const [impressaoDraft, setImpressaoDraft] = useState<string[]>([]);
  const [condutaDraft, setCondutaDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!paciente) return;
    setPacDraft({
      nome: paciente.nome ?? '',
      uti: paciente.uti ?? '',
      leito: paciente.leito ?? '',
      idade: paciente.idade != null ? String(paciente.idade) : '',
      peso: paciente.peso != null ? String(paciente.peso) : '',
      altura: paciente.altura != null ? String(paciente.altura) : '',
      alergias: paciente.alergias ?? '',
      hd: paciente.hd ?? '',
      gravidade: paciente.gravidade ?? 'estavel',
      status_leito: paciente.status_leito ?? 'ativo',
    });
  }, [paciente]);

  useEffect(() => {
    if (!evolucao) { setEvolDraft({}); setImpressaoDraft([]); setCondutaDraft([]); return; }
    const draft: Record<string, Record<string, unknown>> = {};
    for (const sys of ['neuro', 'resp', 'hemo', 'tgi', 'renal', 'hemato', 'infecto'] as const) {
      draft[sys] = { ...(evolucao[sys] as Record<string, unknown> ?? {}) };
    }
    setEvolDraft(draft);
    setImpressaoDraft([...(evolucao.impressao as string[] ?? [])]);
    setCondutaDraft([...(evolucao.conduta as string[] ?? [])]);
  }, [evolucao]);

  async function handleSave() {
    if (!paciente) return;
    setSaving(true);
    setSaveMsg(null);

    const pacUpdate: Record<string, unknown> = {
      nome: pacDraft.nome || paciente.nome,
      uti: pacDraft.uti || paciente.uti,
      leito: pacDraft.leito || paciente.leito,
      idade: pacDraft.idade ? Number(pacDraft.idade) : null,
      peso: pacDraft.peso ? Number(pacDraft.peso) : null,
      altura: pacDraft.altura ? Number(pacDraft.altura) : null,
      alergias: pacDraft.alergias || null,
      hd: pacDraft.hd || null,
      gravidade: pacDraft.gravidade,
      status_leito: pacDraft.status_leito,
    };

    const { error: pacErr } = await supabase
      .from('pacientes')
      .update(pacUpdate)
      .eq('id', paciente.id);

    if (pacErr) {
      setSaveMsg({ ok: false, text: `Erro ao salvar paciente: ${pacErr.message}` });
      setSaving(false);
      return;
    }

    if (evolucao) {
      const cleanDraft: Record<string, unknown> = {};
      for (const [sys, fields] of Object.entries(evolDraft)) {
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v != null && v !== '') cleaned[k] = v;
        }
        cleanDraft[sys] = cleaned;
      }
      const evolUpdate = {
        ...cleanDraft,
        impressao: impressaoDraft.filter(s => s.trim() !== ''),
        conduta: condutaDraft.filter(s => s.trim() !== ''),
      };

      const { error: evolErr } = await supabase
        .from('evolucoes')
        .update(evolUpdate)
        .eq('id', evolucao.id);

      if (evolErr) {
        setSaveMsg({ ok: false, text: `Paciente salvo, mas erro na evolução: ${evolErr.message}` });
        setSaving(false);
        return;
      }
    }

    setSaveMsg({ ok: true, text: 'Salvo com sucesso!' });
    setSaving(false);
    void load();
    setTimeout(() => setSaveMsg(null), 3000);
  }

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
                        bh: ((evolucao.renal as Record<string, unknown>)?.bh ?? (evolucao.renal as Record<string, unknown>)?.balanco_hidrico) as string | number | undefined,
                        diurese: ((evolucao.renal as Record<string, unknown>)?.diurese ?? (evolucao.renal as Record<string, unknown>)?.diurese_24h) as string | number | undefined,
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

              {/* ═══════════ TAB: EDITAR ═══════════ */}
              {tab === 'editar' && (
                <div className="space-y-4">
                  {/* Save bar */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-app-tertiary/50 border border-app-border sticky top-0 z-10">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white text-sm font-semibold transition"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                    {saveMsg && (
                      <span className={`text-xs font-medium ${saveMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {saveMsg.text}
                      </span>
                    )}
                    <span className="text-[10px] text-app-text-muted ml-auto">
                      Edite os campos abaixo e clique Salvar
                    </span>
                  </div>

                  {/* IDENTIFICAÇÃO */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-text-muted mb-2">
                      <User className="w-3.5 h-3.5" />
                      Identificação
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <EditField
                        label="Nome"
                        value={pacDraft.nome ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, nome: v }))}
                      />
                      <EditSelect
                        label="UTI"
                        value={pacDraft.uti ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, uti: v }))}
                        options={[
                          { value: 'UTI2', label: 'UTI 2' },
                          { value: 'UTI3', label: 'UTI 3' },
                          { value: 'UTI4', label: 'UTI 4' },
                        ]}
                      />
                      <EditField
                        label="Leito"
                        value={pacDraft.leito ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, leito: v }))}
                      />
                      <EditSelect
                        label="Gravidade"
                        value={pacDraft.gravidade ?? 'estavel'}
                        onChange={(v) => setPacDraft(d => ({ ...d, gravidade: v }))}
                        options={[
                          { value: 'estavel', label: 'Estável' },
                          { value: 'moderado', label: 'Moderado' },
                          { value: 'grave', label: 'Grave' },
                          { value: 'critico', label: 'Crítico' },
                          { value: 'obito', label: 'Óbito' },
                        ]}
                      />
                      <EditField
                        label="Idade"
                        value={pacDraft.idade ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, idade: v }))}
                        type="number"
                        placeholder="anos"
                      />
                      <EditField
                        label="Peso (kg)"
                        value={pacDraft.peso ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, peso: v }))}
                        type="number"
                        placeholder="kg"
                      />
                      <EditField
                        label="Altura (cm)"
                        value={pacDraft.altura ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, altura: v }))}
                        type="number"
                        placeholder="cm"
                      />
                      <EditField
                        label="Alergias"
                        value={pacDraft.alergias ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, alergias: v }))}
                        placeholder="NKDA"
                      />
                      <EditSelect
                        label="Status leito"
                        value={pacDraft.status_leito ?? 'ativo'}
                        onChange={(v) => setPacDraft(d => ({ ...d, status_leito: v }))}
                        options={[
                          { value: 'ativo', label: 'Ativo' },
                          { value: 'alta', label: 'Alta' },
                          { value: 'obito', label: 'Óbito' },
                          { value: 'transferencia', label: 'Transferência' },
                        ]}
                      />
                    </div>
                    <div className="mt-3">
                      <EditTextarea
                        label="HD (Hipótese Diagnóstica)"
                        value={pacDraft.hd ?? ''}
                        onChange={(v) => setPacDraft(d => ({ ...d, hd: v }))}
                        rows={3}
                        placeholder="Diagnóstico principal e comorbidades..."
                      />
                    </div>
                  </div>

                  {/* SISTEMAS CLÍNICOS — editáveis */}
                  {evolucao ? (
                    <>
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-app-text-muted mb-2">
                          <Pill className="w-3.5 h-3.5" />
                          Evolução — sistemas clínicos
                          <span className="text-[9px] font-normal opacity-60 ml-2">
                            ({new Date(evolucao.data_evolucao).toLocaleDateString('pt-BR')} · {evolucao.plantao})
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {SYSTEMS.map((sys) => (
                          <EditableSystemBlock
                            key={sys}
                            systemKey={sys}
                            data={evolDraft[sys] ?? {}}
                            labels={CLINICAL_LABELS[sys] ?? {}}
                            onChange={(updated) => setEvolDraft(d => ({ ...d, [sys]: updated }))}
                          />
                        ))}
                      </div>

                      {/* IMPRESSÃO */}
                      <div className="rounded-r-xl border-l-4 border-l-red-500 bg-red-950/10 p-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-300 mb-2">
                          <ClipboardList className="w-3.5 h-3.5" />
                          Problemas Ativos / Impressão
                        </div>
                        <div className="space-y-1.5">
                          {impressaoDraft.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-red-400 font-bold text-xs shrink-0">{i + 1}.</span>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const copy = [...impressaoDraft];
                                  copy[i] = e.target.value;
                                  setImpressaoDraft(copy);
                                }}
                                className="flex-1 px-2 py-1 rounded bg-app-tertiary/80 border border-app-border/30 text-xs text-app-text-2 focus:outline-none focus:ring-1 focus:ring-app-accent transition"
                              />
                              <button
                                onClick={() => setImpressaoDraft(impressaoDraft.filter((_, j) => j !== i))}
                                className="p-0.5 text-app-text-muted/40 hover:text-red-400 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setImpressaoDraft([...impressaoDraft, ''])}
                            className="flex items-center gap-1 text-[10px] text-app-text-muted hover:text-red-300 transition pt-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar problema
                          </button>
                        </div>
                      </div>

                      {/* CONDUTA */}
                      <div className="rounded-r-xl border-l-4 border-l-emerald-500 bg-emerald-950/10 p-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300 mb-2">
                          <ChevronRight className="w-3.5 h-3.5" />
                          Plano / Conduta
                        </div>
                        <div className="space-y-1.5">
                          {condutaDraft.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold text-xs shrink-0">{i + 1}.</span>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const copy = [...condutaDraft];
                                  copy[i] = e.target.value;
                                  setCondutaDraft(copy);
                                }}
                                className="flex-1 px-2 py-1 rounded bg-app-tertiary/80 border border-app-border/30 text-xs text-app-text-2 focus:outline-none focus:ring-1 focus:ring-app-accent transition"
                              />
                              <button
                                onClick={() => setCondutaDraft(condutaDraft.filter((_, j) => j !== i))}
                                className="p-0.5 text-app-text-muted/40 hover:text-red-400 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setCondutaDraft([...condutaDraft, ''])}
                            className="flex items-center gap-1 text-[10px] text-app-text-muted hover:text-emerald-300 transition pt-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar conduta
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="Nenhuma evolução registrada"
                      description="Crie uma evolução na aba Evolução para editar sistemas clínicos."
                    />
                  )}

                  {/* Bottom save */}
                  <div className="flex items-center gap-3 pt-2 border-t border-app-border">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white text-sm font-semibold transition"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                    {saveMsg && (
                      <span className={`text-xs font-medium ${saveMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {saveMsg.text}
                      </span>
                    )}
                  </div>
                </div>
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
