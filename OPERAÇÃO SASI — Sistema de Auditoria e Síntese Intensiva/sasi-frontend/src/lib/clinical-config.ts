// ============================================================================
// SASI · clinical-config.ts
// Constantes canônicas + utilitários compartilhados (PLANO ALPHA seção 4).
// Mantém este arquivo PURO (sem JSX, sem side-effects) — só dados e helpers.
// ============================================================================
import {
  Brain, Wind, HeartPulse, Utensils, Droplets, Thermometer,
  Syringe, Pill, GitBranch, Filter,
  type LucideIcon,
} from 'lucide-react';

// ── SISTEMAS CLÍNICOS ────────────────────────────────────────────────────────
export interface SystemConfig {
  id: 'neuro' | 'resp' | 'cardio' | 'tgi' | 'renal' | 'infec';
  icon: LucideIcon;
  label: string;
  theme: string;
}

export const SYSTEMS_CONFIG: readonly SystemConfig[] = [
  { id: 'neuro',  icon: Brain,       label: 'Neurológico',   theme: 'sys-neuro'   },
  { id: 'resp',   icon: Wind,        label: 'Respiratório',  theme: 'sys-resp'    },
  { id: 'cardio', icon: HeartPulse,  label: 'Hemodinâmico',  theme: 'sys-hemo'    },
  { id: 'tgi',    icon: Utensils,    label: 'TGI/Nutrição',  theme: 'sys-tgi'     },
  { id: 'renal',  icon: Droplets,    label: 'Renal/Metab.',  theme: 'sys-renal'   },
  { id: 'infec',  icon: Thermometer, label: 'Infec/Hemato',  theme: 'sys-infecto' },
] as const;

// ── DISPOSITIVOS (Onda 5) ────────────────────────────────────────────────────
export type DeviceId = 'mv' | 'dva' | 'sed' | 'atb' | 'cvc' | 'trr';

export interface DeviceConfig {
  id: DeviceId;
  icon: LucideIcon;
  label: string;
  title: string;
  color: 'blue' | 'red' | 'purple' | 'orange' | 'indigo' | 'cyan';
}

export const DEVICES_CONFIG: readonly DeviceConfig[] = [
  { id: 'mv',  icon: Wind,        label: 'VMI', title: 'Ventilação Mecânica',        color: 'blue'   },
  { id: 'dva', icon: HeartPulse,  label: 'DVA', title: 'Droga Vasoativa',            color: 'red'    },
  { id: 'sed', icon: Syringe,     label: 'SED', title: 'Sedação/Analgesia',          color: 'purple' },
  { id: 'atb', icon: Pill,        label: 'ATB', title: 'Antibiótico',                color: 'orange' },
  { id: 'cvc', icon: GitBranch,   label: 'CVC', title: 'Acesso Venoso Central',      color: 'indigo' },
  { id: 'trr', icon: Filter,      label: 'TRR', title: 'Terapia Renal Substitutiva', color: 'cyan'   },
] as const;

// ── ISOLAMENTO (Onda 5) ──────────────────────────────────────────────────────
export type IsolationId = 'none' | 'contact' | 'droplet' | 'aerosol';

export interface IsolationConfig {
  id: IsolationId;
  label: string;
  badgeColor: string;
}

export const ISOLATION_TYPES: readonly IsolationConfig[] = [
  { id: 'none',    label: 'Padrão',    badgeColor: '' },
  { id: 'contact', label: 'Contato',   badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-700' },
  { id: 'droplet', label: 'Gotículas', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-700' },
  { id: 'aerosol', label: 'Aerossóis', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-700' },
] as const;

// ── STATUS SEMAFÓRICO ────────────────────────────────────────────────────────
export type SeverityVisualId = 'red' | 'yellow' | 'green';

export const STATUS_LABELS: Record<SeverityVisualId, string> = {
  red:    'GRAVE',
  yellow: 'ATENÇÃO',
  green:  'ESTÁVEL',
};

// ── ANTIBIÓTICOS (Onda 5) ────────────────────────────────────────────────────
export const ATB_SCHEMES = [
  'Ceftriaxona', 'Meropenem', 'Pip/Tazo', 'Vancomicina', 'Targocid', 'Flagyl', 'Clavulin',
] as const;
export type AtbScheme = (typeof ATB_SCHEMES)[number];

// ── CULTURAS (Onda 5) ────────────────────────────────────────────────────────
export const CULTURE_STATUS = [
  'Aguardando', 'Parcial', 'Final Positiva', 'Final Negativa',
] as const;
export type CultureStatus = (typeof CULTURE_STATUS)[number];

// ============================================================================
// UTILITÁRIOS COMPARTILHADOS
// ============================================================================

/**
 * Parser BR-aware de números. Aceita vírgula (formato brasileiro) ou ponto.
 * Regra de ouro #3: nunca use parseFloat cru em input do usuário.
 *
 * @example
 *   parseFloatBR('1,5')   // 1.5
 *   parseFloatBR('1.5')   // 1.5
 *   parseFloatBR('')      // null
 *   parseFloatBR('abc')   // null
 *   parseFloatBR(undefined) // null
 */
export function parseFloatBR(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Mapeia gravidade do paciente para um status visual semafórico de fallback.
 * Usado enquanto a coluna `severidade_visual` (Onda 5) não existir no DB.
 */
export function deriveSeverityVisual(
  gravidade: string | null | undefined,
): SeverityVisualId | 'gray' {
  switch (gravidade) {
    case 'critico':
    case 'grave':
      return 'red';
    case 'moderado':
      return 'yellow';
    case 'estavel':
      return 'green';
    case 'obito':
      return 'gray';
    default:
      return 'gray';
  }
}
