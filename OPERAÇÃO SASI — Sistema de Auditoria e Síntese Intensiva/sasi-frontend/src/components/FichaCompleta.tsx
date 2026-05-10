// ============================================================================
// SASI · FichaCompleta — replica EXATA da PatientCard do app Gemini
// Edição inline em todos os 7 sistemas + identificação + impressão/conduta/pendências
// ============================================================================
import { useState, useCallback, useEffect } from 'react';
import {
  Brain, Wind, Heart, Utensils, FlaskConical, TestTube, Bug,
  Syringe, Clipboard, Droplets, Activity, Pill, AlertTriangle,
  Microscope, AlertCircle, ListChecks, ClipboardList, Trash2, Plus,
  Save, Loader2, Calculator, Flame, ShieldAlert,
} from 'lucide-react';
import type { Paciente, Evolucao, Pendencia } from '../lib/supabaseClient';
import { supabase } from '../lib/supabaseClient';
import {
  DVA_DICT, SEDACAO_DICT, calculateDose, ESCALAS_NEURO,
  isHigh, isLow, formatDiureseEfetiva,
} from '../lib/drugs';
import InlineInput from './clinical/InlineInput';
import NotasField from './clinical/NotasField';
import Accordion from './clinical/Accordion';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Infusao {
  droga?: string;
  diluicao?: number;
  vazao?: string | number;
}
interface Escala {
  nome?: string;
  valor?: string;
}
interface AtbItem {
  nome?: string;
  nomePersonalizado?: string;
  dose?: string;
  dias?: string;
}
interface CulturaItem {
  tipo?: string;
  data?: string;
  status?: string;
  detalhe?: string;
}

type SystemKey = 'neuro' | 'resp' | 'hemo' | 'tgi' | 'renal' | 'hemato' | 'infecto';

