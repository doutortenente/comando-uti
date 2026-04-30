// ============================================================================
// SASI · drugs.ts
// Dicionários clínicos de DVAs e Sedação + calculadora de dose
// Espelha a fonte clínica que o Dr. Nicolas usa em plantão.
// ============================================================================

export type DrugUnit = 'mcg/kg/min' | 'mg/kg/h' | 'mcg/kg/h' | 'U/min';

export interface Diluicao {
  label: string;
  /** Concentração em unidade-base por ml (mcg/ml, mg/ml, U/ml) */
  factor: number;
}

export interface DrugDef {
  diluicoes: Diluicao[];
  unit: DrugUnit;
  /** Limite inferior da faixa terapêutica habitual */
  min: number;
  /** Limite superior da faixa terapêutica habitual */
  max: number;
  needsWeight: boolean;
}

export const DVA_DICT: Record<string, DrugDef> = {
  Noradrenalina: {
    diluicoes: [
      { label: 'Padrão 16mg/250ml (64mcg/ml)', factor: 64 },
      { label: 'Simples 8mg/250ml (32mcg/ml)', factor: 32 },
      { label: 'Concentrada 32mg/250ml (128mcg/ml)', factor: 128 },
    ],
    unit: 'mcg/kg/min',
    min: 0.01,
    max: 2.0,
    needsWeight: true,
  },
  Adrenalina: {
    diluicoes: [{ label: 'Padrão 16mg/250ml (64mcg/ml)', factor: 64 }],
    unit: 'mcg/kg/min',
    min: 0.01,
    max: 2.0,
    needsWeight: true,
  },
  Dobutamina: {
    diluicoes: [{ label: 'Padrão 250mg/250ml (1000mcg/ml)', factor: 1000 }],
    unit: 'mcg/kg/min',
    min: 2.0,
    max: 20.0,
    needsWeight: true,
  },
  Vasopressina: {
    diluicoes: [{ label: 'Padrão 20U/100ml (0.2U/ml)', factor: 0.2 }],
    unit: 'U/min',
    min: 0.01,
    max: 0.04,
    needsWeight: false,
  },
};

export const SEDACAO_DICT: Record<string, DrugDef> = {
  Fentanil: {
    diluicoes: [
      { label: 'Padrão 1000mcg/100ml (10mcg/ml)', factor: 10 },
      { label: 'Concentrada 50mcg/ml', factor: 50 },
    ],
    unit: 'mcg/kg/h',
    min: 0.5,
    max: 3.0,
    needsWeight: true,
  },
  Midazolam: {
    diluicoes: [
      { label: 'Padrão 150mg/150ml (1mg/ml)', factor: 1 },
      { label: 'Simples 50mg/100ml (0.5mg/ml)', factor: 0.5 },
    ],
    unit: 'mg/kg/h',
    min: 0.05,
    max: 0.2,
    needsWeight: true,
  },
  Propofol: {
    diluicoes: [
      { label: '1% (10mg/ml)', factor: 10 },
      { label: '2% (20mg/ml)', factor: 20 },
    ],
    unit: 'mg/kg/h',
    min: 0.5,
    max: 4.0,
    needsWeight: true,
  },
};

export const SPECIALTIES = [
  'Cardiologia',
  'Nefrologia',
  'Pneumologia',
  'Infectologia',
  'Neurologia',
  'Cirurgia Geral',
  'Endocrinologia',
  'Hematologia',
] as const;

export interface DoseResult {
  value: string;
  unit: DrugUnit;
  min: number;
  max: number;
  isOk: boolean;
  error?: string;
}

/**
 * Calcula dose de infusão.
 * @param drug nome (key de DVA_DICT ou SEDACAO_DICT)
 * @param diluicaoIdx índice da diluição na lista do droga
 * @param vazao vazão da bomba em ml/h
 * @param peso peso do paciente em kg (necessário se needsWeight)
 * @param isDVA true → DVA_DICT; false → SEDACAO_DICT
 */
export function calculateDose(
  drug: string,
  diluicaoIdx: number,
  vazao: string | number,
  peso: string | number | undefined,
  isDVA = true
): DoseResult | null {
  const dict = isDVA ? DVA_DICT[drug] : SEDACAO_DICT[drug];
  if (!dict) return null;

  const dil = dict.diluicoes[diluicaoIdx];
  if (!dil) return null;

  const vazaoNum = typeof vazao === 'string' ? parseFloat(vazao) : vazao;
  if (Number.isNaN(vazaoNum) || vazaoNum <= 0) return null;

  if (dict.needsWeight) {
    const pesoNum = typeof peso === 'string' ? parseFloat(peso) : peso ?? NaN;
    if (Number.isNaN(pesoNum) || pesoNum <= 0) {
      return {
        value: '—',
        unit: dict.unit,
        min: dict.min,
        max: dict.max,
        isOk: false,
        error: 'Insira o peso',
      };
    }
    const dose = dict.unit.includes('/min')
      ? (vazaoNum * dil.factor) / (pesoNum * 60)
      : (vazaoNum * dil.factor) / pesoNum;
    return {
      value: dose.toFixed(3),
      unit: dict.unit,
      min: dict.min,
      max: dict.max,
      isOk: dose >= dict.min && dose <= dict.max,
    };
  }

  const dose = (vazaoNum * dil.factor) / 60;
  return {
    value: dose.toFixed(3),
    unit: dict.unit,
    min: dict.min,
    max: dict.max,
    isOk: dose >= dict.min && dose <= dict.max,
  };
}

export function sofaColorClass(sofa: number | null | undefined): string {
  if (sofa == null) return 'text-app-text-muted';
  if (sofa >= 11) return 'sofa-critical';
  if (sofa >= 7) return 'sofa-high';
  if (sofa >= 4) return 'sofa-medium';
  return 'sofa-low';
}
