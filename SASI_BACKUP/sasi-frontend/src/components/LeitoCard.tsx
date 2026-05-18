// ============================================================================
// SASI · LeitoCard — card de leito Gemini-style
// border-l-8 por gravidade, SOFA badge, sepsis alert, badge strip completo
// ============================================================================
import {
  Activity, AlertTriangle, Clock, Droplets, Flame, Heart,
  Skull, TrendingDown, TrendingUp, Wind, Pill,
} from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';

interface Props {
  row: DashboardRow;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

function infusionNames(arr: unknown[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'droga' in item) return String((item as Record<string, unknown>).droga);
    return '';
  }).filter(Boolean);
}

function detectSupport(resp: Record<string, unknown> | null | undefined): { vm: boolean; vni: boolean } {
  if (!resp) return { vm: false, vni: false };
  const suporte = String(resp.suporte ?? resp.modo_ventilatorio ?? resp.via_aerea ?? '');
  const vm = /IOT|TOT|TQT|VMI|ventila/i.test(suporte);
  const vni = /VNI|CNAF|BiPAP|CPAP/i.test(suporte) && !vm;
  return { vm, vni };
}

function detectATB(infecto: Record<string, unknown> | null | undefined): boolean {
  if (!infecto) return false;
  const atb = infecto.atb_atual ?? infecto.atb ?? infecto.antibioticos ?? '';
  return typeof atb === 'string' ? atb.trim().length > 0 : Array.isArray(atb) && atb.length > 0;
}

