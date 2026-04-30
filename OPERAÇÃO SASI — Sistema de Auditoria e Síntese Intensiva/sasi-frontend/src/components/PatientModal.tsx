// ============================================================================
// SASI · PatientModal.tsx — detalhe completo do paciente
// ============================================================================
import { useEffect, useState, useCallback } from 'react';
import { X, Clock, User, Activity, Heart, Droplets, AlertTriangle,
         Thermometer, Brain, Wind, Zap, FlaskConical, Microscope,
         ClipboardList, ChevronRight } from 'lucide-react';
import { supabase, type Paciente, type Evolucao } from '../lib/supabaseClient';

interface Props {
  pacienteId: string;
  onClose: () => void;
}

const GRAVIDADE_BADGE: Record<string, string> = {
  estavel:  'bg-emerald-900 text-emerald-300',
  moderado: 'bg-amber-900 text-amber-300',
  grave:    'bg-orange-900 text-orange-300',
  critico:  'bg-red-900 text-red-300',
  obito:    'bg-slate-800 text-slate-400',
};

function sofaColor(s?: number | null): string {
  if (s == null) return 'text-slate-400';
  if (s >= 11) return 'text-red-400';
  if (s >= 7)  return 'text-orange-400';
  if (s >= 4)  return 'text-amber-300';
  return 'text-emerald-400';
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between items-baseline gap-2 py-1 border-b border-slate-800">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs text-slate-200 text-right">{String(value)}</span>
    </div>
  );
}

