// ============================================================================
// SASI · TimelineDrawer — SOFA + eventos clínicos em timeline por dia.
// Slide-from-right, 450px, com mini-charts agregados no topo.
// ============================================================================
import { useEffect, useState, useCallback } from 'react';
import {
  X, Activity, FlaskConical, Heart, Thermometer,
  Droplets, Zap, Clock, type LucideIcon,
} from 'lucide-react';
import { supabase, type EventoClinico } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';
import MiniChart from './MiniChart';

interface Props {
  pacienteId: string;
  pacienteNome: string;
  onClose: () => void;
}

const TIPO_META: Record<string, { Icon: LucideIcon; label: string; unit: string; color: string }> = {
  sofa:      { Icon: Activity,      label: 'SOFA',    unit: 'pts',   color: 'text-red-400' },
  lactato:   { Icon: FlaskConical,  label: 'Lactato', unit: 'mmol/L', color: 'text-amber-400' },
  pam:       { Icon: Heart,         label: 'PAM',     unit: 'mmHg',  color: 'text-rose-400' },
  pf_ratio:  { Icon: Zap,           label: 'P/F',     unit: '',      color: 'text-blue-400' },
  diurese:   { Icon: Droplets,      label: 'Diurese', unit: 'mL/h',  color: 'text-cyan-400' },
  temp:      { Icon: Thermometer,   label: 'Temp',    unit: '°C',    color: 'text-orange-400' },
  custom:    { Icon: Clock,         label: 'Evento',  unit: '',      color: 'text-app-text-2' },
};

function groupByDay(events: EventoClinico[]): Record<string, EventoClinico[]> {
  const groups: Record<string, EventoClinico[]> = {};
  for (const ev of events) {
    const day = ev.ts.split('T')[0];
    (groups[day] ??= []).push(ev);
  }
  return groups;
}

export default function TimelineDrawer({ pacienteId, pacienteNome, onClose }: Props) {
  const [events, setEvents] = useState<EventoClinico[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('eventos_clinicos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('ts', { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Mini-charts: SOFA, Lactato, PAM
  const sofaVals = events.filter((e) => e.tipo === 'sofa').map((e) => e.valor_num).filter((v): v is number => v != null);
  const lacVals  = events.filter((e) => e.tipo === 'lactato').map((e) => e.valor_num).filter((v): v is number => v != null);
  const pamVals  = events.filter((e) => e.tipo === 'pam').map((e) => e.valor_num).filter((v): v is number => v != null);

  const grouped = groupByDay(events);
  const days = Object.keys(grouped).sort().reverse(); // mais recente primeiro

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[450px] bg-app-card border-l border-app-border shadow-2xl flex flex-col sasi-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-app-border shrink-0">
          <div>
            <h3 className="text-sm font-bold text-app-text">Timeline</h3>
            <p className="text-xs text-app-text-muted truncate">{pacienteNome}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-app-tertiary rounded-lg text-app-text-muted hover:text-app-text transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mini-charts */}
        {!loading && (sofaVals.length > 0 || lacVals.length > 0 || pamVals.length > 0) && (
          <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-app-border shrink-0">
            {sofaVals.length > 0 && (
              <MiniChart values={sofaVals} label="SOFA" current={sofaVals[sofaVals.length - 1]} />
            )}
            {lacVals.length > 0 && (
              <MiniChart values={lacVals} label="Lactato" current={lacVals[lacVals.length - 1]} />
            )}
            {pamVals.length > 0 && (
              <MiniChart values={pamVals} label="PAM" current={pamVals[pamVals.length - 1]} />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && (
            <div className="text-center text-app-text-muted text-sm py-12 animate-pulse">
              Carregando eventos…
            </div>
          )}

          {!loading && events.length === 0 && (
            <div className="text-center text-app-text-muted text-sm py-12">
              Nenhum evento clínico registrado.
            </div>
          )}

          {!loading && days.map((day) => (
            <div key={day} className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted mb-2 sticky top-0 bg-app-card py-1">
                {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })}
              </div>
              <div className="space-y-1.5">
                {grouped[day].map((ev) => {
                  const meta = TIPO_META[ev.tipo] ?? TIPO_META.custom;
                  const hora = new Date(ev.ts).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 transition"
                    >
                      <meta.Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-app-text-2">
                            {meta.label}
                          </span>
                          {ev.valor_num != null && (
                            <span className={`text-sm font-bold tabular-nums ${
                              ev.tipo === 'sofa' ? sofaColorClass(ev.valor_num) : meta.color
                            }`}>
                              {ev.valor_num}
                              {meta.unit && (
                                <span className="text-[10px] text-app-text-muted ml-0.5">
                                  {meta.unit}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-app-text-muted mt-0.5">
                          {hora} · {ev.fonte}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