export default function LeitoCard({ row, onSelect, compact = false }: Props) {
  const delta = row.delta_sofa_24h;
  const deltaIsBad = delta != null && delta > 0;
  const deltaIsGood = delta != null && delta < 0;
  const dvaCount = Array.isArray(row.dvas) ? row.dvas.length : 0;
  const sedCount = Array.isArray(row.sedativos) ? row.sedativos.length : 0;
  const dvaNames = infusionNames(row.dvas ?? []);
  const sedNames = infusionNames(row.sedativos ?? []);

  // Sepsis-3 heuristic: acute SOFA ≥ 2 with upward trend
  const isSeptic = (row.sofa_total ?? 0) >= 2 && delta != null && delta >= 2;

  // Derive VM/VNI/ATB from sofa_snapshot metadata if available
  const snapshot = row.sofa_snapshot as Record<string, unknown> | undefined;
  const respData = snapshot?.resp as Record<string, unknown> | undefined;
  const infectoData = snapshot?.infecto as Record<string, unknown> | undefined;
  const { vm: hasVM, vni: hasVNI } = detectSupport(respData);
  const hasATB = detectATB(infectoData);

  return (
    <button
      onClick={() => onSelect?.(row.paciente_id)}
      className={`group relative text-left w-full rounded-2xl border border-r border-y transition shadow-md sasi-fade-in card-grav-${row.gravidade} ${
        compact ? 'p-3' : 'p-4'
      } ${isSeptic ? 'sasi-critical-pulse' : row.gravidade === 'critico' ? 'sasi-critical-pulse' : ''} hover:shadow-lg hover:-translate-y-1 cursor-pointer`}
    >
      {/* HEADER — "Leito" label + number + SOFA badge */}
      <div className={`flex items-baseline justify-between gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase text-app-text-muted tracking-wider">Leito</span>
          <span className={`font-black tabular-nums text-app-text ${compact ? 'text-xl' : 'text-2xl'}`}>
            {row.leito}
          </span>
          <span className="text-[10px] font-mono text-app-text-muted">{row.uti}</span>
        </div>

        {/* SOFA badge */}
        <div
          className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
            (row.sofa_total ?? 0) >= 2 ? 'badge-sofa-hi' : 'badge-sofa-lo'
          }`}
          title={`SOFA Score: ${row.sofa_total ?? 0}`}
        >
          <Activity className="w-2.5 h-2.5" />
          <span>SOFA</span>
          <span className={`${sofaColorClass(row.sofa_total)} font-black`}>
            {row.sofa_total ?? '—'}
          </span>
          {delta != null && delta !== 0 && (
            <span className={`ml-0.5 ${deltaIsBad ? 'text-red-400' : deltaIsGood ? 'text-emerald-400' : ''}`}>
              {deltaIsBad && <TrendingUp className="w-2.5 h-2.5 inline" />}
              {deltaIsGood && <TrendingDown className="w-2.5 h-2.5 inline" />}
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>

      {/* NOME */}
      <h3
        className={`font-bold text-app-text leading-tight truncate ${compact ? 'text-sm mb-0.5' : 'text-lg mb-2'}`}
        title={row.nome}
      >
        {compact
          ? (row.nome || 'Não identificado').slice(0, 15)
          : (row.nome || 'Não identificado')}
      </h3>

      {/* HD compact: 1 linha truncada | HD normal: 2 linhas */}
      {compact ? (
        <p className="text-[10px] text-app-text-muted truncate mb-1" title={row.hd ?? undefined}>
          {row.hd || '—'}
        </p>
      ) : (
        <p
          className="text-xs text-app-text-muted font-medium line-clamp-2 leading-relaxed h-8 mb-1"
          title={row.hd ?? undefined}
        >
          {row.hd || 'Sem HD informada'}
        </p>
      )}

      {/* META — dias + idade/peso (non-compact) */}
      {!compact && (
        <div className="flex items-center gap-3 text-[11px] text-app-text-muted mb-2">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 opacity-60" /> D{row.dias_internacao}
          </span>
          <span>{row.idade ?? '?'}a / {row.peso ?? '?'}kg</span>
          {row.data_adm && (
            <span className="opacity-60">
              Adm {new Date(row.data_adm).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      )}

      {/* INFUSÕES — drug names inline (non-compact) */}
      {!compact && (dvaNames.length > 0 || sedNames.length > 0) && (
        <div className="text-[10px] mb-2 space-y-0.5">
          {dvaNames.length > 0 && (
            <div className="flex items-center gap-1 drug-dva">
              <Heart className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{dvaNames.join(', ')}</span>
            </div>
          )}
          {sedNames.length > 0 && (
            <div className="flex items-center gap-1 drug-sed">
              <Droplets className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{sedNames.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* SEPSIS-3 ALERT */}
      {isSeptic && (
        <div className="mt-1 mb-2 badge-sepsis text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded flex items-center justify-center gap-1 animate-pulse">
          <Flame className="w-3 h-3" /> Alerta Sepse-3
        </div>
      )}

      {/* BADGE STRIP — Gemini-style with separator */}
      <div className={`${compact ? 'mt-1' : 'mt-1 pt-2 border-t border-app-border/40'} flex flex-wrap items-center gap-1.5`}>
        {/* Gravidade pill */}
        <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded gravidade-${row.gravidade}`}>
          {row.gravidade}
        </span>

        {dvaCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-dva" title="Drogas Vasoativas em uso">
            <Heart className="w-3 h-3" /> DVA {dvaCount}
          </span>
        )}
        {sedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-sed" title="Sedação em uso">
            <Droplets className="w-3 h-3" /> Sed {sedCount}
          </span>
        )}
        {hasVM && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-vm" title="Ventilação Mecânica Invasiva">
            <Wind className="w-3 h-3" /> VM
          </span>
        )}
        {hasVNI && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-vni" title="Suporte Não Invasivo (VNI/CNAF)">
            <Wind className="w-3 h-3" /> VNI
          </span>
        )}
        {hasATB && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-atb" title="Antibióticos em uso">
            <Pill className="w-3 h-3" /> ATB
          </span>
        )}

        {(row.out_of_range_count ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-300" title="Valores fora do range clínico">
            ⚠️ {row.out_of_range_count}
          </span>
        )}
        {row.pendencias_abertas > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-pend ml-auto" title="Pendências em aberto">
            <AlertTriangle className="w-3 h-3" /> {row.pendencias_abertas}
          </span>
        )}

        {row.gravidade === 'obito' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded opacity-60">
            <Skull className="w-3 h-3" /> Óbito
          </span>
        )}
      </div>
    </button>
  );
}
