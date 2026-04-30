// ============================================================================
// SASI · LeitoCard — uma "trincheira" por paciente ativo (re-skin Apr-30)
// ============================================================================
import { Activity, AlertTriangle, Clock, Droplets, Heart, Skull, TrendingDown, TrendingUp } from 'lucide-react';
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
      className={`text-left w-full rounded-xl border transition shadow-lg sasi-fade-in ${
        compact ? 'p-3' : 'p-4'
      } gravidade-${row.gravidade} ${row.gravidade === 'critico' ? 'sasi-critical-pulse' : ''} hover:-translate-y-0.5 hover:shadow-xl`}
    >
      {/* HEADER */}
      <div className={`flex items-start justify-between ${compact ? 'mb-1.5' : 'mb-2.5'}`}>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono opacity-70">
            {row.uti} · LEITO {row.leito}
          </div>
          <div
            className={`font-semibold truncate ${compact ? 'text-sm' : 'text-base'}`}
            title={row.nome}
          >
            {row.nome}
          </div>
        </div>
        <span
          className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded`}
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          {row.gravidade}
        </span>
      </div>

      {/* SOFA + DELTA */}
      <div className={`flex items-baseline gap-3 ${compact ? 'mb-1.5' : 'mb-2.5'}`}>
        <div>
          <div className="text-[10px] uppercase opacity-70">SOFA</div>
          <div className={`font-bold tabular-nums ${sofaColorClass(row.sofa_total)} ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {row.sofa_total ?? '—'}
          </div>
        </div>
        {delta != null && delta !== 0 && (
          <div
            className={`flex items-center gap-1 text-sm tabular-nums ${
              deltaIsBad ? 'text-red-400' : deltaIsGood ? 'text-emerald-400' : 'opacity-60'
            }`}
          >
            {deltaIsBad ? <TrendingUp className="w-4 h-4" /> : deltaIsGood ? <TrendingDown className="w-4 h-4" /> : null}
            <span>
              {delta > 0 ? '+' : ''}
              {delta} 24h
            </span>
          </div>
        )}
      </div>

      {/* META — escondido em compact */}
      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 opacity-90">
              <Clock className="w-3.5 h-3.5 opacity-70" /> D{row.dias_internacao}
            </div>
            <div className="flex items-center gap-1.5 opacity-90">
              <Activity className="w-3.5 h-3.5 opacity-70" /> {row.idade ?? '?'}a / {row.peso ?? '?'}kg
            </div>
            {dvaCount > 0 && (
              <div className="flex items-center gap-1.5 col-span-2 text-red-300">
                <Heart className="w-3.5 h-3.5" /> DVA ({dvaCount})
              </div>
            )}
            {sedCount > 0 && (
              <div className="flex items-center gap-1.5 col-span-2 text-purple-300">
                <Droplets className="w-3.5 h-3.5" /> Sedação ({sedCount})
              </div>
            )}
            {row.pendencias_abertas > 0 && (
              <div className="flex items-center gap-1.5 col-span-2 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" /> {row.pendencias_abertas} pendência
                {row.pendencias_abertas > 1 ? 's' : ''}
              </div>
            )}
            {row.gravidade === 'obito' && (
              <div className="flex items-center gap-1.5 col-span-2 opacity-60">
                <Skull className="w-3.5 h-3.5" /> Óbito registrado
              </div>
            )}
          </div>

          {row.hd && (
            <div
              className="mt-2.5 pt-2.5 border-t text-[11px] opacity-75 line-clamp-2"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              title={row.hd}
            >
              {row.hd}
            </div>
          )}
        </>
      )}
    </button>
  );
}
