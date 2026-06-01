// ============================================================================
// SASI · VitalsLabsPanel — Sinais vitais + Laboratório estruturados
// Espelha FASE 1 (Sinais Vitais min/max + HITL) e LABORATÓRIO da planilha
// SASI_UTI_20Leitos.xlsx, com color-coding por threshold e referência.
// ============================================================================
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Heart,
  Thermometer, Wind, Droplets, FlaskConical, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  VITAL_THRESHOLDS, LAB_REFERENCES,
  checkVitalAlert, checkLabAlert,
} from '../lib/drugs';
import { clinicalNum, clinicalRange } from '../lib/clinicalFormat';

// ── Types ────────────────────────────────────────────────────────────────────

interface VitalsData {
  pas?: number | string;
  pas_max?: number | string;
  pas_min?: number | string;
  pad?: number | string;
  pad_max?: number | string;
  pad_min?: number | string;
  pam?: number | string;
  pam_max?: number | string;
  pam_min?: number | string;
  fc?: number | string;
  fc_max?: number | string;
  fc_min?: number | string;
  fr?: number | string;
  spo2?: number | string;
  tax?: number | string;
  dx?: number | string;
  bh?: number | string;
  diurese?: number | string;
  [key: string]: unknown;
}

interface LabsData {
  [key: string]: number | string | undefined;
}

interface Props {
  /** Dados da evolucao.hemo / evolucao.resp / evolucao combinado */
  vitals?: VitalsData | null;
  /** Dados de laboratório (do JSONB da evolucao ou campo dedicado) */
  labs?: LabsData | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isNaN(n) ? null : n;
}

function alertColor(status: string): string {
  switch (status) {
    case 'low': return 'text-sky-400 bg-sky-950/30';
    case 'high': return 'text-red-400 bg-red-950/30';
    case 'absurd': return 'text-amber-300 bg-amber-950/40 ring-1 ring-amber-500/50';
    default: return 'text-emerald-400 bg-emerald-950/20';
  }
}

function labAlertColor(status: string): string {
  switch (status) {
    case 'low': return 'text-sky-400';
    case 'high': return 'text-red-400';
    default: return 'text-app-text-2';
  }
}

