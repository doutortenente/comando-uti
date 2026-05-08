// ============================================================================
// SASI · TableView — modo "Editor" (tabela densa tipo PAINEL GERAL)
// Espelha a planilha SASI_UTI_20Leitos.xlsx:
//   Leito | Paciente | PAS | PAM | FC | FR | SpO2 | TAX | BH | Diurese | HD | Status | Infeccioso
// Dados de sinais vitais extraídos do JSONB da última evolução.
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, ArrowUpDown, Heart, Thermometer, Wind,
  Droplets, Bug,
} from 'lucide-react';
import type { DashboardRow, Evolucao } from '../lib/supabaseClient';
import { supabase } from '../lib/supabaseClient';
import { sofaColorClass, checkVitalAlert } from '../lib/drugs';

interface Props {
  patients: DashboardRow[];
  onSelect: (id: string) => void;
}

type SortKey = 'leito' | 'sofa' | 'gravidade' | 'dias' | 'pam' | 'fc' | 'spo2' | 'tax';
type SortDir = 'asc' | 'desc';

/** Safely extract a numeric value from nested JSONB data */
function extractNum(evol: Evolucao | null, ...paths: string[]): number | null {
  if (!evol) return null;
  for (const path of paths) {
    const parts = path.split('.');
    let val: unknown = evol;
    for (const p of parts) {
      if (val == null || typeof val !== 'object') { val = null; break; }
      val = (val as Record<string, unknown>)[p];
    }
    if (val != null && val !== '') {
      const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/** Extracts vitals from evolução's system JSONB fields */
function extractVitals(evol: Evolucao | null) {
  return {
    pas: extractNum(evol, 'hemo.pas', 'hemo.pas_max', 'hemo.pa'),
    pam: extractNum(evol, 'hemo.pam', 'hemo.pam_media'),
    fc:  extractNum(evol, 'hemo.fc', 'hemo.fc_max'),
    fr:  extractNum(evol, 'resp.fr', 'resp.fr_total'),
    spo2: extractNum(evol, 'resp.spo2'),
    tax: extractNum(evol, 'infecto.tmax', 'infecto.tax', 'infecto.temperatura', 'infecto.temp'),
    bh:  extractNum(evol, 'renal.bh', 'renal.balanco_hidrico'),
    diurese: extractNum(evol, 'renal.diurese', 'renal.diurese_24h'),
    lactato: extractNum(evol, 'hemo.lactato'),
  };
}

/** Color class for vital alert status */
function vitalCellClass(key: string, value: number | null): string {
  if (value == null) return 'text-app-text-muted';
  const status = checkVitalAlert(key, value);
  switch (status) {
    case 'high': return 'text-red-400 font-bold';
    case 'low': return 'text-sky-400 font-bold';
    case 'absurd': return 'text-amber-300 font-black animate-pulse';
    default: return 'text-app-text-2';
  }
}

const GRAV_ORDER: Record<string, number> = {
  critico: 0, grave: 1, moderado: 2, estavel: 3, obito: 4,
};

export default function TableView({ patients, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('leito');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [evolMap, setEvolMap] = useState<Record<string, Evolucao>>({});
  const [loadingEvols, setLoadingEvols] = useState(false);

  // Fetch latest evolução for all visible patients to extract vitals
  const loadEvols = useCallback(async () => {
    if (patients.length === 0) return;
    setLoadingEvols(true);
    const ids = patients.map(p => p.paciente_id);
    // Fetch latest evolução per patient (batch)
    const { data } = await supabase
      .from('evolucoes')
      .select('*')
      .in('paciente_id', ids)
      .order('created_at', { ascending: false });

    if (data) {
      const map: Record<string, Evolucao> = {};
      for (const e of data as Evolucao[]) {
        if (!map[e.paciente_id]) map[e.paciente_id] = e;
      }
      setEvolMap(map);
    }
    setLoadingEvols(false);
  }, [patients]);

  useEffect(() => { void loadEvols(); }, [loadEvols]);

  // Sort toggle
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  // Sorted patients
  const sorted = [...patients].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const va = extractVitals(evolMap[a.paciente_id] ?? null);
    const vb = extractVitals(evolMap[b.paciente_id] ?? null);

    switch (sortKey) {
      case 'leito': return dir * a.leito.localeCompare(b.leito, undefined, { numeric: true });
      case 'sofa': return dir * ((a.sofa_total ?? 0) - (b.sofa_total ?? 0));
      case 'gravidade': return dir * ((GRAV_ORDER[a.gravidade] ?? 9) - (GRAV_ORDER[b.gravidade] ?? 9));
      case 'dias': return dir * (a.dias_internacao - b.dias_internacao);
      case 'pam': return dir * ((va.pam ?? 999) - (vb.pam ?? 999));
      case 'fc': return dir * ((va.fc ?? 999) - (vb.fc ?? 999));
      case 'spo2': return dir * ((va.spo2 ?? 999) - (vb.spo2 ?? 999));
      case 'tax': return dir * ((va.tax ?? 0) - (vb.tax ?? 0));
      default: return 0;
    }
  });

  function SortTh({ label, sKey, icon: Icon, className = '' }: { label: string; sKey: SortKey; icon?: React.ElementType; className?: string }) {
    const isActive = sortKey === sKey;
    return (
      <th
        className={`text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0 cursor-pointer select-none hover:bg-app-tertiary/50 transition whitespace-nowrap ${className}`}
        onClick={() => toggleSort(sKey)}
      >
        <div className="flex items-center gap-1">
          {Icon && <Icon className="w-3 h-3 opacity-50" />}
          {label}
          {isActive && <ArrowUpDown className="w-2.5 h-2.5 text-app-accent" />}
        </div>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-card">
      {loadingEvols && (
        <div className="text-[10px] text-app-text-muted text-center py-1 animate-pulse">
          Carregando sinais vitais...
        </div>
      )}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-app-tertiary text-app-text-2">
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0">UTI</th>
            <SortTh label="Leito" sKey="leito" />
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0">Paciente</th>
            <SortTh label="Grav" sKey="gravidade" />
            <SortTh label="SOFA" sKey="sofa" icon={Activity} />
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0">D</th>
            {/* SINAIS VITAIS — espelho do PAINEL GERAL da planilha */}
            <SortTh label="PAS" sKey="pam" icon={Heart} className="bg-rose-950/20" />
            <SortTh label="PAM" sKey="pam" icon={Heart} className="bg-rose-950/20" />
            <SortTh label="FC" sKey="fc" icon={Activity} className="bg-rose-950/20" />
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0 bg-sky-950/20"><Wind className="w-3 h-3 inline opacity-50" /> FR</th>
            <SortTh label="SpO₂" sKey="spo2" icon={Wind} className="bg-sky-950/20" />
            <SortTh label="TAX" sKey="tax" icon={Thermometer} className="bg-teal-950/20" />
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0">BH</th>
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0"><Droplets className="w-3 h-3 inline opacity-50" /> Diur</th>
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0">DVA</th>
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0 bg-teal-950/20"><Bug className="w-3 h-3 inline opacity-50" /> Infec</th>
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0">Pend</th>
            <th className="text-left font-semibold uppercase tracking-wider text-[9px] px-1.5 py-2 sticky top-0 min-w-[200px]">Diagnóstico</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const evol = evolMap[p.paciente_id] ?? null;
            const v = extractVitals(evol);
            const delta = p.delta_sofa_24h ?? 0;
            const deltaClass = delta > 0 ? 'text-red-400' : delta < 0 ? 'text-emerald-400' : 'text-app-text-muted';
            const dvaCount = Array.isArray(p.dvas) ? p.dvas.length : 0;
            const sedCount = Array.isArray(p.sedativos) ? p.sedativos.length : 0;

            // Infeccioso indicator (has ATB or elevated temp or lactato)
            const hasInfecto = (v.tax != null && v.tax > 38) || (v.lactato != null && v.lactato > 2);

            return (
              <tr
                key={p.paciente_id}
                onClick={() => onSelect(p.paciente_id)}
                className="cursor-pointer border-t border-app-border hover:bg-app-tertiary/50 transition"
              >
                <Td className="text-[10px] text-app-text-muted">{p.uti}</Td>
                <Td className="font-black tabular-nums text-app-text">{p.leito}</Td>
                <Td className="font-semibold text-app-text max-w-[120px] truncate">{p.nome}</Td>
                <Td>
                  <span className={`gravidade-${p.gravidade} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                    {p.gravidade}
                  </span>
                </Td>
                <Td>
                  <span className={`font-bold tabular-nums ${sofaColorClass(p.sofa_total)}`}>
                    {p.sofa_total ?? '—'}
                  </span>
                  {delta !== 0 && (
                    <span className={`ml-1 text-[9px] ${deltaClass}`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </Td>
                <Td className="tabular-nums text-app-text-muted">D{p.dias_internacao}</Td>

                {/* SINAIS VITAIS */}
                <Td className={`tabular-nums ${vitalCellClass('pas', v.pas)}`}>
                  {v.pas ?? '—'}
                </Td>
                <Td className={`tabular-nums ${vitalCellClass('pam', v.pam)}`}>
                  {v.pam ?? '—'}
                </Td>
                <Td className={`tabular-nums ${vitalCellClass('fc', v.fc)}`}>
                  {v.fc ?? '—'}
                </Td>
                <Td className={`tabular-nums ${vitalCellClass('fr', v.fr)}`}>
                  {v.fr ?? '—'}
                </Td>
                <Td className={`tabular-nums ${vitalCellClass('spo2', v.spo2)}`}>
                  {v.spo2 != null ? `${v.spo2}%` : '—'}
                </Td>
                <Td className={`tabular-nums ${vitalCellClass('tax', v.tax)}`}>
                  {v.tax != null ? `${v.tax}°` : '—'}
                </Td>
                <Td className={`tabular-nums ${v.bh != null && v.bh > 0 ? 'text-amber-400' : v.bh != null && v.bh < 0 ? 'text-sky-400' : 'text-app-text-muted'}`}>
                  {v.bh != null ? `${v.bh > 0 ? '+' : ''}${v.bh}` : '—'}
                </Td>
                <Td className="tabular-nums text-app-text-2">
                  {v.diurese ?? '—'}
                </Td>

                {/* DVA */}
                <Td>
                  {dvaCount > 0 ? (
                    <span className="text-rose-400 font-bold">{dvaCount}</span>
                  ) : sedCount > 0 ? (
                    <span className="text-purple-400 text-[10px]">Sed:{sedCount}</span>
                  ) : (
                    <span className="text-app-text-muted">—</span>
                  )}
                </Td>

                {/* Infeccioso */}
                <Td>
                  {hasInfecto ? (
                    <span className="inline-flex items-center gap-0.5 text-teal-400 font-semibold">
                      <AlertTriangle className="w-2.5 h-2.5" /> Sim
                    </span>
                  ) : (
                    <span className="text-app-text-muted">—</span>
                  )}
                </Td>

                {/* Pendências */}
                <Td className="tabular-nums">
                  {p.pendencias_abertas > 0 ? (
                    <span className="text-amber-400 font-bold">{p.pendencias_abertas}</span>
                  ) : '—'}
                </Td>

                {/* HD */}
                <Td className="text-app-text-muted max-w-[250px] truncate" title={p.hd ?? undefined}>
                  {p.hd ?? '—'}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-1.5 py-1.5 ${className}`} title={title}>
      {children}
    </td>
  );
}
