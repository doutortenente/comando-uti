// ============================================================================
// SASI · drugs.ts
// Dicionários clínicos de DVAs e Sedação + calculadora de dose
// Escalas neuro, ATBs, profilaxias, diurese, texto de plantão.
// Espelha a fonte clínica que o Dr. Nicolas usa em plantão.
// ============================================================================
import type { DashboardRow } from './supabaseClient';

export type DrugUnit = 'mcg/kg/min' | 'mg/kg/h' | 'mcg/kg/h' | 'U/min' | 'mcg/min';

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
  Dopamina: {
    diluicoes: [{ label: 'Padrão 250mg/250ml (1000mcg/ml)', factor: 1000 }],
    unit: 'mcg/kg/min',
    min: 2.0,
    max: 20.0,
    needsWeight: true,
  },
  Milrinona: {
    diluicoes: [{ label: 'Padrão 20mg/200ml (100mcg/ml)', factor: 100 }],
    unit: 'mcg/kg/min',
    min: 0.25,
    max: 0.75,
    needsWeight: true,
  },
  'Nipride (Nitroprussiato)': {
    diluicoes: [{ label: 'Padrão 50mg/250ml (200mcg/ml)', factor: 200 }],
    unit: 'mcg/kg/min',
    min: 0.1,
    max: 10.0,
    needsWeight: true,
  },
  'Nitroglicerina (Tridil)': {
    diluicoes: [{ label: 'Padrão 50mg/250ml (200mcg/ml)', factor: 200 }],
    unit: 'mcg/min',
    min: 5.0,
    max: 200.0,
    needsWeight: false,
  },
  Esmolol: {
    diluicoes: [{ label: 'Padrão 2500mg/250ml (10mg/ml → 10000mcg/ml)', factor: 10000 }],
    unit: 'mcg/kg/min',
    min: 50.0,
    max: 300.0,
    needsWeight: true,
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
  'Dexmedetomidina (Precedex)': {
    diluicoes: [{ label: 'Padrão 400mcg/100ml (4mcg/ml)', factor: 4 }],
    unit: 'mcg/kg/h',
    min: 0.2,
    max: 1.5,
    needsWeight: true,
  },
  Cetamina: {
    diluicoes: [{ label: 'Padrão 500mg/250ml (2mg/ml)', factor: 2 }],
    unit: 'mg/kg/h',
    min: 0.1,
    max: 0.5,
    needsWeight: true,
  },
  Remifentanil: {
    diluicoes: [{ label: 'Padrão 2mg/100ml (20mcg/ml)', factor: 20 }],
    unit: 'mcg/kg/min',
    min: 0.05,
    max: 0.25,
    needsWeight: true,
  },
  Morfina: {
    diluicoes: [{ label: 'Padrão 50mg/100ml (0.5mg/ml)', factor: 0.5 }],
    unit: 'mg/kg/h',
    min: 0.01,
    max: 0.05,
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

// ============================================================================
// ESCALAS NEUROLÓGICAS — referência inline pra uso no modal
// ============================================================================
export interface EscalaDef {
  desc: string;
  range: string;
}

export const ESCALAS_NEURO: Record<string, EscalaDef> = {
  'ECG (Glasgow)': { desc: 'Ocular(1-4) + Verbal(1-5) + Motora(1-6)', range: '3–15' },
  'RASS': { desc: 'Agitação(+1 a +4) ou Sedação(-1 a -5). 0 = alerta e calmo', range: '-5 a +4' },
  'FOUR': { desc: 'Olhos(0-4) + Motor(0-4) + Tronco(0-4) + Resp(0-4)', range: '0–16' },
  'NIHSS': { desc: 'Déficit neurológico/AVC. Quanto maior, pior', range: '0–42' },
  'Ramsay': { desc: 'Nível de sedação. 1=ansioso, 6=sem resposta', range: '1–6' },
  'CAM-ICU': { desc: 'Screening de delirium. Positivo = delirium presente', range: '+/−' },
};

// ============================================================================
// ANTIBIÓTICOS PRESET — lista rápida pra seleção no infecto
// ============================================================================
export const ATB_PRESETS = [
  'Meropenem',
  'Piperacilina-Tazobactam',
  'Vancomicina',
  'Ceftriaxona',
  'Cefepime',
  'Polimixina B',
  'Linezolida',
  'Metronidazol',
  'Amicacina',
  'Fluconazol',
  'Anidulafungina',
  'Outro',
] as const;

// ============================================================================
// PROFILAXIAS — dropdowns do hemato
// ============================================================================
export const PROFILAXIA_TVP = [
  'Enoxaparina 40mg SC 1x/dia',
  'Heparina 5000UI SC 8/8h',
  'Compressão pneumática',
  'Contraindicado',
  'Não prescrito',
] as const;

export const PROFILAXIA_ULCERA = [
  'Omeprazol 40mg IV 1x/dia',
  'Pantoprazol 40mg IV 1x/dia',
  'Ranitidina 50mg IV 8/8h',
  'Não prescrito',
] as const;

// ============================================================================
// AUSCULTA PULMONAR PRESETS
// ============================================================================
export const AUSCULTA_PULMONAR = [
  'MV+ bilateralmente sem RA',
  'MV+ com roncos difusos',
  'MV+ com crepitações em bases',
  'MV diminuído bilateralmente',
  'MV diminuído em base D',
  'MV diminuído em base E',
  'MV abolido à D',
  'MV abolido à E',
] as const;

// ============================================================================
// DIETA PRESETS
// ============================================================================
export const DIETA_TIPOS = [
  'Jejum',
  'VO (via oral)',
  'TNE-SNE (sonda nasoenteral)',
  'TNE-GTT (gastrostomia)',
  'NPT (nutrição parenteral)',
  'Outra',
] as const;

export const DIETA_ACEITACAO = [
  'Boa',
  'Regular',
  'Ruim',
  'Recusa',
  'Pausa',
] as const;

// ============================================================================
// CALCULADORA DE DIURESE EFETIVA
// ============================================================================
export interface DiureseResult {
  mlKgH: number;
  isOliguria: boolean;  // < 0.5 ml/kg/h
  isPoliuria: boolean;  // > 3.0 ml/kg/h
  label: string;
}

export function calcDiureseEfetiva(
  volumeMl: number | string,
  pesoKg: number | string,
  horas: number | string
): DiureseResult | null {
  const vol = typeof volumeMl === 'string' ? parseFloat(volumeMl) : volumeMl;
  const peso = typeof pesoKg === 'string' ? parseFloat(pesoKg) : pesoKg;
  const h = typeof horas === 'string' ? parseFloat(horas) : horas;

  if ([vol, peso, h].some((v) => Number.isNaN(v) || v <= 0)) return null;

  const mlKgH = vol / (peso * h);
  const isOliguria = mlKgH < 0.5;
  const isPoliuria = mlKgH > 3.0;
  const label = isOliguria ? 'OLIGÚRIA' : isPoliuria ? 'POLIÚRIA' : 'Normal';

  return { mlKgH, isOliguria, isPoliuria, label };
}

// ============================================================================
// COPIAR PLANTÃO — gera texto estruturado pra clipboard (WhatsApp)
// ============================================================================
function getPlantaoLabel(): string {
  const h = new Date().getHours();
  if (h >= 7 && h < 13) return 'MANHÃ';
  if (h >= 13 && h < 19) return 'TARDE';
  return 'NOITE';
}

export function gerarTextoPlantao(patients: DashboardRow[], utiFilter?: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const plantao = getPlantaoLabel();

  const header = `SASI · Passagem de Turno ${plantao}\n${dateStr} ${timeStr}${utiFilter && utiFilter !== 'TODAS' ? ` · ${utiFilter}` : ''}\n${'─'.repeat(40)}`;

  const lines = patients.map((p) => {
    const delta = p.delta_sofa_24h ?? 0;
    const deltaStr = delta > 0 ? `(↑${delta})` : delta < 0 ? `(↓${Math.abs(delta)})` : '';
    const dvaCount = Array.isArray(p.dvas) ? p.dvas.length : 0;
    const sedCount = Array.isArray(p.sedativos) ? p.sedativos.length : 0;

    let line = `\n📋 ${p.uti} · Leito ${p.leito} — ${p.nome}`;
    line += `\n   Grav: ${p.gravidade.toUpperCase()} | SOFA: ${p.sofa_total ?? '—'} ${deltaStr} | D${p.dias_internacao}`;
    if (dvaCount > 0) line += ` | DVA: ${dvaCount}`;
    if (sedCount > 0) line += ` | Sed: ${sedCount}`;
    if (p.pendencias_abertas > 0) line += ` | Pend: ${p.pendencias_abertas}`;
    if (p.hd) line += `\n   HD: ${p.hd.length > 100 ? p.hd.slice(0, 100) + '…' : p.hd}`;
    return line;
  });

  const footer = `\n${'─'.repeat(40)}\nTotal: ${patients.length} pacientes | SASI v1.0`;

  return header + lines.join('') + footer;
}

export function sofaColorClass(sofa: number | null | undefined): string {
  if (sofa == null) return 'text-app-text-muted';
  if (sofa >= 11) return 'sofa-critical';
  if (sofa >= 7) return 'sofa-high';
  if (sofa >= 4) return 'sofa-medium';
  return 'sofa-low';
}
