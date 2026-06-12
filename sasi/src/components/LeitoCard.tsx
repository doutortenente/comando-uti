// ============================================================================
// SASI · LeitoCard — card para uso pontual (visita de consultor)
// Hero: Problemas Ativos com Vetor ↑/↓/= | border-l gravidade | SOFA badge
// ============================================================================
import {
  Activity, AlertTriangle, Droplets, Flame, Heart,
  Skull, Wind, Pill,
} from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';

interface Props {
  row: DashboardRow;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

type ProblemaDisplay = {
  texto: string;
  vetor: '↑' | '↓' | '=' | null;
};

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

function getProblemas(row: DashboardRow): ProblemaDisplay[] {
  const snapshot = row.sofa_snapshot as Record<string, unknown> | undefined;

  // Prioridade 1: problemas_ativos estruturados — SASI v2.0 (com vetor)
  const problemasAtivos = snapshot?.problemas_ativos;
  if (Array.isArray(problemasAtivos) && problemasAtivos.length > 0) {
    return (problemasAtivos as Array<{ texto: string; vetor?: string }>)
      .slice(0, 4)
      .map(p => ({ texto: p.texto, vetor: (p.vetor as '↑' | '↓' | '=' | null) ?? null }));
  }

  // Prioridade 2: problemas_principais legado (string[], sem vetor)
  const principais = snapshot?.problemas_principais;
  if (Array.isArray(principais) && principais.length > 0) {
    return (principais as string[]).slice(0, 3).map(texto => ({ texto, vetor: null }));
  }

  // Prioridade 3: HD como fallback
  if (row.hd) return [{ texto: row.hd, vetor: null }];

  return [];
}

// Rótulos PT-BR de gravidade ("Watcher" = jargão de round para o moderado
// que merece vigilância) — o valor cru do banco fica só nas classes CSS.
const GRAVIDADE_LABEL: Record<string, string> = {
  estavel: 'Estável',
  moderado: 'Watcher',
  grave: 'Instável',
  critico: 'Crítico',
  obito: 'Óbito',
};

const VETOR_STYLE: Record<string, { badge: string; row: string }> = {
  '↑': { badge: 'text-red-400 font-black text-base leading-none', row: 'text-app-text font-medium' },
  '↓': { badge: 'text-emerald-400 font-black text-base leading-none', row: 'text-app-text-2' },
  '=': { badge: 'text-slate-400 font-bold text-sm leading-none', row: 'text-app-text-muted' },
};

export default function LeitoCard({ row, onSelect, compact = false }: Props) {
  const delta = row.delta_sofa_24h;
  const deltaIsBad = delta != null && delta > 0;
  const deltaIsGood = delta != null && delta < 0;
  const dvaCount = Array.isArray(row.dvas) ? row.dvas.length : 0;
  const sedCount = Array.isArray(row.sedativos) ? row.sedativos.length : 0;

  const isSeptic = (row.sofa_total ?? 0) >= 2 && delta != null && delta >= 2;

  const snapshot = row.sofa_snapshot as Record<string, unknown> | undefined;
  const respData = snapshot?.resp as Record<string, unknown> | undefined;
  const infectoData = snapshot?.infecto as Record<string, unknown> | undefined;
  const { vm: hasVM, vni: hasVNI } = detectSupport(respData);
  const hasATB = detectATB(infectoData);

  const problemas = getProblemas(row);
  const maxProblemas = compact ? 2 : 3;

  // Hero: primeiro problema com vetor grande (decisão em 3-5 segundos)
  const mainProblema = problemas[0];
  const mainStyle = mainProblema?.vetor ? VETOR_STYLE[mainProblema.vetor] : null;
  const outrosProblemas = problemas.slice(1, maxProblemas);

  return (
    <button
      onClick={() => onSelect?.(row.paciente_id)}
      className={`group relative text-left w-full rounded-2xl border transition shadow-md sasi-fade-in card-grav-${row.gravidade} ${
        compact ? 'p-3' : 'p-4'
      } ${isSeptic || row.gravidade === 'critico' ? 'sasi-critical-pulse' : ''} hover:shadow-xl hover:-translate-y-[1px] cursor-pointer active:scale-[0.992]`}
    >
      {/* HEADER — Leito + UTI + SOFA + Delta (ultra-visível) */}
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase text-app-text-muted tracking-wider">Leito</span>
          <span className={`font-black tabular-nums text-app-text ${compact ? 'text-xl' : 'text-2xl'}`}>
            {row.leito}
          </span>
          <span className="text-[10px] font-mono text-app-text-muted">{row.uti}</span>
        </div>

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
            <span className={`ml-0.5 font-bold ${deltaIsBad ? 'text-red-400' : deltaIsGood ? 'text-emerald-400' : 'text-app-text-muted'}`}>
              {deltaIsBad && '↑'}
              {deltaIsGood && '↓'}
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>

      {/* NOME */}
      <h3
        className={`font-bold text-app-text leading-tight truncate ${compact ? 'text-sm mb-1.5' : 'text-base mb-1.5'}`}
        title={row.nome}
      >
        {row.nome || 'Não identificado'}
      </h3>

      {/* HERO: PROBLEMA PRINCIPAL COM VETOR GIGANTE (decisão pontual) */}
      {mainProblema ? (
        <div className={`${compact ? 'mb-2' : 'mb-3'} -mx-1 px-2 py-1.5 rounded-xl bg-app-tertiary/60 border border-app-border/60`}>
          <div className="flex items-start gap-2">
            <span className={`shrink-0 font-black tabular-nums leading-none pt-0.5 ${mainStyle?.badge ?? 'text-app-text-muted'} ${compact ? 'text-xl' : 'text-3xl'}`}>
              {mainProblema.vetor ?? '·'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted mb-px">PROBLEMA ATIVO</div>
              <div className={`font-semibold leading-tight text-app-text ${compact ? 'text-sm line-clamp-2' : 'text-[13px] line-clamp-3'}`}>
                {mainProblema.texto}
              </div>
            </div>
          </div>
        </div>
      ) : (
        !compact && (
          <div className="mb-2 text-xs text-app-text-muted/60 italic">Sem problemas estruturados ainda</div>
        )
      )}

      {/* Outros problemas (compactos) */}
      {outrosProblemas.length > 0 && (
        <div className="space-y-0.5 mb-2 text-[11px] text-app-text-2">
          {outrosProblemas.map((p, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <span className={`shrink-0 w-3 text-center font-bold ${p.vetor ? VETOR_STYLE[p.vetor].badge : 'text-app-text-muted/50'}`}>
                {p.vetor ?? '·'}
              </span>
              <span className="line-clamp-1">{p.texto}</span>
            </div>
          ))}
          {problemas.length > maxProblemas && (
            <div className="text-[10px] text-app-text-muted pl-4">+{problemas.length - maxProblemas} mais</div>
          )}
        </div>
      )}

      {/* SEPSIS-3 ALERT */}
      {isSeptic && !compact && (
        <div className="mt-1 mb-2 badge-sepsis text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded flex items-center justify-center gap-1 animate-pulse">
          <Flame className="w-3 h-3" /> Alerta Sepse-3
        </div>
      )}

      {/* BADGE STRIP */}
      <div className={`${compact ? 'mt-0.5' : 'pt-1.5 border-t border-app-border/30'} flex flex-wrap items-center gap-1.5`}>
        <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded gravidade-${row.gravidade}`}>
          {GRAVIDADE_LABEL[row.gravidade] ?? row.gravidade}
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
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-vm" title="VM invasiva">
            <Wind className="w-3 h-3" /> VM
          </span>
        )}
        {hasVNI && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-vni" title="VNI/CNAF">
            <Wind className="w-3 h-3" /> VNI
          </span>
        )}
        {hasATB && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-atb" title="Antibióticos em uso">
            <Pill className="w-3 h-3" /> ATB
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
