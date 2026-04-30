// ============================================================================
// SASI · LeitoCard.tsx — uma "trincheira" por paciente ativo
// ============================================================================
import { Activity, AlertTriangle, Clock, Droplets, Heart, Skull, TrendingDown, TrendingUp } from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';

interface Props {
  row: DashboardRow;
  onSelect?: (id: string) => void;
}

const GRAVIDADE_COLORS: Record<string, { bg: string; ring: string; label: string }> = {
  estavel:  { bg: 'bg-emerald-950',  ring: 'ring-emerald-500/40',  label: 'text-emerald-300' },
  moderado: { bg: 'bg-amber-950',    ring: 'ring-amber-500/40',    label: 'text-amber-300' },
  grave:    { bg: 'bg-orange-950',   ring: 'ring-orange-500/50',   label: 'text-orange-300' },
  critico:  { bg: 'bg-red-950',      ring: 'ring-red-500/60',      label: 'text-red-300' },
  obito:    { bg: 'bg-slate-900',    ring: 'ring-slate-600',       label: 'text-slate-400' },
};

function sofaColor(s?: number): string {
  if (s == null) return 'text-slate-500';
  if (s >= 11) return 'text-red-400';
  if (s >= 7)  return 'text-orange-400';
  if (s >= 4)  return 'text-amber-300';
  return 'text-emerald-400';
}

export default function LeitoCard({ row, onSelect }: Props) {
  const g = GRAVIDADE_COLORS[row.gravidade] ?? GRAVIDADE_COLORS.estavel;
  const delta = row.delta_sofa_24h;
  const deltaIsBad = delta != null && delta > 0;
  const deltaIsGood = delta != null && delta < 0;

  return (
    <button
      onClick={() => onSelect?.(row.paciente_id)}
      className={`text-left w-full ${g.bg} ${g.ring} ring-1 hover:ring-2 transition rounded-xl p-4 shadow-lg`}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-slate-400 font-mono">{row.uti} · LEITO {row.leito}</div>
          <div className="text-base font-semibold text-white truncate max-w-[200px]" title={row.nome}>
            {row.nome}
          </div>
        </div>
        <span className={`text-[10px] uppercase font-bold ${g.label} px-2 py-0.5 rounded bg-slate-900/60`}>
          {row.gravidade}
        </span>
      </div>

      {/* SOFA */}
      <div className="flex items-baseline gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase text-slate-500">SOFA</div>
          <div className={`text-3xl font-bold tabular-nums ${sofaColor(row.sofa_total)}`}>
            {row.sofa_total ?? '—'}
          </div>
        </div>
        {delta != null && (
          <div className={`flex items-center gap-1 text-sm ${deltaIsBad ? 'text-red-400' : deltaIsGood ? 'text-emerald-400' : 'text-slate-400'}`}>
            {deltaIsBad ? <TrendingUp className="w-4 h-4" /> : deltaIsGood ? <TrendingDown className="w-4 h-4" /> : null}
            <span className="tabular-nums">{delta > 0 ? '+' : ''}{delta} 24h</span>
          </div>
        )}
      </div>

      {/* META */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> D{row.dias_internacao}</div>
        <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-500" /> {row.idade ?? '?'}a / {row.peso ?? '?'}kg</div>
        {row.dvas && Array.isArray(row.dvas) && row.dvas.length > 0 && (
          <div className="flex items-center gap-1.5 col-span-2 text-red-300">
            <Heart className="w-3.5 h-3.5" /> DVA ativa ({row.dvas.length})
          </div>
        )}
        {row.sedativos && Array.isArray(row.sedativos) && row.sedativos.length > 0 && (
          <div className="flex items-center gap-1.5 col-span-2 text-purple-300">
            <Droplets className="w-3.5 h-3.5" /> Sedação ({row.sedativos.length})
          </div>
        )}
        {row.pendencias_abertas > 0 && (
          <div className="flex items-center gap-1.5 col-span-2 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" /> {row.pendencias_abertas} pendência{row.pendencias_abertas > 1 ? 's' : ''}
          </div>
        )}
        {row.gravidade === 'obito' && (
          <div className="flex items-center gap-1.5 col-span-2 text-slate-500">
            <Skull className="w-3.5 h-3.5" /> Óbito registrado
          </div>
        )}
      </div>

      {/* HD */}
      {row.hd && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 line-clamp-2" title={row.hd}>
          {row.hd}
        </div>
      )}
    </button>
  );
}