function JsonFields({ data }: { data?: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) return <p className="text-xs text-slate-600 italic">sem dados</p>;
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

export default function PatientModal({ pacienteId, onClose }: Props) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pac }, { data: evs }] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', pacienteId).single(),
      supabase.from('evolucoes').select('*').eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false }).limit(1),
    ]);
    setPaciente(pac ?? null);
    setEvolucao(evs?.[0] ?? null);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { void load(); }, [load]);

  // Fecha com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const diasInternacao = paciente
    ? Math.floor((Date.now() - new Date(paciente.data_adm).getTime()) / 86400000)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl my-4">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {loading && (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando dados do paciente…</div>
        )}

        {!loading && paciente && (
          <>
            {/* ── CABEÇALHO ── */}
            <div className="p-5 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-xs text-slate-400 font-mono mb-1">
                    {paciente.uti} · LEITO {paciente.leito}
                  </div>
                  <h2 className="text-xl font-bold text-white">{paciente.nome}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${GRAVIDADE_BADGE[paciente.gravidade]}`}>
                      {paciente.gravidade}
                    </span>
                    {evolucao?.sofa_total != null && (
                      <span className={`text-sm font-bold ${sofaColor(evolucao.sofa_total)}`}>
                        SOFA {evolucao.sofa_total}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> D{diasInternacao} — adm {new Date(paciente.data_adm).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* ── DADOS DO PACIENTE ── */}
              <div className="sm:col-span-2">
                <SectionTitle icon={User} label="Identificação" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4">
                  <Field label="Idade" value={paciente.idade ? `${paciente.idade} anos` : null} />
                  <Field label="Peso" value={paciente.peso ? `${paciente.peso} kg` : null} />
                  <Field label="Altura" value={paciente.altura ? `${paciente.altura} cm` : null} />
                  <Field label="Alergias" value={paciente.alergias ?? 'NKDA'} />
                </div>
                {paciente.hd && (
                  <div className="mt-2 p-2.5 bg-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-400">HD: </span>{paciente.hd}
                  </div>
                )}
              </div>

              {/* ── SOFA BREAKDOWN ── */}
              {evolucao?.sofa_snapshot && (
                <div className="sm:col-span-2">
                  <SectionTitle icon={Activity} label="SOFA Score" />
                  <div className="flex flex-wrap gap-2">
                    {evolucao.sofa_snapshot.components && Object.entries(
                      evolucao.sofa_snapshot.components as Record<string, number>
                    ).map(([sys, val]) => (
                      <div key={sys} className="bg-slate-800 rounded-lg px-3 py-2 text-center min-w-[56px]">
                        <div className="text-[10px] text-slate-500 uppercase">{sys}</div>
                        <div className={`text-lg font-bold tabular-nums ${sofaColor(val)}`}>{val}</div>
                      </div>
                    ))}
                    <div className="bg-slate-700 rounded-lg px-3 py-2 text-center min-w-[56px]">
                      <div className="text-[10px] text-slate-400 uppercase">Total</div>
                      <div className={`text-lg font-bold tabular-nums ${sofaColor(evolucao.sofa_total)}`}>
                        {evolucao.sofa_total ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DVAs ── */}
              {evolucao && Array.isArray(evolucao.dvas) && evolucao.dvas.length > 0 && (
                <div>
                  <SectionTitle icon={Heart} label="DVAs" />
                  <ul className="space-y-1">
                    {(evolucao.dvas as string[]).map((d, i) => (
                      <li key={i} className="text-xs text-red-300 bg-red-950/40 px-2.5 py-1.5 rounded-lg">{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── SEDATIVOS ── */}
              {evolucao && Array.isArray(evolucao.sedativos) && evolucao.sedativos.length > 0 && (
                <div>
                  <SectionTitle icon={Droplets} label="Sedação / Analgesia" />
                  <ul className="space-y-1">
                    {(evolucao.sedativos as string[]).map((s, i) => (
                      <li key={i} className="text-xs text-purple-300 bg-purple-950/40 px-2.5 py-1.5 rounded-lg">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── SISTEMAS ── */}
              {evolucao && (
                <>
                  <div>
                    <SectionTitle icon={Brain} label="Neurológico" />
                    <JsonFields data={evolucao.neuro as Record<string, unknown>} />
                  </div>
                  <div>
                    <SectionTitle icon={Wind} label="Respiratório" />
                    <JsonFields data={evolucao.resp as Record<string, unknown>} />
                  </div>
                  <div>
                    <SectionTitle icon={Zap} label="Hemodinâmica" />
                    <JsonFields data={evolucao.hemo as Record<string, unknown>} />
                  </div>
                  <div>
                    <SectionTitle icon={Thermometer} label="TGI" />
                    <JsonFields data={evolucao.tgi as Record<string, unknown>} />
                  </div>
                  <div>
                    <SectionTitle icon={FlaskConical} label="Renal" />
                    <JsonFields data={evolucao.renal as Record<string, unknown>} />
                  </div>
                  <div>
                    <SectionTitle icon={Microscope} label="Infecto" />
                    <JsonFields data={evolucao.infecto as Record<string, unknown>} />
                  </div>
                </>
              )}

              {/* ── IMPRESSÃO ── */}
              {evolucao && Array.isArray(evolucao.impressao) && evolucao.impressao.length > 0 && (
                <div className="sm:col-span-2">
                  <SectionTitle icon={ClipboardList} label="Impressão Clínica" />
                  <ul className="space-y-1.5">
                    {(evolucao.impressao as string[]).map((imp, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-300">
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── CONDUTA ── */}
              {evolucao && Array.isArray(evolucao.conduta) && evolucao.conduta.length > 0 && (
                <div className="sm:col-span-2">
                  <SectionTitle icon={AlertTriangle} label="Conduta" />
                  <ul className="space-y-1.5">
                    {(evolucao.conduta as string[]).map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-200">
                        <span className="shrink-0 text-red-400 font-bold">{i + 1}.</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!evolucao && (
                <div className="sm:col-span-2 text-center py-8 text-slate-500 text-sm">
                  Nenhuma evolução registrada ainda.
                </div>
              )}
            </div>

            {/* RODAPÉ */}
            {evolucao && (
              <div className="px-5 pb-4 text-[11px] text-slate-600 text-right border-t border-slate-800 pt-3">
                Última evolução: {new Date(evolucao.created_at).toLocaleString('pt-BR')} · Plantão: {evolucao.plantao}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
