// ============================================================================
// SASI · LeitoCard — card de leito redesenhado (layout Gemini-style)
// border-l-4 por gravidade + badge strip + visual hierarchy melhorada
// ============================================================================
import {
  Activity, AlertTriangle, Clock, Droplets, Heart,
  Skull, TrendingDown, TrendingUp,
} from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';

interface Props {
  row: DashboardRow;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

export default function LeitoCard({ row, onSelect, compact = false }: Props) {
  const delta = row.delta_sofa_24h;
  const deltaIsBad = delta != null && delta > 0;
  const deltaIsGood = delta != null && delta < 0;
  const dvaCount = Array.isArray(row.dvas) ? row.dvas.length : 0;
  const sedCount = Array.isArray(row.sedativos) ? row.sedativos.length : 0;

  return (
    <button
      onClick={() => onSelect?.(row.paciente_id)}
      className={`text-left w-full rounded-xl border transition shadow-lg sasi-fade-in card-grav-${row.gravidade} ${
        compact ? 'p-3' : 'p-4'
      } gravidade-${row.gravidade} ${row.gravidade === 'critico' ? 'sasi-critical-pulse' : ''} hover:-translate-y-0.5 hover:shadow-xl`}
    >
      {/* HEADER — Leito grande + Nome */}
      <div className={`flex items-start justify-between gap-2 ${compact ? 'mb-1' : 'mb-2'}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`font-black tabular-nums ${compact ? 'text-lg' : 'text-2xl'}`}>
              {row.leito}
            </span>
            <span className="text-[10px] font-mono opacity-60">{row.uti}</span>
          </div>
          <div
            className={`font-semibold truncate ${compact ? 'text-xs' : 'text-sm'}`}
            title={row.nome}
          >
            {row.nome}
          </div>
        </div>
        {/* SOFA badge compacto */}
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase opacity-60 tracking-wider">SOFA</div>
          <div className={`font-bold tabular-nums ${sofaColorClass(row.sofa_total)} ${compact ? 'text-xl' : 'text-2xl'}`}>
            {row.sofa_total ?? '—'}
          </div>
          {delta != null && delta !== 0 && (
            <div
              className={`flex items-center justify-end gap-0.5 text-[10px] tabular-nums ${
                deltaIsBad ? 'text-red-400' : deltaIsGood ? 'text-emerald-400' : 'opacity-60'
              }`}
            >
              {deltaIsBad ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {delta > 0 ? '+' : ''}{delta}
            </div>
          )}
        </div>
      </div>

      {/* HD — sempre visível, truncado */}
      {!compact && row.hd && (
        <div
          className="text-[11px] opacity-70 line-clamp-2 mb-2 leading-relaxed"
          title={row.hd}
        >
          {row.hd}
        </div>
      )}

      {/* META ROW — dias + idade/peso */}
      {!compact && (
        <div className="flex items-center gap-3 text-[11px] opacity-80 mb-2">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 opacity-60" /> D{row.dias_internacao}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 opacity-60" /> {row.idade ?? '?'}a / {row.peso ?? '?'}kg
          </span>
        </div>
      )}

      {/* BADGE STRIP — Gemini-style colored pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Gravidade */}
        <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded gravidade-${row.gravidade}`}>
          {row.gravidade}
        </span>

        {dvaCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300">
            <Heart className="w-2.5 h-2.5" /> DVA {dvaCount}
          </span>
        )}
        {sedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300">
            <Droplets className="w-2.5 h-2.5" /> Sed {sedCount}
          </span>
        )}
        {row.pendencias_abertas > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 ml-auto">
            <AlertTriangle className="w-2.5 h-2.5" /> {row.pendencias_abertas}
          </span>
        )}

        {row.gravidade === 'obito' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded opacity-60">
            <Skull className="w-2.5 h-2.5" /> Óbito
          </span>
        )}
      </div>
    </button>
  );
}