interface Props {
  paciente: Paciente;
  evolucao: Evolucao | null;
  pendencias: Pendencia[];
  onSaved: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function FichaCompleta({ paciente, evolucao, pendencias, onSaved }: Props) {
  // Drafts
  const [pacDraft, setPacDraft] = useState<Partial<Paciente>>({});
  const [neuroDraft, setNeuroDraft] = useState<Record<string, unknown>>({});
  const [respDraft, setRespDraft] = useState<Record<string, unknown>>({});
  const [hemoDraft, setHemoDraft] = useState<Record<string, unknown>>({});
  const [tgiDraft, setTgiDraft] = useState<Record<string, unknown>>({});
  const [renalDraft, setRenalDraft] = useState<Record<string, unknown>>({});
  const [hematoDraft, setHematoDraft] = useState<Record<string, unknown>>({});
  const [infectoDraft, setInfectoDraft] = useState<Record<string, unknown>>({});
  const [dvasDraft, setDvasDraft] = useState<Infusao[]>([]);
  const [sedDraft, setSedDraft] = useState<Infusao[]>([]);
  const [impressaoDraft, setImpressaoDraft] = useState<string[]>(['', '', '', '']);
  const [condutaDraft, setCondutaDraft] = useState<string[]>(['', '', '', '']);
  const [pendenciasDraft, setPendenciasDraft] = useState<Array<{ id?: string; tarefa: string; concluida: boolean }>>([]);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Accordions state
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({
    sedativos: false, escalas: false, dvas: false, infecto: false,
  });
  const toggle = (k: string) => setOpenSec(o => ({ ...o, [k]: !o[k] }));

  // Init drafts from props
  useEffect(() => {
    setPacDraft({
      nome: paciente.nome ?? '',
      leito: paciente.leito ?? '',
      hd: paciente.hd ?? '',
      idade: paciente.idade,
      peso: paciente.peso,
      altura: paciente.altura,
      alergias: paciente.alergias ?? '',
      gravidade: paciente.gravidade,
      data_adm: paciente.data_adm,
    });
  }, [paciente]);

  useEffect(() => {
    if (!evolucao) {
      setNeuroDraft({}); setRespDraft({}); setHemoDraft({}); setTgiDraft({});
      setRenalDraft({}); setHematoDraft({}); setInfectoDraft({});
      setDvasDraft([]); setSedDraft([]);
      setImpressaoDraft(['', '', '', '']); setCondutaDraft(['', '', '', '']);
      return;
    }
    setNeuroDraft({ ...(evolucao.neuro ?? {}) });
    setRespDraft({ ...(evolucao.resp ?? {}) });
    setHemoDraft({ ...(evolucao.hemo ?? {}) });
    setTgiDraft({ ...(evolucao.tgi ?? {}) });
    setRenalDraft({ ...(evolucao.renal ?? {}) });
    setHematoDraft({ ...(evolucao.hemato ?? {}) });
    setInfectoDraft({ ...(evolucao.infecto ?? {}) });
    setDvasDraft((evolucao.dvas ?? []) as Infusao[]);
    setSedDraft((evolucao.sedativos ?? []) as Infusao[]);
    const imp = (evolucao.impressao ?? []) as string[];
    const cond = (evolucao.conduta ?? []) as string[];
    setImpressaoDraft([...imp, ...Array(Math.max(0, 4 - imp.length)).fill('')].slice(0, 4));
    setCondutaDraft([...cond, ...Array(Math.max(0, 4 - cond.length)).fill('')].slice(0, 4));
  }, [evolucao]);

  useEffect(() => {
    const arr: Array<{ id?: string; tarefa: string; concluida: boolean }> =
      pendencias.map(p => ({ id: p.id, tarefa: p.tarefa, concluida: p.concluida }));
    while (arr.length < 3) arr.push({ tarefa: '', concluida: false });
    setPendenciasDraft(arr);
  }, [pendencias]);

  // ─── Helpers para draft de sistema ─────────────────────────────────────
  function setDraft(sys: SystemKey, patch: Partial<Record<string, unknown>>) {
    const updaters = {
      neuro: setNeuroDraft, resp: setRespDraft, hemo: setHemoDraft,
      tgi: setTgiDraft, renal: setRenalDraft, hemato: setHematoDraft,
      infecto: setInfectoDraft,
    };
    updaters[sys](d => ({ ...d, ...patch }));
  }
  const updField = (sys: SystemKey, key: string) => (v: string) =>
    setDraft(sys, { [key]: v });

  // ─── Save ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);

    // 1) Paciente
    const pacPatch: Partial<Paciente> = {
      nome: pacDraft.nome,
      leito: pacDraft.leito,
      hd: pacDraft.hd ?? undefined,
      idade: pacDraft.idade ? Number(pacDraft.idade) : undefined,
      peso: pacDraft.peso ? Number(pacDraft.peso) : undefined,
      altura: pacDraft.altura ? Number(pacDraft.altura) : undefined,
      alergias: pacDraft.alergias ?? undefined,
      gravidade: pacDraft.gravidade,
    };
    const { error: pacErr } = await supabase
      .from('pacientes').update(pacPatch).eq('id', paciente.id);
    if (pacErr) {
      setSaveMsg({ ok: false, text: `Erro paciente: ${pacErr.message}` });
      setSaving(false); return;
    }

    // 2) Evolução (cria se não existe)
    const evolPatch = {
      neuro: neuroDraft, resp: respDraft, hemo: hemoDraft, tgi: tgiDraft,
      renal: renalDraft, hemato: hematoDraft, infecto: infectoDraft,
      dvas: dvasDraft, sedativos: sedDraft,
      impressao: impressaoDraft.filter(s => s.trim() !== ''),
      conduta: condutaDraft.filter(s => s.trim() !== ''),
    };
    if (evolucao) {
      const { error } = await supabase.from('evolucoes').update(evolPatch).eq('id', evolucao.id);
      if (error) {
        setSaveMsg({ ok: false, text: `Erro evolução: ${error.message}` });
        setSaving(false); return;
      }
    } else {
      const h = new Date().getHours();
      const plantao = h >= 7 && h < 13 ? 'MANHÃ' : h >= 13 && h < 19 ? 'TARDE' : 'NOITE';
      const { error } = await supabase.from('evolucoes').insert({
        paciente_id: paciente.id,
        data_evolucao: new Date().toISOString(),
        plantao,
        ...evolPatch,
        sofa_snapshot: {},
      });
      if (error) {
        setSaveMsg({ ok: false, text: `Erro nova evolução: ${error.message}` });
        setSaving(false); return;
      }
    }

    // 3) Pendências (upsert)
    for (const p of pendenciasDraft) {
      if (!p.tarefa.trim() && !p.id) continue;
      if (p.id) {
        await supabase.from('pendencias').update({
          tarefa: p.tarefa, concluida: p.concluida,
          concluida_at: p.concluida ? new Date().toISOString() : null,
        }).eq('id', p.id);
      } else if (p.tarefa.trim()) {
        await supabase.from('pendencias').insert({
          paciente_id: paciente.id,
          tarefa: p.tarefa, prioridade: 2, concluida: p.concluida,
        });
      }
    }

    setSaveMsg({ ok: true, text: 'Salvo!' });
    setSaving(false);
    onSaved();
    setTimeout(() => setSaveMsg(null), 2500);
  }, [paciente, evolucao, pacDraft, neuroDraft, respDraft, hemoDraft, tgiDraft,
      renalDraft, hematoDraft, infectoDraft, dvasDraft, sedDraft,
      impressaoDraft, condutaDraft, pendenciasDraft, onSaved]);

  // ─── SOFA básico ───────────────────────────────────────────────────────
  const sofaTotal = evolucao?.sofa_total ?? 0;
  const isSeptic = sofaTotal >= 2 && (evolucao?.sofa_snapshot?.suppressed?.length ?? 0) === 0;

  // ─── Infusion array helpers ────────────────────────────────────────────
  function addInf(arr: 'dvas' | 'sed') {
    const setter = arr === 'dvas' ? setDvasDraft : setSedDraft;
    setter(curr => [...curr, { droga: '', diluicao: 0, vazao: '' }]);
  }
  function removeInf(arr: 'dvas' | 'sed', i: number) {
    const setter = arr === 'dvas' ? setDvasDraft : setSedDraft;
    setter(curr => curr.filter((_, idx) => idx !== i));
  }
  function updInf(arr: 'dvas' | 'sed', i: number, field: keyof Infusao, v: string | number) {
    const setter = arr === 'dvas' ? setDvasDraft : setSedDraft;
    setter(curr => {
      const copy = [...curr];
      copy[i] = { ...copy[i], [field]: v };
      if (field === 'droga') copy[i].diluicao = 0;
      return copy;
    });
  }

  return (
    <div className="space-y-4">
      {/* SAVE BAR (sticky) */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-app-tertiary/60 border border-app-border sticky top-0 z-20 backdrop-blur">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white text-sm font-bold transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Ficha'}
        </button>
        {saveMsg && (
          <span className={`text-xs font-semibold ${saveMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {saveMsg.text}
          </span>
        )}
        <span className="text-[10px] text-app-text-muted ml-auto">
          Ficha completa estilo Gemini · edição inline
        </span>
      </div>

      {/* INTELIGÊNCIA SOFA / SEPSE */}
      <div className={`p-3 rounded-xl border-l-4 shadow-sm ${
        isSeptic ? 'bg-red-500/10 border-red-500' : 'bg-app-tertiary/40 border-app-border'
      }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSeptic ? 'bg-red-600 text-white' : 'bg-app-text-muted/20 text-app-text-2'}`}>
              {isSeptic ? <Flame className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`font-black uppercase tracking-wider text-xs ${isSeptic ? 'text-red-300' : 'text-app-text-2'}`}>
                {isSeptic ? 'ALERTA SEPSE-3 DETECTADO' : 'INTELIGÊNCIA CLÍNICA · SOFA'}
              </h3>
              <p className="text-[11px] text-app-text-muted">
                Score SOFA: <span className={`font-black text-sm ${isSeptic ? 'text-red-400' : 'text-app-text'}`}>{sofaTotal}</span>
              </p>
            </div>
          </div>
          {evolucao?.sofa_snapshot?.detail && (
            <div className="flex flex-wrap gap-1">
              {(evolucao.sofa_snapshot.detail as string[]).map((d, i) => (
                <span key={i} className="text-[9px] font-bold bg-app-card border border-app-border text-app-text-2 px-1.5 py-0.5 rounded">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* IDENTIFICAÇÃO */}
      <div className="bg-app-card p-4 rounded-xl border border-app-border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 border-b border-app-border pb-3">
          <div className="flex items-center gap-2 flex-[2]">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider shrink-0">Nome:</label>
            <input
              type="text"
              className="flex-1 border-b-2 border-app-border focus:border-app-accent focus:outline-none rounded px-1 font-bold text-lg bg-transparent text-app-text"
              value={pacDraft.nome ?? ''}
              onChange={e => setPacDraft(d => ({ ...d, nome: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider shrink-0">Leito:</label>
            <input
              type="text"
              className="flex-1 border-b-2 border-app-border focus:border-app-accent focus:outline-none rounded px-1 font-bold text-lg bg-transparent text-app-text"
              value={pacDraft.leito ?? ''}
              onChange={e => setPacDraft(d => ({ ...d, leito: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-[2] min-w-[200px]">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider shrink-0">HD:</label>
            <input
              type="text"
              className="flex-1 border-b border-app-border focus:border-app-accent focus:outline-none rounded px-1 font-medium bg-transparent text-app-text-2"
              value={pacDraft.hd ?? ''}
              onChange={e => setPacDraft(d => ({ ...d, hd: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider shrink-0">Adm:</label>
            <input
              type="date"
              className="flex-1 border-b border-app-border focus:border-app-accent focus:outline-none rounded px-1 text-app-text-2 font-medium bg-transparent"
              value={pacDraft.data_adm ? new Date(pacDraft.data_adm).toISOString().slice(0, 10) : ''}
              onChange={e => setPacDraft(d => ({ ...d, data_adm: new Date(e.target.value).toISOString() }))}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 flex-wrap bg-app-tertiary/30 p-2 rounded-lg border border-app-border">
          <div className="flex items-center gap-2">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider">Idade:</label>
            <input
              type="number"
              className="w-14 border-b border-app-border focus:border-app-accent focus:outline-none rounded px-1 bg-transparent text-center font-bold text-app-text"
              value={pacDraft.idade ?? ''}
              onChange={e => setPacDraft(d => ({ ...d, idade: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider">Peso(kg):</label>
            <input
              type="number"
              className="w-16 border-b border-app-border focus:border-app-accent focus:outline-none rounded px-1 bg-transparent text-center font-bold text-emerald-400"
              value={pacDraft.peso ?? ''}
              onChange={e => setPacDraft(d => ({ ...d, peso: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider">Altura(cm):</label>
            <input
              type="number"
              className="w-16 border-b border-app-border focus:border-app-accent focus:outline-none rounded px-1 bg-transparent text-center text-app-text"
              value={pacDraft.altura ?? ''}
              onChange={e => setPacDraft(d => ({ ...d, altura: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[150px]">
            <label className="font-bold text-red-400 uppercase text-xs tracking-wider shrink-0">Alergias:</label>
            <input
              type="text"
              placeholder="Nega alergias"
              className="flex-1 border-b border-red-500/40 focus:border-red-500 focus:outline-none rounded px-1 bg-transparent text-red-300 font-medium"
              value={pacDraft.alergias ?? ''}
              onChange={e => setPacDraft(d => ({ ...d, alergias: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-bold text-app-text-muted uppercase text-xs tracking-wider">Gravidade:</label>
            <select
              className="bg-app-card border border-app-border p-1 rounded focus:outline-none focus:ring-2 focus:ring-app-accent text-sm font-semibold text-app-text"
              value={pacDraft.gravidade ?? 'estavel'}
              onChange={e => setPacDraft(d => ({ ...d, gravidade: e.target.value as Paciente['gravidade'] }))}
            >
              <option value="estavel">1 · Estável</option>
              <option value="moderado">2 · Pot. Instável</option>
              <option value="grave">3 · Instável</option>
              <option value="critico">4 · Crítico</option>
              <option value="obito">Óbito</option>
            </select>
          </div>
        </div>
      </div>

      {/* GRID DE SISTEMAS — 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ============================================================
             1. NEUROLÓGICO
            ============================================================ */}
        <div className="sys-neuro rounded-r-xl border-l-4 p-4 shadow-sm">
          <h4 className="sys-title font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-purple-500/20 pb-2">
            <Brain className="w-4 h-4" /> Neurológico
          </h4>

          {/* Sedação accordion */}
          <Accordion
            title="Sedação / Analgesia"
            icon={Syringe}
            count={sedDraft.length}
            isOpen={openSec.sedativos}
            onToggle={() => toggle('sedativos')}
            color="purple"
          >
            {sedDraft.length === 0 && (
              <span className="text-xs text-app-text-muted/60 italic block py-1">Nenhuma sedação em uso.</span>
            )}
            {sedDraft.map((sed, idx) => {
              const dose = sed.droga ? calculateDose(
                sed.droga, sed.diluicao ?? 0, sed.vazao ?? 0,
                paciente.peso ?? 70, false,
              ) : null;
              return (
                <div key={idx} className="bg-app-card p-3 rounded-xl border border-purple-500/20 relative shadow-sm">
                  <button onClick={() => removeInf('sed', idx)} className="absolute top-3 right-3 text-red-400/60 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 pr-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-purple-400 uppercase">Fármaco</label>
                      <select
                        className="bg-app-tertiary border border-purple-500/30 p-1.5 rounded text-xs font-bold text-app-text-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={sed.droga ?? ''}
                        onChange={e => updInf('sed', idx, 'droga', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {Object.keys(SEDACAO_DICT).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {sed.droga && SEDACAO_DICT[sed.droga] && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-purple-400 uppercase">Diluição</label>
                        <select
                          className="bg-app-tertiary border border-purple-500/30 p-1.5 rounded text-xs text-app-text-2"
                          value={sed.diluicao ?? 0}
                          onChange={e => updInf('sed', idx, 'diluicao', Number(e.target.value))}
                        >
                          {SEDACAO_DICT[sed.droga].diluicoes.map((dil, i) => (
                            <option key={i} value={i}>{dil.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  {sed.droga && (
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-purple-500/5 p-2 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2 bg-app-card px-2 py-1 rounded border border-purple-500/30">
                        <label className="font-bold text-[10px] uppercase text-purple-400">Vazão:</label>
                        <input
                          type="number" step="0.1" placeholder="ml/h"
                          className="w-14 border-b-2 border-purple-500/40 focus:border-purple-500 focus:outline-none rounded text-center font-bold text-sm bg-transparent text-app-text"
                          value={sed.vazao ?? ''}
                          onChange={e => updInf('sed', idx, 'vazao', e.target.value)}
                        />
                        <span className="text-[10px] text-app-text-muted font-bold">ml/h</span>
                      </div>
                      <div className="flex-1">
                        {dose ? (
                          dose.error ? (
                            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {dose.error}
                            </span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-black text-app-text text-sm">
                                {dose.value} <span className="text-[10px] font-bold text-purple-400">{dose.unit}</span>
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 w-fit ${
                                dose.isOk ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-500/15 text-orange-300'
                              }`}>
                                Faixa: {dose.min} a {dose.max}
                              </span>
                            </div>
                          )
                        ) : <span className="text-[10px] text-app-text-muted/60 italic">Insira vazão</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => addInf('sed')}
              className="w-full py-2 flex items-center justify-center gap-2 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border-2 border-purple-500/30 border-dashed rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Sedação
            </button>
          </Accordion>

          {/* Escalas accordion */}
          <Accordion
            title="Escalas Clínicas"
            icon={Clipboard}
            count={(neuroDraft.escalas as Escala[] | undefined)?.length ?? 0}
            isOpen={openSec.escalas}
            onToggle={() => toggle('escalas')}
            color="purple"
          >
            {((neuroDraft.escalas as Escala[]) ?? []).map((esc, idx) => (
              <div key={idx} className="bg-app-card p-3 rounded-xl border border-purple-500/20 relative shadow-sm">
                <button
                  onClick={() => {
                    const arr = ((neuroDraft.escalas as Escala[]) ?? []).filter((_, i) => i !== idx);
                    setDraft('neuro', { escalas: arr });
                  }}
                  className="absolute top-3 right-3 text-red-400/60 hover:text-red-500 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex flex-col gap-2 pr-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="bg-app-tertiary border border-purple-500/30 p-1.5 rounded text-xs font-bold text-app-text-2"
                      value={esc.nome ?? ''}
                      onChange={e => {
                        const arr = [...((neuroDraft.escalas as Escala[]) ?? [])];
                        arr[idx] = { ...arr[idx], nome: e.target.value };
                        setDraft('neuro', { escalas: arr });
                      }}
                    >
                      <option value="">Selecione...</option>
                      {Object.keys(ESCALAS_NEURO).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {esc.nome && (
                      <div className="flex items-center gap-2 bg-purple-500/10 px-2 py-1 rounded">
                        <label className="font-bold text-[10px] uppercase text-purple-400">Score:</label>
                        <input
                          type="text" placeholder="..."
                          className="w-16 border-b-2 border-purple-500/40 focus:border-purple-500 focus:outline-none rounded text-center bg-transparent font-bold text-sm text-app-text"
                          value={esc.valor ?? ''}
                          onChange={e => {
                            const arr = [...((neuroDraft.escalas as Escala[]) ?? [])];
                            arr[idx] = { ...arr[idx], valor: e.target.value };
                            setDraft('neuro', { escalas: arr });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {esc.nome && ESCALAS_NEURO[esc.nome] && (
                    <span className="text-[10px] text-purple-400 italic bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                      {ESCALAS_NEURO[esc.nome].desc} · faixa {ESCALAS_NEURO[esc.nome].range}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const arr = [...((neuroDraft.escalas as Escala[]) ?? []), { nome: '', valor: '' }];
                setDraft('neuro', { escalas: arr });
              }}
              className="w-full py-2 flex items-center justify-center gap-2 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border-2 border-purple-500/30 border-dashed rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Escala
            </button>
          </Accordion>

          {/* Pupilas + Analgesia + CAM-ICU */}
          <div className="flex flex-col gap-3 pt-3 mt-3 border-t border-purple-500/20">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <label className="font-bold text-xs uppercase text-purple-400 shrink-0">Pupilas:</label>
              <input
                type="text"
                className="w-full bg-transparent border-b border-purple-500/40 focus:border-purple-500 focus:outline-none rounded px-1 font-medium text-app-text-2"
                value={String(neuroDraft.pupilas ?? '')}
                onChange={e => setDraft('neuro', { pupilas: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase text-purple-400">Analgesia:</span>
                <InlineInput val={neuroDraft.analgesia as string} onChange={updField('neuro', 'analgesia')} ph="____" w="w-20" />
              </div>
              <div className="hidden sm:block w-px h-6 bg-purple-500/30" />
              <div className="flex items-center gap-2 bg-app-card p-1.5 rounded-lg shadow-sm border border-purple-500/20">
                <span className="font-bold text-xs uppercase text-purple-400 px-1">CAM-ICU:</span>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-app-text-2 text-xs bg-purple-500/10 px-2 py-1 rounded hover:bg-purple-500/20">
                  <input
                    type="radio" name={`camicu-${paciente.id}`}
                    checked={neuroDraft.camIcu === 'Positivo'}
                    onChange={() => setDraft('neuro', { camIcu: 'Positivo' })}
                    className="accent-purple-500"
                  /> Pos
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-app-text-2 text-xs bg-purple-500/10 px-2 py-1 rounded hover:bg-purple-500/20">
                  <input
                    type="radio" name={`camicu-${paciente.id}`}
                    checked={neuroDraft.camIcu === 'Negativo'}
                    onChange={() => setDraft('neuro', { camIcu: 'Negativo' })}
                    className="accent-purple-500"
                  /> Neg
                </label>
              </div>
            </div>
          </div>
          <NotasField sistemaNome="Neurológico" value={String(neuroDraft.notas ?? '')} onChange={v => setDraft('neuro', { notas: v })} />
        </div>

        {/* ============================================================
             2. RESPIRATÓRIO
            ============================================================ */}
        <div className="sys-resp rounded-r-xl border-l-4 p-4 shadow-sm">
          <h4 className="sys-title font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-sky-500/20 pb-2">
            <Wind className="w-4 h-4" /> Respiratório
          </h4>

          <div className="space-y-4">
            <div className="bg-app-card p-3 rounded-xl border border-sky-500/20 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <label className="font-bold text-xs uppercase text-sky-400">Suporte O2:</label>
                <select
                  className="bg-app-tertiary border border-sky-500/30 p-1.5 rounded-lg text-sm font-bold text-app-text-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={String(respDraft.suporte ?? '')}
                  onChange={e => setDraft('resp', { suporte: e.target.value })}
                >
                  <option value="">Ar ambiente</option>
                  <option value="IOT + VM">1. IOT + VM</option>
                  <option value="VNI 8/8 hrs">2. VNI 8/8 hrs</option>
                  <option value="CNL O2">3. CNL O2</option>
                  <option value="CNAF">4. CNAF</option>
                </select>

                {respDraft.suporte === 'IOT + VM' && (
                  <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold text-sky-400 uppercase">Data IOT:</span>
                    <InlineInput val={respDraft.dataIntubacao as string} onChange={updField('resp', 'dataIntubacao')} ph="dd/mm" w="w-16" />
                  </div>
                )}
                {respDraft.suporte === 'CNL O2' && (
                  <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold text-sky-400 uppercase">Vazão:</span>
                    <InlineInput val={respDraft.vazaoO2 as string} onChange={updField('resp', 'vazaoO2')} ph="L/m" w="w-12" type="number" />
                    <span className="text-xs font-bold text-sky-400">L/min</span>
                  </div>
                )}
                {respDraft.suporte === 'CNAF' && (
                  <div className="flex flex-wrap items-center gap-3 bg-sky-500/10 border border-sky-500/30 px-3 py-1 rounded">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-sky-400 uppercase">Vazão:</span>
                      <InlineInput val={respDraft.vazaoO2 as string} onChange={updField('resp', 'vazaoO2')} ph="L/m" w="w-10" type="number" />
                      <span className="text-[10px] font-bold text-sky-400">L/min</span>
                    </div>
                    <div className="w-px h-4 bg-sky-500/40" />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-sky-400 uppercase">FiO2:</span>
                      <InlineInput val={respDraft.fio2O2 as string} onChange={updField('resp', 'fio2O2')} ph="%" w="w-10" type="number" />
                      <span className="text-[10px] font-bold text-sky-400">%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Parâmetros VM */}
              {respDraft.suporte === 'IOT + VM' && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-sky-500/5 p-3 rounded-lg border border-sky-500/20 mt-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-sky-400">Modo</label>
                    <select
                      className="bg-app-tertiary border border-sky-500/30 rounded p-1 text-xs font-bold text-app-text-2"
                      value={String(respDraft.vmModo ?? '')}
                      onChange={e => setDraft('resp', { vmModo: e.target.value })}
                    >
                      <option value="">-</option>
                      <option value="VCV">VCV</option>
                      <option value="PCV">PCV</option>
                      <option value="PRVC">PRVC</option>
                      <option value="PSV">PSV</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-sky-400">PEEP</span>
                    <InlineInput val={respDraft.vmPeep as string} onChange={updField('resp', 'vmPeep')} w="w-full" type="number" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-sky-400">FiO2 (%)</span>
                    <InlineInput val={respDraft.vmFio2 as string} onChange={updField('resp', 'vmFio2')} w="w-full" type="number" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-sky-400">Vol. Corr.</span>
                    <InlineInput val={respDraft.vmVc as string} onChange={updField('resp', 'vmVc')} w="w-full" type="number" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-sky-400">P.Insp/PS</span>
                    <InlineInput val={respDraft.vmPinspPs as string} onChange={updField('resp', 'vmPinspPs')} w="w-full" type="number" />
                  </div>
                </div>
              )}
            </div>

            {/* Vitais Resp */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 bg-app-card p-3 rounded-xl border border-sky-500/20 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase text-sky-400">PaO2:</span>
                <InlineInput val={respDraft.pao2 as string} onChange={updField('resp', 'pao2')} w="w-10" type="number" />
                <span className="font-bold text-[10px] text-sky-400">mmHg</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-sky-500/30" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs uppercase text-sky-400">FR:</span>
                <InlineInput val={respDraft.fr1 as string} onChange={updField('resp', 'fr1')} w="w-10" type="number" />
                <span className="text-app-text-muted">-</span>
                <InlineInput val={respDraft.fr2 as string} onChange={updField('resp', 'fr2')} w="w-10" type="number" />
                {isHigh(respDraft.fr1, respDraft.fr2, 20) && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-2.5 h-2.5" />(<InlineInput val={respDraft.frX as string} onChange={updField('resp', 'frX')} w="w-6" type="number" />x &gt; 20)
                  </span>
                )}
              </div>
              <div className="hidden sm:block w-px h-6 bg-sky-500/30" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs uppercase text-sky-400">SpO2:</span>
                <InlineInput val={respDraft.spo2 as string} onChange={updField('resp', 'spo2')} w="w-10" type="number" />
                <span className="text-xs font-bold text-sky-400">%</span>
                {isLow(respDraft.spo2, '', 92) && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-2.5 h-2.5" />(<InlineInput val={respDraft.spo2X as string} onChange={updField('resp', 'spo2X')} w="w-6" type="number" />x &lt; 92)
                  </span>
                )}
              </div>
            </div>

            {/* Ausculta */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[10px] uppercase text-sky-400">Ausculta Pulmonar:</label>
              <select
                className="w-full bg-app-card border border-sky-500/30 p-2.5 rounded-lg text-sm font-bold text-app-text-2 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                value={String(respDraft.ausculta ?? '')}
                onChange={e => setDraft('resp', { ausculta: e.target.value })}
              >
                <option value="">Selecione a ausculta...</option>
                <option value="MV + BIlateralmente, SRA">MV + Bilateralmente, Sem Ruídos (SRA)</option>
                <option value="MV + Bilateralmente, creptações bibasais">MV + Bilateralmente, crepitações bibasais</option>
                <option value="MV + Bilateralemtente, reduzido globalmente, sra">MV + Reduzido globalmente, SRA</option>
                <option value="MV + Bilateralmente, Roncos difusos">MV + Bilateralmente, Roncos difusos</option>
                <option value="MV + BIlateralmente, com Sibilos">MV + Bilateralmente, Sibilos</option>
              </select>
            </div>
            <NotasField sistemaNome="Respiratório" value={String(respDraft.notas ?? '')} onChange={v => setDraft('resp', { notas: v })} />
          </div>
        </div>

        {/* ============================================================
             3. HEMODINÂMICO (col-span-2)
            ============================================================ */}
        <div className="sys-hemo rounded-r-xl border-l-4 p-4 shadow-sm lg:col-span-2">
          <h4 className="sys-title font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-rose-500/20 pb-2">
            <Heart className="w-4 h-4" /> Hemodinâmico
          </h4>

          {/* DVA accordion */}
          <Accordion
            title="Drogas Vasoativas (DVA)"
            icon={Droplets}
            count={dvasDraft.length}
            isOpen={openSec.dvas}
            onToggle={() => toggle('dvas')}
            color="rose"
          >
            {dvasDraft.length === 0 && (
              <span className="text-xs text-app-text-muted/60 italic block py-1">Nenhuma DVA em uso.</span>
            )}
            {dvasDraft.map((dva, idx) => {
              const dose = dva.droga ? calculateDose(
                dva.droga, dva.diluicao ?? 0, dva.vazao ?? 0,
                paciente.peso ?? 70, true,
              ) : null;
              return (
                <div key={idx} className="bg-app-card p-3 rounded-xl border border-rose-500/20 relative shadow-sm">
                  <button onClick={() => removeInf('dvas', idx)} className="absolute top-3 right-3 text-red-400/60 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 pr-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-rose-400 uppercase">Fármaco</label>
                      <select
                        className="bg-app-tertiary border border-rose-500/30 p-1.5 rounded text-xs font-bold text-app-text-2"
                        value={dva.droga ?? ''}
                        onChange={e => updInf('dvas', idx, 'droga', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {Object.keys(DVA_DICT).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {dva.droga && DVA_DICT[dva.droga] && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-rose-400 uppercase">Diluição</label>
                        <select
                          className="bg-app-tertiary border border-rose-500/30 p-1.5 rounded text-xs text-app-text-2"
                          value={dva.diluicao ?? 0}
                          onChange={e => updInf('dvas', idx, 'diluicao', Number(e.target.value))}
                        >
                          {DVA_DICT[dva.droga].diluicoes.map((dil, i) => (
                            <option key={i} value={i}>{dil.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  {dva.droga && (
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-rose-500/5 p-2 rounded-lg border border-rose-500/20">
                      <div className="flex items-center gap-2 bg-app-card px-2 py-1 rounded border border-rose-500/30">
                        <label className="font-bold text-[10px] uppercase text-rose-400">Vazão:</label>
                        <input
                          type="number" step="0.1" placeholder="ml/h"
                          className="w-14 border-b-2 border-rose-500/40 focus:border-rose-500 focus:outline-none rounded text-center font-bold text-sm bg-transparent text-app-text"
                          value={dva.vazao ?? ''}
                          onChange={e => updInf('dvas', idx, 'vazao', e.target.value)}
                        />
                        <span className="text-[10px] text-app-text-muted font-bold">ml/h</span>
                      </div>
                      <div className="flex-1">
                        {dose ? (
                          dose.error ? (
                            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {dose.error}
                            </span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-black text-app-text text-sm">
                                {dose.value} <span className="text-[10px] font-bold text-rose-400">{dose.unit}</span>
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 w-fit ${
                                dose.isOk ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-500/15 text-orange-300'
                              }`}>
                                Faixa: {dose.min} a {dose.max}
                              </span>
                            </div>
                          )
                        ) : <span className="text-[10px] text-app-text-muted/60 italic">Insira vazão</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => addInf('dvas')}
              className="w-full py-2 flex items-center justify-center gap-2 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-2 border-rose-500/30 border-dashed rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar DVA
            </button>
          </Accordion>

          {/* Vitais Hemo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-app-card p-4 rounded-xl border border-rose-500/20 shadow-sm mt-3">
            <div className="space-y-3">
              {[
                { label: 'PAS', k1: 'pas1', k2: 'pas2', high: 180, low: 100, kxH: 'pasX180', kxL: 'pasX100' },
                { label: 'PAD', k1: 'pad1', k2: 'pad2', high: 120, low: 50,  kxH: 'padX120', kxL: 'padX50' },
                { label: 'PAm', k1: 'pam1', k2: 'pam2', high: 130, low: 65,  kxH: 'pamX130', kxL: 'pamX65' },
                { label: 'FC',  k1: 'fc1',  k2: 'fc2',  high: 100, low: -1,  kxH: 'fcX100',  kxL: ''        },
              ].map(({ label, k1, k2, high, low, kxH, kxL }) => (
                <div key={label} className="flex flex-wrap items-center gap-2 border-b border-rose-500/10 pb-2">
                  <span className="font-bold text-xs uppercase text-rose-400 w-8">{label}:</span>
                  <InlineInput val={hemoDraft[k1] as string} onChange={updField('hemo', k1)} w="w-10" />
                  <span className="text-app-text-muted">-</span>
                  <InlineInput val={hemoDraft[k2] as string} onChange={updField('hemo', k2)} w="w-10" />
                  {isHigh(hemoDraft[k1], hemoDraft[k2], high) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />(<InlineInput val={hemoDraft[kxH] as string} onChange={updField('hemo', kxH)} w="w-6" type="number" />x &gt; {high})
                    </span>
                  )}
                  {kxL && low > 0 && isLow(hemoDraft[k1], hemoDraft[k2], low) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />(<InlineInput val={hemoDraft[kxL] as string} onChange={updField('hemo', kxL)} w="w-6" type="number" />x &lt; {low})
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3 sm:border-l-2 border-rose-500/20 sm:pl-4">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[10px] uppercase text-rose-400">Ausculta Cardíaca:</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-rose-500/40 focus:border-rose-500 focus:outline-none rounded px-1 font-bold text-app-text-2"
                  value={String(hemoDraft.ausculta ?? '')}
                  onChange={e => setDraft('hemo', { ausculta: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[10px] uppercase text-rose-400">Pele, Pulso e Extremidades:</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-rose-500/40 focus:border-rose-500 focus:outline-none rounded px-1 font-medium text-sm text-app-text-2"
                  value={String(hemoDraft.pele ?? '')}
                  onChange={e => setDraft('hemo', { pele: e.target.value })}
                />
              </div>
            </div>
          </div>
          <NotasField sistemaNome="Hemodinâmico" value={String(hemoDraft.notas ?? '')} onChange={v => setDraft('hemo', { notas: v })} />
        </div>

        {/* ============================================================
             4. TGI / NUTRIÇÃO
            ============================================================ */}
        <div className="sys-tgi rounded-r-xl border-l-4 p-4 shadow-sm">
          <h4 className="sys-title font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-amber-500/20 pb-2">
            <Utensils className="w-4 h-4" /> TGI / Nutrição
          </h4>

          <div className="space-y-4">
            <div className="flex flex-col gap-4 bg-app-card p-4 rounded-xl border border-amber-500/20 shadow-sm">
              <div className="flex flex-wrap items-center gap-y-3 gap-x-6 border-b border-amber-500/15 pb-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                  <label className="font-bold text-xs uppercase text-amber-400">Dieta:</label>
                  <select
                    className="bg-app-tertiary border border-amber-500/30 p-1.5 rounded-lg text-sm font-bold text-app-text-2"
                    value={String(tgiDraft.viaDieta ?? '')}
                    onChange={e => setDraft('tgi', { viaDieta: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    <option value="Jejum">Jejum</option>
                    <option value="Via oral">Via oral</option>
                    <option value="TNE - SNE">TNE - SNE</option>
                    <option value="TNE - GTT">TNE - GTT</option>
                    <option value="NPT">NPT</option>
                    <option value="Outra">Outra</option>
                  </select>
                  {tgiDraft.viaDieta === 'Outra' && (
                    <input
                      type="text" placeholder="Especifique..."
                      className="flex-1 min-w-[120px] border-b border-amber-500/40 focus:border-amber-500 focus:outline-none rounded px-1 bg-transparent text-sm text-app-text-2 ml-2"
                      value={String(tgiDraft.dietaOutra ?? '')}
                      onChange={e => setDraft('tgi', { dietaOutra: e.target.value })}
                    />
                  )}
                  {!!tgiDraft.viaDieta && tgiDraft.viaDieta !== 'Via oral' && tgiDraft.viaDieta !== 'Jejum' && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Vazão:</span>
                      <InlineInput val={tgiDraft.vazaoDieta as string} onChange={updField('tgi', 'vazaoDieta')} ph="ml/h" w="w-12" type="number" />
                      <span className="text-[10px] font-bold text-amber-400">ml/h</span>
                    </div>
                  )}
                </div>
                <div className="hidden sm:block w-px h-8 bg-amber-500/20" />
                <div className="flex items-center gap-2">
                  <label className="font-bold text-[10px] uppercase text-amber-400">Aceitação:</label>
                  <select
                    className="bg-app-tertiary border border-amber-500/30 p-1.5 rounded-lg text-sm font-bold text-app-text-2"
                    value={String(tgiDraft.aceitacao ?? '')}
                    onChange={e => setDraft('tgi', { aceitacao: e.target.value })}
                  >
                    <option value="">-</option>
                    <option value="Boa">Boa</option>
                    <option value="Regular">Regular</option>
                    <option value="Ruim">Ruim</option>
                    <option value="Recusa">Recusa</option>
                    <option value="Pausa">Pausa</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase text-amber-400">Bilirrubina:</span>
                  <InlineInput val={tgiDraft.bb as string} onChange={updField('tgi', 'bb')} w="w-12" />
                </div>
                <div className="hidden sm:block w-px h-8 bg-amber-500/20" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs uppercase text-amber-400">DX:</span>
                  <InlineInput val={tgiDraft.dx as string} onChange={updField('tgi', 'dx')} w="w-12" />
                  <span className="font-bold text-xs text-amber-400">mg/dL</span>
                  {isHigh(tgiDraft.dx, '', 180) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />(<InlineInput val={tgiDraft.dxX180 as string} onChange={updField('tgi', 'dxX180')} w="w-6" type="number" />x &gt; 180)
                    </span>
                  )}
                </div>
                <div className="hidden sm:block w-px h-8 bg-amber-500/20" />
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <label className="font-bold text-[10px] uppercase text-amber-400">Evacuações:</label>
                  <select
                    className="bg-app-tertiary border border-amber-500/30 p-1.5 rounded-lg text-sm font-bold text-app-text-2"
                    value={String(tgiDraft.evacuou ?? '')}
                    onChange={e => setDraft('tgi', { evacuou: e.target.value })}
                  >
                    <option value="">-</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                  {tgiDraft.evacuou === 'Sim' && (
                    <div className="flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded">
                      <InlineInput val={tgiDraft.evacuacoesNum as string} onChange={updField('tgi', 'evacuacoesNum')} ph="Nº" w="w-6" type="number" />
                      <span className="text-[10px] font-bold text-amber-400">x</span>
                      <input
                        type="text" placeholder="Ex: Pastosa"
                        className="w-24 border-b border-amber-500/40 focus:border-amber-500 focus:outline-none rounded px-1 bg-transparent text-xs font-medium text-app-text-2"
                        value={String(tgiDraft.evacuacoesAspecto ?? '')}
                        onChange={e => setDraft('tgi', { evacuacoesAspecto: e.target.value })}
                      />
                    </div>
                  )}
                  {tgiDraft.evacuou === 'Não' && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Data últ:</span>
                      <InlineInput val={tgiDraft.evacuacoesDataUltima as string} onChange={updField('tgi', 'evacuacoesDataUltima')} ph="dd/mm" w="w-14" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 px-1">
              <label className="text-[10px] font-bold uppercase text-amber-400">Exame Físico Abdome:</label>
              <input
                type="text"
                className="w-full bg-transparent border-b border-amber-500/40 focus:border-amber-500 focus:outline-none rounded px-1 text-sm font-medium text-app-text-2"
                value={String(tgiDraft.abdome ?? '')}
                onChange={e => setDraft('tgi', { abdome: e.target.value })}
              />
            </div>
            <NotasField sistemaNome="TGI/Nutrição" value={String(tgiDraft.notas ?? '')} onChange={v => setDraft('tgi', { notas: v })} />
          </div>
        </div>

        {/* ============================================================
             5. RENAL / METABÓLICO
            ============================================================ */}
        <div className="sys-renal rounded-r-xl border-l-4 p-4 shadow-sm">
          <h4 className="sys-title font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-lime-500/20 pb-2">
            <FlaskConical className="w-4 h-4" /> Renal / Metabólico
          </h4>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 bg-app-card p-4 rounded-xl border border-lime-500/20 shadow-sm">
              <div className="flex flex-col gap-3 justify-center min-w-[110px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold w-6 text-right text-xs uppercase text-lime-400">Ur:</span>
                  <InlineInput val={renalDraft.ur1 as string} onChange={updField('renal', 'ur1')} w="w-10" />
                  <span className="text-app-text-muted">&gt;</span>
                  <InlineInput val={renalDraft.ur2 as string} onChange={updField('renal', 'ur2')} w="w-10" />
                  <span className="text-app-text-muted">&gt;</span>
                  <InlineInput val={renalDraft.ur3 as string} onChange={updField('renal', 'ur3')} w="w-10" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-6 text-right text-xs uppercase text-lime-400">CR:</span>
                  <InlineInput val={renalDraft.cr1 as string} onChange={updField('renal', 'cr1')} w="w-10" />
                  <span className="text-app-text-muted">&gt;</span>
                  <InlineInput val={renalDraft.cr2 as string} onChange={updField('renal', 'cr2')} w="w-10" />
                  <span className="text-app-text-muted">&gt;</span>
                  <InlineInput val={renalDraft.cr3 as string} onChange={updField('renal', 'cr3')} w="w-10" />
                </div>
              </div>
              <div className="hidden sm:block w-px bg-lime-500/20" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-lime-400 w-5">Mg</span>
                  <InlineInput val={renalDraft.mg as string} onChange={updField('renal', 'mg')} w="w-full max-w-[60px]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-lime-400 w-5">Na</span>
                  <InlineInput val={renalDraft.na as string} onChange={updField('renal', 'na')} w="w-full max-w-[60px]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-lime-400 w-5">Cai</span>
                  <InlineInput val={renalDraft.cai as string} onChange={updField('renal', 'cai')} w="w-full max-w-[60px]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-lime-400 w-5">K</span>
                  <InlineInput val={renalDraft.k as string} onChange={updField('renal', 'k')} w="w-full max-w-[60px]" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-3 bg-app-card p-3 rounded-xl border border-lime-500/20 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="font-bold text-[10px] uppercase text-lime-400">Diurese:</label>
                <select
                  className="bg-app-tertiary border border-lime-500/30 p-1.5 rounded-md text-xs font-bold text-app-text-2"
                  value={String(renalDraft.tipoDiurese ?? '')}
                  onChange={e => setDraft('renal', { tipoDiurese: e.target.value })}
                >
                  <option value="">Tipo...</option>
                  <option value="Espontânea">Espontânea</option>
                  <option value="SVD">SVD</option>
                  <option value="TRS">TRS</option>
                </select>
                <div className="flex items-center bg-lime-500/10 border border-lime-500/30 px-2 py-1 rounded">
                  <InlineInput val={renalDraft.diureseHoras as string ?? '24'} onChange={updField('renal', 'diureseHoras')} w="w-6" type="number" />
                  <span className="text-[10px] text-lime-400 font-bold mr-2">h:</span>
                  <input
                    type="text"
                    className="w-16 border-b-2 border-lime-500/40 focus:border-lime-500 focus:outline-none rounded px-1 text-center bg-transparent font-black text-[15px] text-app-text"
                    value={String(renalDraft.diurese ?? '')}
                    onChange={e => setDraft('renal', { diurese: e.target.value })}
                  />
                  <span className="text-[10px] text-lime-400 font-bold ml-1">ml</span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-6 bg-lime-500/30" />
              <div className="flex items-center gap-2 bg-lime-500/10 border border-lime-500/30 px-2 py-1.5 rounded-md">
                <span className="font-bold text-[10px] uppercase text-lime-400">BH:</span>
                <InlineInput val={renalDraft.bh as string} onChange={updField('renal', 'bh')} w="w-14" />
                <span className="text-[10px] font-bold text-lime-400">ml</span>
              </div>
              <div className="w-full sm:w-auto bg-lime-600 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 sm:ml-auto shadow-sm">
                <span className="font-bold text-[10px] uppercase text-lime-100">Ef:</span>
                <span className="font-black text-white">{formatDiureseEfetiva(renalDraft.diurese, paciente.peso, renalDraft.diureseHoras ?? 24)}</span>
                <span className="text-[10px] font-bold text-lime-200">ml/kg/h</span>
              </div>
            </div>
            <NotasField sistemaNome="Renal" value={String(renalDraft.notas ?? '')} onChange={v => setDraft('renal', { notas: v })} />
          </div>
        </div>

        {/* ============================================================
             6. HEMATO
            ============================================================ */}
        <div className="sys-hemato rounded-r-xl border-l-4 p-4 shadow-sm">
          <h4 className="sys-title font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-pink-500/20 pb-2">
            <TestTube className="w-4 h-4" /> Hemato
          </h4>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-8 gap-y-3 bg-app-card p-4 rounded-xl border border-pink-500/20 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] uppercase text-pink-400">Hb:</span>
                <InlineInput val={hematoDraft.hb1 as string} onChange={updField('hemato', 'hb1')} w="w-12" />
                <span className="text-[10px] font-bold text-pink-400">g/dL</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-pink-500/30" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] uppercase text-pink-400">HT:</span>
                <InlineInput val={hematoDraft.ht1 as string} onChange={updField('hemato', 'ht1')} w="w-12" />
                <span className="text-[10px] font-bold text-pink-400">%</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-pink-500/30" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] uppercase text-pink-400">Plaq:</span>
                <InlineInput val={hematoDraft.plaq1 as string} onChange={updField('hemato', 'plaq1')} w="w-16" />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-app-card/50 p-3 rounded-xl border border-pink-500/20">
              <span className="font-bold text-[10px] uppercase text-pink-400 mb-1 block">Profilaxias</span>
              <div className="flex items-center gap-3 bg-app-card p-1.5 rounded-lg border border-pink-500/15 shadow-sm">
                <div className="bg-pink-500/15 p-1.5 rounded-md text-pink-400"><ShieldAlert className="w-3.5 h-3.5" /></div>
                <select
                  className="flex-1 bg-transparent outline-none font-bold text-xs text-app-text-2"
                  value={String(hematoDraft.profilaxiaTvp ?? '')}
                  onChange={e => setDraft('hemato', { profilaxiaTvp: e.target.value })}
                >
                  <option value="">TVP (Nenhuma selecionada)</option>
                  <option value="Enoxaparina 40mg">Enoxaparina 40mg</option>
                  <option value="Heparina SC 5000UI">Heparina SC 5000UI</option>
                  <option value="Compressão Mecânica">Compressão Mecânica</option>
                </select>
              </div>
              <div className="flex items-center gap-3 bg-app-card p-1.5 rounded-lg border border-pink-500/15 shadow-sm">
                <div className="bg-pink-500/15 p-1.5 rounded-md text-pink-400"><Pill className="w-3.5 h-3.5" /></div>
                <select
                  className="flex-1 bg-transparent outline-none font-bold text-xs text-app-text-2"
                  value={String(hematoDraft.profilaxiaUlcera ?? '')}
                  onChange={e => setDraft('hemato', { profilaxiaUlcera: e.target.value })}
                >
                  <option value="">Úlcera (Nenhuma selecionada)</option>
                  <option value="Omeprazol 40mg">Omeprazol 40mg</option>
                  <option value="Pantoprazol 40mg">Pantoprazol 40mg</option>
                  <option value="Ranitidina">Ranitidina</option>
                </select>
              </div>
            </div>
            <NotasField sistemaNome="Hematológico" value={String(hematoDraft.notas ?? '')} onChange={v => setDraft('hemato', { notas: v })} />
          </div>
        </div>

        {/* ============================================================
             7. INFECTO
            ============================================================ */}
        <div className="sys-infecto rounded-r-xl border-l-4 p-4 shadow-sm">
          <h4 className="sys-title font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-teal-500/20 pb-2">
            <Bug className="w-4 h-4" /> Infecto
          </h4>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-8 gap-y-3 bg-app-card p-4 rounded-xl border border-teal-500/20 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[10px] uppercase text-teal-400">Tax:</span>
                <InlineInput val={infectoDraft.tmax as string} onChange={updField('infecto', 'tmax')} w="w-12" />
                <span className="font-bold text-[10px] text-teal-400">°C</span>
                {isHigh(infectoDraft.tmax, '', 38) && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded ml-2">
                    <AlertTriangle className="w-2.5 h-2.5" />(<InlineInput val={infectoDraft.tmaxX38 as string} onChange={updField('infecto', 'tmaxX38')} w="w-6" type="number" />x &gt; 38)
                  </span>
                )}
              </div>
              <div className="hidden sm:block w-px h-6 bg-teal-500/30" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] uppercase text-teal-400">Leucócitos:</span>
                <InlineInput val={infectoDraft.leuco1 as string} onChange={updField('infecto', 'leuco1')} w="w-16" />
                <span className="text-[10px] font-bold text-teal-400">/µL</span>
              </div>
            </div>

            {/* ATB + Culturas accordion */}
            <Accordion
              title="Antibióticos & Culturas"
              icon={Microscope}
              count={((infectoDraft.atbs as AtbItem[] | undefined)?.length ?? 0) + ((infectoDraft.culturas as CulturaItem[] | undefined)?.length ?? 0)}
              isOpen={openSec.infecto}
              onToggle={() => toggle('infecto')}
              color="teal"
            >
              {/* ATBs */}
              <div className="mb-4 border-b border-teal-500/20 pb-4">
                <h5 className="text-[10px] font-bold text-teal-400 uppercase mb-3 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Antibioticoterapia Ativa
                </h5>
                {((infectoDraft.atbs as AtbItem[]) ?? []).map((atb, idx) => (
                  <div key={idx} className="bg-app-card p-3 rounded-xl border border-teal-500/20 relative shadow-sm mb-2">
                    <button
                      onClick={() => {
                        const arr = ((infectoDraft.atbs as AtbItem[]) ?? []).filter((_, i) => i !== idx);
                        setDraft('infecto', { atbs: arr });
                      }}
                      className="absolute top-3 right-3 text-red-400/60 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex flex-col sm:flex-row gap-3 pr-6">
                      <div className="flex flex-col gap-1 flex-[2] min-w-[140px]">
                        <label className="text-[10px] font-bold text-teal-400 uppercase">Fármaco</label>
                        <select
                          className="bg-app-tertiary border border-teal-500/30 p-1.5 rounded-md text-xs font-bold text-app-text-2"
                          value={atb.nome ?? ''}
                          onChange={e => {
                            const arr = [...((infectoDraft.atbs as AtbItem[]) ?? [])];
                            arr[idx] = { ...arr[idx], nome: e.target.value };
                            setDraft('infecto', { atbs: arr });
                          }}
                        >
                          <option value="">Selecionar...</option>
                          <option value="Meropenem">Meropenem</option>
                          <option value="Pip-Tazo">Pip-Tazo</option>
                          <option value="Vancomicina">Vancomicina</option>
                          <option value="Ceftriaxona">Ceftriaxona</option>
                          <option value="Cefepime">Cefepime</option>
                          <option value="Polimixina B">Polimixina B</option>
                          <option value="Linezolida">Linezolida</option>
                          <option value="Outro">Outro...</option>
                        </select>
                        {atb.nome === 'Outro' && (
                          <input
                            type="text" placeholder="Escreva o nome..."
                            className="border-b border-teal-500/40 focus:border-teal-500 focus:outline-none rounded px-1 bg-transparent text-xs font-bold mt-1 text-app-text-2"
                            value={atb.nomePersonalizado ?? ''}
                            onChange={e => {
                              const arr = [...((infectoDraft.atbs as AtbItem[]) ?? [])];
                              arr[idx] = { ...arr[idx], nomePersonalizado: e.target.value };
                              setDraft('infecto', { atbs: arr });
                            }}
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                        <label className="text-[10px] font-bold text-teal-400 uppercase">Dose</label>
                        <input
                          type="text" placeholder="Ex: 1g 12/12h"
                          className="w-full bg-teal-500/5 border border-teal-500/20 px-2 py-1.5 rounded-md text-xs font-medium text-app-text-2"
                          value={atb.dose ?? ''}
                          onChange={e => {
                            const arr = [...((infectoDraft.atbs as AtbItem[]) ?? [])];
                            arr[idx] = { ...arr[idx], dose: e.target.value };
                            setDraft('infecto', { atbs: arr });
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1 w-16 shrink-0">
                        <label className="text-[10px] font-bold text-teal-400 uppercase text-center">Dia</label>
                        <div className="flex items-center justify-center bg-teal-500/5 border border-teal-500/20 px-1 py-1.5 rounded-md">
                          <span className="font-bold text-teal-400 text-[10px] mr-1">D</span>
                          <input
                            type="number" placeholder="1"
                            className="w-6 border-b-2 border-teal-500/40 focus:border-teal-500 focus:outline-none rounded px-1 text-center bg-transparent font-bold text-sm text-app-text"
                            value={atb.dias ?? ''}
                            onChange={e => {
                              const arr = [...((infectoDraft.atbs as AtbItem[]) ?? [])];
                              arr[idx] = { ...arr[idx], dias: e.target.value };
                              setDraft('infecto', { atbs: arr });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const arr = [...((infectoDraft.atbs as AtbItem[]) ?? []), { nome: '', dose: '', dias: '' }];
                    setDraft('infecto', { atbs: arr });
                  }}
                  className="w-full py-2 mt-2 flex items-center justify-center gap-2 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border-2 border-teal-500/30 border-dashed rounded-xl text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar ATB
                </button>
              </div>

              {/* Culturas */}
              <div>
                <h5 className="text-[10px] font-bold text-teal-400 uppercase mb-3 flex items-center gap-1">
                  <TestTube className="w-3 h-3" /> Monitorização de Culturas
                </h5>
                {((infectoDraft.culturas as CulturaItem[]) ?? []).map((cult, idx) => (
                  <div key={idx} className="bg-app-card p-3 rounded-xl border border-teal-500/20 relative shadow-sm mb-2">
                    <button
                      onClick={() => {
                        const arr = ((infectoDraft.culturas as CulturaItem[]) ?? []).filter((_, i) => i !== idx);
                        setDraft('infecto', { culturas: arr });
                      }}
                      className="absolute top-3 right-3 text-red-400/60 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex flex-wrap items-center gap-3 pr-6">
                      <input
                        type="text" placeholder="Tipo"
                        className="w-20 border-b-2 border-teal-500/40 focus:border-teal-500 focus:outline-none rounded px-1 bg-transparent text-sm font-bold uppercase text-app-text-2"
                        value={cult.tipo ?? ''}
                        onChange={e => {
                          const arr = [...((infectoDraft.culturas as CulturaItem[]) ?? [])];
                          arr[idx] = { ...arr[idx], tipo: e.target.value };
                          setDraft('infecto', { culturas: arr });
                        }}
                      />
                      <div className="flex items-center gap-1 bg-teal-500/10 px-2 py-1 rounded-md border border-teal-500/30">
                        <label className="text-[10px] font-bold text-teal-400">Data:</label>
                        <input
                          type="text" placeholder="dd/mm"
                          className="w-14 border-b border-teal-500/40 focus:border-teal-500 focus:outline-none rounded px-1 bg-transparent text-xs text-center text-app-text-2"
                          value={cult.data ?? ''}
                          onChange={e => {
                            const arr = [...((infectoDraft.culturas as CulturaItem[]) ?? [])];
                            arr[idx] = { ...arr[idx], data: e.target.value };
                            setDraft('infecto', { culturas: arr });
                          }}
                        />
                      </div>
                      <select
                        className="flex-1 min-w-[130px] bg-teal-500/10 border border-teal-500/30 p-1.5 rounded-md text-xs font-bold text-app-text-2"
                        value={cult.status ?? ''}
                        onChange={e => {
                          const arr = [...((infectoDraft.culturas as CulturaItem[]) ?? [])];
                          arr[idx] = { ...arr[idx], status: e.target.value };
                          setDraft('infecto', { culturas: arr });
                        }}
                      >
                        <option value="">Status...</option>
                        <option value="Em andamento">Em andamento</option>
                        <option value="Negativa">Negativa</option>
                        <option value="Parcial">Parcial</option>
                        <option value="Parcial positiva">Parcial positiva</option>
                        <option value="Positiva">Positiva</option>
                      </select>
                    </div>
                    {(cult.status === 'Parcial positiva' || cult.status === 'Positiva') && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-yellow-500/10 p-2.5 rounded-lg border border-yellow-500/30 mt-3">
                        <label className="text-[10px] font-bold text-yellow-400 uppercase shrink-0 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Isolamento:
                        </label>
                        <input
                          type="text" placeholder="Ex: E. coli ESBL / Antibiograma..."
                          className="flex-1 bg-transparent border-b border-yellow-500/40 focus:border-yellow-500 focus:outline-none rounded px-1 text-xs text-yellow-300 font-medium w-full"
                          value={cult.detalhe ?? ''}
                          onChange={e => {
                            const arr = [...((infectoDraft.culturas as CulturaItem[]) ?? [])];
                            arr[idx] = { ...arr[idx], detalhe: e.target.value };
                            setDraft('infecto', { culturas: arr });
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const arr = [...((infectoDraft.culturas as CulturaItem[]) ?? []), { tipo: '', data: '', status: '' }];
                    setDraft('infecto', { culturas: arr });
                  }}
                  className="w-full py-2 mt-2 flex items-center justify-center gap-2 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border-2 border-teal-500/30 border-dashed rounded-xl text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Cultura
                </button>
              </div>
            </Accordion>
            <NotasField sistemaNome="Infectologia" value={String(infectoDraft.notas ?? '')} onChange={v => setDraft('infecto', { notas: v })} />
          </div>
        </div>

      </div>

      {/* TEXTOS LIVRES — Problemas / Plano / Pendências */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-app-card border border-app-border rounded-xl p-4 shadow-sm">
          <h4 className="font-bold text-red-400 uppercase tracking-widest text-sm flex items-center gap-2 mb-3 border-b border-red-500/20 pb-2">
            <AlertCircle className="w-4 h-4" /> Problemas Ativos
          </h4>
          <div className="space-y-2">
            {impressaoDraft.map((linha, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-app-text-muted/60 font-bold">{i + 1}.</span>
                <input
                  type="text"
                  className="flex-1 bg-app-tertiary/40 border-b border-app-border focus:border-red-500 focus:bg-red-500/5 focus:outline-none py-1 px-2 rounded text-sm font-medium text-app-text-2"
                  value={linha}
                  onChange={e => {
                    const copy = [...impressaoDraft];
                    copy[i] = e.target.value;
                    setImpressaoDraft(copy);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-app-card border border-app-border rounded-xl p-4 shadow-sm">
          <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-sm flex items-center gap-2 mb-3 border-b border-emerald-500/20 pb-2">
            <ListChecks className="w-4 h-4" /> Plano 12-24h
          </h4>
          <div className="space-y-2">
            {condutaDraft.map((linha, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-app-text-muted/60 font-bold">{i + 1}.</span>
                <input
                  type="text"
                  className="flex-1 bg-app-tertiary/40 border-b border-app-border focus:border-emerald-500 focus:bg-emerald-500/5 focus:outline-none py-1 px-2 rounded text-sm font-medium text-app-text-2"
                  value={linha}
                  onChange={e => {
                    const copy = [...condutaDraft];
                    copy[i] = e.target.value;
                    setCondutaDraft(copy);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/30 rounded-xl p-4 shadow-sm md:col-span-2">
          <h4 className="font-bold text-orange-400 uppercase tracking-widest text-sm flex items-center gap-2 mb-3 border-b border-orange-500/20 pb-2">
            <ClipboardList className="w-4 h-4" /> Pendências / Riscos e Contingências
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {pendenciasDraft.map((pend, i) => (
              <div key={i} className="flex items-center gap-3 bg-app-card p-2 rounded-lg border border-orange-500/20 shadow-sm">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                  checked={pend.concluida}
                  onChange={e => {
                    const copy = [...pendenciasDraft];
                    copy[i] = { ...copy[i], concluida: e.target.checked };
                    setPendenciasDraft(copy);
                  }}
                />
                <input
                  type="text" placeholder="Descreva a pendência..."
                  className="flex-1 bg-transparent border-b border-orange-500/30 focus:border-orange-500 focus:outline-none rounded px-1 text-sm font-medium text-orange-300 placeholder:text-orange-500/40"
                  value={pend.tarefa}
                  onChange={e => {
                    const copy = [...pendenciasDraft];
                    copy[i] = { ...copy[i], tarefa: e.target.value };
                    setPendenciasDraft(copy);
                  }}
                />
              </div>
            ))}
            <button
              onClick={() => setPendenciasDraft([...pendenciasDraft, { tarefa: '', concluida: false }])}
              className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-bold"
            >
              <Plus className="w-3 h-3" /> Adicionar pendência
            </button>
          </div>
        </div>
      </div>

      {/* Save bottom */}
      <div className="flex items-center gap-3 pt-2 border-t border-app-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white text-sm font-bold transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Ficha'}
        </button>
        {saveMsg && (
          <span className={`text-xs font-semibold ${saveMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {saveMsg.text}
          </span>
        )}
      </div>
    </div>
  );
}
