// ============================================================================
// SASI · TrendsSparkline — Onda 1.5
// 4 mini-gráficos verticais (FC / PAM / SpO₂ / Lactato) das últimas 72h.
// CSS puro: divs com altura proporcional. Cores semafóricas por range clínico.
// Resiliente: paciente sem dados mostra "—" centralizado sem crash.
// ============================================================================
import { useMemo } from 'react';
import { Activity, Heart, RefreshCw, TrendingUp, Wind } from 'lucide-react';
import { useTrendsData, type TrendPoint } from '../../hooks/useTrendsData';

type Status = 'green' | 'yellow' | 'red';

interface MetricSpec {
  key: 'fc' | 'pam' | 'spo2' | 'lactato';
  label: string;
  unit: string;
  icon: typeof Heart;
  /** Domínio do eixo Y para escala visual (min, max). */
  domain: [number, number];
  /** Classifica um valor como verde/amarelo/vermelho. */
  classify: (v: number) => Status;
  /** Texto humano da faixa-alvo. */
  target: string;
}

const METRICS: readonly MetricSpec[] = [
  {
    key: 'fc',
    label: 'FC',
    unit: 'bpm',
    icon: Heart,
    domain: [40, 160],
    target: '60–100',
    classify: (v) => {
      if (v < 50 || v > 120) return 'red';
      if (v < 60 || v > 100) return 'yellow';
      return 'green';
    },
  },
  {
    key: 'pam',
    label: 'PAM',
    unit: 'mmHg',
    icon: Activity,
    domain: [40, 110],
    target: '≥ 65',
    classify: (v) => {
      if (v < 55) return 'red';
      if (v < 65) return 'yellow';
      return 'green';
    },
  },
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    icon: Wind,
    domain: [80, 100],
    target: '≥ 92',
    classify: (v) => {
      if (v < 88) return 'red';
      if (v < 92) return 'yellow';
      return 'green';
    },
  },
  {
    key: 'lactato',
    label: 'Lact',
    unit: 'mmol/L',
    icon: TrendingUp,
    domain: [0.5, 8],
    target: '< 2',
    classify: (v) => {
      if (v >= 4) return 'red';
      if (v >= 2) return 'yellow';
      return 'green';
    },
  },
];

const STATUS_BAR_CLASS: Record<Status, string> = {
  green: 'bg-emerald-500/80',
  yellow: 'bg-amber-500/80',
  red: 'bg-red-500/80',
};

const STATUS_DOT_CLASS: Record<Status, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-red-400',
};

/** Escala valor para altura percentual dentro do domínio [min,max], clampada. */
function scaleHeight(value: number, domain: [number, number]): number {
  const [min, max] = domain;
  if (max <= min) return 50;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.max(4, Math.min(100, pct));
}

interface SparklineProps {
  spec: MetricSpec;
  points: TrendPoint[];
}

function Sparkline({ spec, points }: SparklineProps) {
  const Icon = spec.icon;
  const last = points.length > 0 ? points[points.length - 1] : null;
  const lastStatus: Status | null = last ? spec.classify(last.value) : null;

  return (
    <div className="rounded-lg border border-app-border bg-app-card/60 p-2 flex flex-col gap-1.5 min-h-[120px]">
      {/* HEADER */}
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-app-text-muted" />
        <span className="text-[11px] font-bold text-app-text-2 uppercase tracking-wide">
          {spec.label}
        </span>
        {lastStatus && (
          <span className={`ml-auto inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLASS[lastStatus]}`} />
        )}
      </div>

      {/* CHART AREA — 60px tall */}
      <div className="relative h-[60px] flex items-end gap-[2px]" aria-label={`Tendência ${spec.label} 72h`}>
        {points.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-app-text-muted/60 text-xs">
            —
          </div>
        ) : (
          points.map((p, i) => {
            const status = spec.classify(p.value);
            const h = scaleHeight(p.value, spec.domain);
            return (
              <div
                key={`${p.ts}-${i}`}
                className={`flex-1 min-w-[2px] rounded-sm ${STATUS_BAR_CLASS[status]}`}
                style={{ height: `${h}%` }}
                title={`${new Date(p.ts).toLocaleString('pt-BR')} · ${p.value} ${spec.unit}`}
              />
            );
          })
        )}
      </div>

      {/* FOOTER — last value + target */}
      <div className="flex items-baseline justify-between text-[10px]">
        <span className="font-mono tabular-nums text-app-text font-bold">
          {last ? `${last.value}` : '—'}
          <span className="ml-0.5 font-normal text-app-text-muted">{last ? spec.unit : ''}</span>
        </span>
        <span className="text-app-text-muted/70">alvo {spec.target}</span>
      </div>
    </div>
  );
}

interface Props {
  pacienteId: string | null | undefined;
  /** Quando true, oculta o botão de refresh (uso em quadrantes sem cabeçalho extra). */
  hideRefresh?: boolean;
}

export default function TrendsSparkline({ pacienteId, hideRefresh = false }: Props) {
  const trends = useTrendsData(pacienteId);

  const byKey = useMemo(
    () => ({
      fc: trends.fc,
      pam: trends.pam,
      spo2: trends.spo2,
      lactato: trends.lactato,
    }),
    [trends.fc, trends.pam, trends.spo2, trends.lactato],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-app-text-muted">
          Tendências · 72h
        </h4>
        {!hideRefresh && (
          <button
            onClick={trends.refresh}
            disabled={trends.loading}
            className="inline-flex items-center gap-1 text-[10px] text-app-text-muted hover:text-app-text-2 disabled:opacity-50 transition"
            title="Recarregar tendências"
          >
            <RefreshCw className={`w-3 h-3 ${trends.loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        )}
      </div>

      {trends.error && (
        <div className="text-[10px] text-red-400 bg-red-950/30 border border-red-900/50 rounded px-2 py-1">
          Erro: {trends.error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {METRICS.map((spec) => (
          <Sparkline key={spec.key} spec={spec} points={byKey[spec.key]} />
        ))}
      </div>
    </div>
  );
}