function trendIcon(val1: number | null, val2: number | null) {
  if (val1 == null || val2 == null) return null;
  if (val1 > val2) return <TrendingUp className="w-3 h-3 text-red-400" />;
  if (val1 < val2) return <TrendingDown className="w-3 h-3 text-emerald-400" />;
  return <Minus className="w-3 h-3 text-app-text-muted" />;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function VitalCard({
  thresholdKey,
  value,
  maxVal,
  minVal,
  icon: Icon,
}: {
  thresholdKey: string;
  value: unknown;
  maxVal?: unknown;
  minVal?: unknown;
  icon: React.ElementType;
}) {
  const t = VITAL_THRESHOLDS[thresholdKey];
  if (!t) return null;

  // O modelo SASI v2.0 guarda objetos {max,min,valor}; aceita tanto escalar
  // (campos *_max/_min separados) quanto o objeto inteiro em `value`.
  const range = clinicalRange(value);
  const numVal = parseNum(value) ?? clinicalNum(value);
  const numMax = parseNum(maxVal) ?? range?.max ?? null;
  const numMin = parseNum(minVal) ?? range?.min ?? null;
  const displayVal = numMax != null ? numMax : numVal;
  const status = displayVal != null ? checkVitalAlert(thresholdKey, displayVal) : 'ok';
  const hasRange = numMax != null && numMin != null;

  return (
    <div className={`flex flex-col items-center p-2 rounded-lg transition ${alertColor(status)}`}>
      <div className="flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3 opacity-70" />
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{t.label}</span>
      </div>
      {hasRange ? (
        <div className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <span className="text-[8px] opacity-50 flex items-center gap-0.5"><ArrowUp className="w-2 h-2" />max</span>
            <span className="text-sm font-black tabular-nums">{numMax}</span>
          </div>
          <span className="text-[10px] opacity-40 mx-0.5">/</span>
          <div className="flex flex-col items-center">
            <span className="text-[8px] opacity-50 flex items-center gap-0.5"><ArrowDown className="w-2 h-2" />min</span>
            <span className="text-sm font-black tabular-nums">{numMin}</span>
          </div>
        </div>
      ) : displayVal != null ? (
        <span className="text-lg font-black tabular-nums">{displayVal}</span>
      ) : (
        <span className="text-sm opacity-40">—</span>
      )}
      <span className="text-[8px] opacity-50 mt-0.5">{t.unit}</span>
      {status !== 'ok' && (
        <div className="flex items-center gap-0.5 mt-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span className="text-[8px] font-bold uppercase">
            {status === 'absurd' ? 'REVISAR' : status === 'low' ? `<${t.low}` : `>${t.high}`}
          </span>
        </div>
      )}
    </div>
  );
}

function LabRow({ labKey, val1, val2 }: { labKey: string; val1: unknown; val2?: unknown }) {
  const ref = LAB_REFERENCES[labKey];
  if (!ref) return null;

  const n1 = parseNum(val1);
  const n2 = parseNum(val2);
  if (n1 == null && n2 == null) return null;

  const status1 = n1 != null ? checkLabAlert(labKey, n1) : 'normal';
  const trend = trendIcon(n1, n2);

  return (
    <div className="flex items-center gap-2 py-1 border-b border-app-border/30 last:border-b-0">
      <span className="text-[10px] text-app-text-muted w-14 shrink-0 font-semibold">{ref.label}</span>
      <span className={`text-xs font-bold tabular-nums ${labAlertColor(status1)}`}>
        {n1 ?? '—'}
      </span>
      {n2 != null && (
        <>
          {trend}
          <span className="text-[10px] tabular-nums text-app-text-muted">{n2}</span>
        </>
      )}
      <span className="text-[9px] text-app-text-muted/60 ml-auto">{ref.unit}</span>
      <span className="text-[8px] text-app-text-muted/40 w-16 text-right tabular-nums">
        {ref.low}–{ref.high}
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function VitalsLabsPanel({ vitals, labs }: Props) {
  const hasVitals = vitals && Object.values(vitals).some(v => v != null && v !== '');
  const hasLabs = labs && Object.values(labs).some(v => v != null && v !== '');

  if (!hasVitals && !hasLabs) return null;

  // Extract vital signs from combined data (hemo + resp + tgi + renal)
  const v = vitals ?? {};

  // Build lab entries from available data
  const labEntries: { key: string; val1: unknown; val2?: unknown }[] = [];
  if (hasLabs) {
    const labKeys = ['hb', 'ht', 'plaq', 'leuco', 'ur', 'cr', 'na', 'k', 'mg', 'cai', 'lactato', 'pcr', 'ph', 'pco2', 'hco3', 'bb'];
    for (const key of labKeys) {
      const val1 = labs![key] ?? labs![`${key}1`] ?? labs![`${key}_1`];
      const val2 = labs![`${key}2`] ?? labs![`${key}_2`] ?? labs![`${key}_prev`];
      if (val1 != null && val1 !== '') {
        labEntries.push({ key, val1, val2 });
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* SINAIS VITAIS — grid compacto com threshold alerts */}
      {hasVitals && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-app-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted">
              Sinais Vitais
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-1.5">
            <VitalCard thresholdKey="pas" value={v.pas} maxVal={v.pas_max} minVal={v.pas_min} icon={Heart} />
            <VitalCard thresholdKey="pam" value={v.pam} maxVal={v.pam_max} minVal={v.pam_min} icon={Heart} />
            <VitalCard thresholdKey="fc" value={v.fc} maxVal={v.fc_max} minVal={v.fc_min} icon={Activity} />
            <VitalCard thresholdKey="fr" value={v.fr} icon={Wind} />
            <VitalCard thresholdKey="spo2" value={v.spo2} icon={Wind} />
            <VitalCard thresholdKey="tax" value={v.tax} icon={Thermometer} />
            <VitalCard thresholdKey="dx" value={v.dx} icon={Droplets} />
            {/* BH and Diurese as plain values (no threshold) */}
            {(v.bh != null && v.bh !== '') && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-app-tertiary/50">
                <span className="text-[9px] font-bold uppercase tracking-wider text-app-text-muted opacity-80 mb-1">BH</span>
                <span className={`text-lg font-black tabular-nums ${parseNum(v.bh) != null && parseNum(v.bh)! > 0 ? 'text-amber-400' : 'text-sky-400'}`}>
                  {parseNum(v.bh) != null && parseNum(v.bh)! > 0 ? '+' : ''}{v.bh}
                </span>
                <span className="text-[8px] opacity-50 mt-0.5">ml</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LABORATÓRIO — tabela compacta com referências e tendências */}
      {labEntries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted">
              Laboratório
            </span>
            <span className="text-[8px] text-app-text-muted/50 ml-auto">Val 1 → Val 2 | Ref.</span>
          </div>
          <div className="rounded-lg border border-app-border/50 bg-app-card p-2 grid grid-cols-1 md:grid-cols-2 gap-x-4">
            {labEntries.map(({ key, val1, val2 }) => (
              <LabRow key={key} labKey={key} val1={val1} val2={val2} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
