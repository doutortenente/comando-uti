// ============================================================================
// SASI · SplitView — modo "Round" (lista lateral + preview clínico denso)
// Redesign: preview mostra badges, DVAs, sistemas resumidos, pendências
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  BedDouble, Edit3, Heart, Droplets, AlertTriangle, Clock,
  Brain, Wind, Zap, Thermometer, FlaskConical,
  TestTubes, Bug, CheckCircle2, Activity,
} from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';
import { supabase, type Evolucao, type Pendencia } from '../lib/supabaseClient';
import { sofaColorClass, SYSTEM_COLORS, CLINICAL_LABELS, checkVitalAlert } from '../lib/drugs';
import LeitoCard from './LeitoCard';
import { EmptyState } from './Skeletons';

interface Props {
  patients: DashboardRow[];
  onOpenFull: (id: string) => void;
}

const SYSTEM_ICONS: Record<string, React.ElementType> = {
  neuro: Brain, resp: Wind, hemo: Zap, tgi: Thermometer,
  renal: FlaskConical, hemato: TestTubes, infecto: Bug,
};
const SYSTEM_NAMES: Record<string, string> = {
  neuro: 'Neuro', resp: 'Resp', hemo: 'Hemo', tgi: 'TGI',
  renal: 'Renal', hemato: 'Hemato', infecto: 'Infecto',
};
const SYSTEMS = ['neuro', 'resp', 'hemo', 'tgi', 'renal', 'hemato', 'infecto'] as const;

/** Compact system summary — top 3 non-null fields */
function SystemSummary({ systemKey, data }: { systemKey: string; data?: Record<string, unknown> | null }) {
  const color = SYSTEM_COLORS[systemKey];
  const labels = CLINICAL_LABELS[systemKey] ?? {};
  const Icon = SYSTEM_ICONS[systemKey] ?? Activity;
  const name = SYSTEM_NAMES[systemKey] ?? systemKey;

  const entries = data
    ? Object.entries(data).filter(([, v]) => v != null && v !== '' && v !== false).slice(0, 3)
    : [];

  if (entries.length === 0) return null;

  return (
    <div className={`sys-${systemKey} rounded-r-lg border-l-2 p-2 ${color?.border ?? ''} ${color?.bg ?? 'bg-app-card'}`}>
      <div className={`sys-title flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${color?.text ?? 'text-app-text-muted'}`}>
        <Icon className="w-3 h-3" />
        {name}
      </div>
      <div className="space-y-0.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 text-[11px]">
            <span className="text-app-text-muted truncate">{labels[k] ?? k.replace(/_/g, ' ')}</span>
            <span className="text-app-text-2 font-medium tabular-nums shrink-0">
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SplitView({ patients, onOpenFull }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    patients[0]?.paciente_id ?? null
  );
  const selected = patients.find((p) => p.paciente_id === selectedId) ?? patients[0];

  // Fetch evolução + pendências do paciente selecionado
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadPreview = useCallback(async (pacienteId: string) => {
    setLoadingPreview(true);
    const [evolRes, pendRes] = await Promise.all([
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
        .order('prioridade', { ascending: true })
        .limit(5),
    ]);
    setEvolucao(evolRes.data?.[0] ?? null);
    setPendencias(pendRes.data ?? []);
    setLoadingPreview(false);
  }, []);

  useEffect(() => {
    if (selected?.paciente_id) {
      void loadPreview(selected.paciente_id);
    }
  }, [selected?.paciente_id, loadPreview]);

  if (!selected) {
    return (
      <EmptyState
        icon={BedDouble}
        title="Nenhum paciente ativo"
        description="Admita um paciente pra usar o modo Round."
      />
    );
  }

  const dvaCount = Array.isArray(selected.dvas) ? selected.dvas.length : 0;
  const sedCount = Array.isArray(selected.sedativos) ? selected.sedativos.length : 0;

  return (
    <div className="grid gap-3 h-[calc(100vh-220px)]" style={{ gridTemplateColumns: '300px 1fr' }}>
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

      {/* Preview — agora com dados clínicos */}
      <div className="overflow-y-auto rounded-xl border border-app-border bg-app-card p-5 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-app-text tabular-nums">{selected.leito}</span>
            <span className="text-xs text-app-text-muted font-mono">{selected.uti}</span>
          </div>
          <h2 className="text-lg font-bold text-app-text">{selected.nome}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`gravidade-${selected.gravidade} text-[10px] px-2 py-0.5 rounded font-bold uppercase`}>
              {selected.gravidade}
            </span>
            <span className={`text-sm font-bold ${sofaColorClass(selected.sofa_total)}`}>
              SOFA {selected.sofa_total ?? '—'}
            </span>
            <span className="text-xs text-app-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" /> D{selected.dias_internacao}
            </span>
            <span className="text-xs text-app-text-muted">
              {selected.idade ?? '?'}a / {selected.peso ?? '?'}kg
            </span>
          </div>
        </div>

        {/* Badge strip */}
        <div className="flex flex-wrap gap-1.5">
          {dvaCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-rose-950 text-rose-300">
              <Heart className="w-3 h-3" /> DVA {dvaCount}
            </span>
          )}
          {sedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-purple-950 text-purple-300">
              <Droplets className="w-3 h-3" /> Sed {sedCount}
            </span>
          )}
          {selected.pendencias_abertas > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-amber-950 text-amber-300">
              <AlertTriangle className="w-3 h-3" /> {selected.pendencias_abertas} pend.
            </span>
          )}
        </div>

        {/* HD */}
        {selected.hd && (
          <div className="p-3 rounded-lg bg-app-tertiary text-xs text-app-text-2 leading-relaxed">
            <span className="font-semibold text-app-text-muted">HD: </span>
            {selected.hd}
          </div>
        )}

        {/* SINAIS VITAIS strip — mini PAINEL GERAL inline */}
        {evolucao && (() => {
          const hemo = evolucao.hemo as Record<string, unknown> | null;
          const resp = evolucao.resp as Record<string, unknown> | null;
          const infecto = evolucao.infecto as Record<string, unknown> | null;
          const renal = evolucao.renal as Record<string, unknown> | null;
          const items: { key: string; label: string; val: unknown; unit: string }[] = [
            { key: 'pam', label: 'PAM', val: hemo?.pam ?? hemo?.pam_media, unit: '' },
            { key: 'fc', label: 'FC', val: hemo?.fc, unit: '' },
            { key: 'spo2', label: 'SpO₂', val: resp?.spo2, unit: '%' },
            { key: 'tax', label: 'TAX', val: infecto?.tmax ?? infecto?.temperatura ?? infecto?.temp, unit: '°' },
            { key: 'fr', label: 'FR', val: resp?.fr ?? resp?.fr_total, unit: '' },
          ];
          const filled = items.filter(i => i.val != null && i.val !== '');
          if (filled.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-2">
              {filled.map(({ key, label, val, unit }) => {
                const n = typeof val === 'string' ? parseFloat(val) : Number(val);
                const status = !Number.isNaN(n) ? checkVitalAlert(key, n) : 'ok';
                const color = status === 'high' ? 'text-red-400 bg-red-950/30' : status === 'low' ? 'text-sky-400 bg-sky-950/30' : 'text-app-text-2 bg-app-tertiary/50';
                return (
                  <div key={key} className={`flex flex-col items-center px-2 py-1 rounded-lg ${color}`}>
                    <span className="text-[8px] font-bold uppercase opacity-70">{label}</span>
                    <span className="text-sm font-black tabular-nums">{String(val)}{unit}</span>
                  </div>
                );
              })}
              {(() => {
                const bh = renal?.bh ?? renal?.balanco_hidrico;
                if (bh == null || bh === '') return null;
                const n = typeof bh === 'string' ? parseFloat(bh) : Number(bh);
                return (
                  <div className={`flex flex-col items-center px-2 py-1 rounded-lg ${!Number.isNaN(n) && n > 0 ? 'text-amber-400 bg-amber-950/20' : 'text-sky-400 bg-sky-950/20'}`}>
                    <span className="text-[8px] font-bold uppercase opacity-70">BH</span>
                    <span className="text-sm font-black tabular-nums">{!Number.isNaN(n) && n > 0 ? '+' : ''}{String(bh)}</span>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Sistemas — resumo compacto */}
        {loadingPreview ? (
          <div className="text-xs text-app-text-muted animate-pulse py-4 text-center">
            Carregando evolução...
          </div>
        ) : evolucao ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SYSTEMS.map((sys) => (
              <SystemSummary
                key={sys}
                systemKey={sys}
                data={evolucao[sys] as Record<string, unknown> | null}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-app-text-muted/60 italic py-2">
            Sem evolução registrada
          </div>
        )}

        {/* Pendências rápidas */}
        {pendencias.length > 0 && (
          <div className="rounded-r-lg border-l-2 border-l-amber-500 bg-amber-950/10 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
              Pendências ({pendencias.length})
            </div>
            <ul className="space-y-1">
              {pendencias.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center gap-1.5 text-[11px] text-app-text-2">
                  <CheckCircle2 className="w-3 h-3 text-app-text-muted shrink-0" />
                  <span className="truncate">{p.tarefa}</span>
                  <span className={`ml-auto text-[9px] font-bold px-1 rounded ${
                    p.prioridade === 1 ? 'bg-red-950 text-red-300' : 'bg-app-tertiary text-app-text-muted'
                  }`}>
                    P{p.prioridade}
                  </span>
                </li>
              ))}
              {pendencias.length > 3 && (
                <li className="text-[10px] text-app-text-muted">
                  +{pendencias.length - 3} mais...
                </li>
              )}
            </ul>
          </div>
        )}

        <button
          onClick={() => onOpenFull(selected.paciente_id)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover text-white text-sm font-semibold transition"
        >
          <Edit3 className="w-4 h-4" />
          Abrir ficha completa
        </button>
      </div>
    </div>
  );
}
