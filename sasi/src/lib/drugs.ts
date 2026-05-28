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
// HELPERS DE ALERTA CLÍNICO (espelha Gemini isHigh/isLow)
// ============================================================================
export function isHigh(v1: unknown, v2: unknown, threshold: number): boolean {
  const a = parseFloat(String(v1 ?? ''));
  const b = parseFloat(String(v2 ?? ''));
  return (!Number.isNaN(a) && a > threshold) || (!Number.isNaN(b) && b > threshold);
}

export function isLow(v1: unknown, v2: unknown, threshold: number): boolean {
  const a = parseFloat(String(v1 ?? ''));
  const b = parseFloat(String(v2 ?? ''));
  return (!Number.isNaN(a) && a < threshold) || (!Number.isNaN(b) && b < threshold);
}

/** Versão "string" de calcDiureseEfetiva pra display inline na ficha */
export function formatDiureseEfetiva(diurese: unknown, peso: unknown, horas: unknown = 24): string {
  const d = parseFloat(String(diurese ?? ''));
  const p = parseFloat(String(peso ?? ''));
  const h = parseFloat(String(horas ?? '24'));
  if (Number.isNaN(d) || Number.isNaN(p) || Number.isNaN(h) || p === 0 || h === 0) return '___';
  return (d / p / h).toFixed(2);
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

// ============================================================================
// CORES POR SISTEMA CLÍNICO — espelho do padrão visual do app Gemini
// Cada sistema tem cor de borda, bg, texto e ícone
// ============================================================================
export interface SystemColorDef {
  border: string;  // border-l-4 color
  bg: string;      // background tint
  text: string;    // title text color
  badge: string;   // badge bg + text
}

export const SYSTEM_COLORS: Record<string, SystemColorDef> = {
  neuro:   { border: 'border-l-purple-500', bg: 'bg-purple-950/20',  text: 'text-purple-300', badge: 'bg-purple-950 text-purple-300' },
  resp:    { border: 'border-l-sky-500',    bg: 'bg-sky-950/20',     text: 'text-sky-300',    badge: 'bg-sky-950 text-sky-300' },
  hemo:    { border: 'border-l-rose-500',   bg: 'bg-rose-950/20',    text: 'text-rose-300',   badge: 'bg-rose-950 text-rose-300' },
  tgi:     { border: 'border-l-amber-500',  bg: 'bg-amber-950/20',   text: 'text-amber-300',  badge: 'bg-amber-950 text-amber-300' },
  renal:   { border: 'border-l-lime-500',   bg: 'bg-lime-950/20',    text: 'text-lime-300',   badge: 'bg-lime-950 text-lime-300' },
  hemato:  { border: 'border-l-pink-500',   bg: 'bg-pink-950/20',    text: 'text-pink-300',   badge: 'bg-pink-950 text-pink-300' },
  infecto: { border: 'border-l-teal-500',   bg: 'bg-teal-950/20',    text: 'text-teal-300',   badge: 'bg-teal-950 text-teal-300' },
};

// Variantes light/clinical (overrides CSS — sem usar bg-slate hardcoded)
export const SYSTEM_COLORS_LIGHT: Record<string, SystemColorDef> = {
  neuro:   { border: 'border-l-purple-500', bg: 'bg-purple-50',  text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' },
  resp:    { border: 'border-l-sky-500',    bg: 'bg-sky-50',     text: 'text-sky-800',    badge: 'bg-sky-100 text-sky-700' },
  hemo:    { border: 'border-l-rose-500',   bg: 'bg-rose-50',    text: 'text-rose-800',   badge: 'bg-rose-100 text-rose-700' },
  tgi:     { border: 'border-l-amber-500',  bg: 'bg-amber-50',   text: 'text-amber-800',  badge: 'bg-amber-100 text-amber-700' },
  renal:   { border: 'border-l-lime-500',   bg: 'bg-lime-50',    text: 'text-lime-800',   badge: 'bg-lime-100 text-lime-700' },
  hemato:  { border: 'border-l-pink-500',   bg: 'bg-pink-50',    text: 'text-pink-800',   badge: 'bg-pink-100 text-pink-700' },
  infecto: { border: 'border-l-teal-500',   bg: 'bg-teal-50',    text: 'text-teal-800',   badge: 'bg-teal-100 text-teal-700' },
};

// ============================================================================
// LABELS CLÍNICOS — mapeia chaves JSON da evolução pra labels humanos (PT-BR)
// ============================================================================
// ============================================================================
// THRESHOLDS CLÍNICOS — limites HITL de sinais vitais (ambas tabelas Excel)
// Usados para alertas automáticos e color-coding no painel geral
// ============================================================================
export interface VitalThreshold {
  label: string;
  unit: string;
  low?: number;       // abaixo = alerta
  high?: number;      // acima = alerta
  absurdLow?: number; // valor absurdo (pedir revisão)
  absurdHigh?: number;
}

export const VITAL_THRESHOLDS: Record<string, VitalThreshold> = {
  pas:   { label: 'PAS',  unit: 'mmHg', low: 90,  high: 180, absurdLow: 50,  absurdHigh: 260 },
  pad:   { label: 'PAD',  unit: 'mmHg', low: 45,  high: 120, absurdLow: 20,  absurdHigh: 200 },
  pam:   { label: 'PAM',  unit: 'mmHg', low: 65,  high: 130, absurdLow: 30,  absurdHigh: 200 },
  fc:    { label: 'FC',   unit: 'bpm',             high: 100, absurdLow: 20,  absurdHigh: 250 },
  fr:    { label: 'FR',   unit: 'rpm',             high: 25,  absurdLow: 4,   absurdHigh: 80  },
  spo2:  { label: 'SpO₂', unit: '%',    low: 88,              absurdLow: 50,  absurdHigh: 100 },
  tax:   { label: 'TAX',  unit: '°C',              high: 38,  absurdLow: 30,  absurdHigh: 43  },
  dx:    { label: 'Dx',   unit: 'mg/dL',           high: 180, absurdLow: 20,  absurdHigh: 800 },
};

/** Checa se valor excede threshold clínico */
export function checkVitalAlert(key: string, value: number): 'ok' | 'low' | 'high' | 'absurd' {
  const t = VITAL_THRESHOLDS[key];
  if (!t) return 'ok';
  if (t.absurdLow != null && value < t.absurdLow) return 'absurd';
  if (t.absurdHigh != null && value > t.absurdHigh) return 'absurd';
  if (t.low != null && value < t.low) return 'low';
  if (t.high != null && value > t.high) return 'high';
  return 'ok';
}

// ============================================================================
// REFERÊNCIAS LABORATORIAIS — valores normais pra color-coding
// Fonte: Tabela SASI_UTI_20Leitos.xlsx (Sheet U2-L01, rows 22-40)
// ============================================================================
export interface LabReference {
  label: string;
  unit: string;
  low: number;
  high: number;
  /** se true, alerta é valor > high (ex: lactato) */
  onlyHigh?: boolean;
}

export const LAB_REFERENCES: Record<string, LabReference> = {
  hb:       { label: 'Hb',      unit: 'g/dL',    low: 12,    high: 17    },
  ht:       { label: 'Ht',      unit: '%',        low: 36,    high: 52    },
  plaq:     { label: 'Plaq',    unit: '/mm³',     low: 150,   high: 400   },
  leuco:    { label: 'Leuco',   unit: '/mm³',     low: 4,     high: 11    },
  ur:       { label: 'Uréia',   unit: 'mg/dL',    low: 15,    high: 45    },
  cr:       { label: 'Cr',      unit: 'mg/dL',    low: 0.6,   high: 1.2   },
  na:       { label: 'Na⁺',     unit: 'mEq/L',    low: 136,   high: 145   },
  k:        { label: 'K⁺',      unit: 'mEq/L',    low: 3.5,   high: 5.0   },
  mg:       { label: 'Mg²⁺',    unit: 'mg/dL',    low: 1.6,   high: 2.6   },
  cai:      { label: 'Ca²⁺ i',  unit: 'mmol/L',   low: 1.15,  high: 1.35  },
  lactato:  { label: 'Lactato', unit: 'mmol/L',   low: 0,     high: 2,    onlyHigh: true },
  pcr:      { label: 'PCR',     unit: 'mg/L',     low: 0,     high: 5,    onlyHigh: true },
  ph:       { label: 'pH',      unit: '',          low: 7.35,  high: 7.45  },
  pco2:     { label: 'pCO₂',   unit: 'mmHg',     low: 35,    high: 45    },
  hco3:     { label: 'HCO₃⁻',  unit: 'mEq/L',    low: 22,    high: 26    },
  bb:       { label: 'BT',      unit: 'mg/dL',    low: 0,     high: 1.2,  onlyHigh: true },
};

/** Checa se lab está fora da referência */
export function checkLabAlert(key: string, value: number): 'normal' | 'low' | 'high' {
  const r = LAB_REFERENCES[key];
  if (!r) return 'normal';
  if (r.onlyHigh) return value > r.high ? 'high' : 'normal';
  if (value < r.low) return 'low';
  if (value > r.high) return 'high';
  return 'normal';
}

// ============================================================================
// LABELS CLÍNICOS — mapeia chaves JSON da evolução pra labels humanos (PT-BR)
// ============================================================================
export const CLINICAL_LABELS: Record<string, Record<string, string>> = {
  neuro: {
    glasgow: 'ECG (Glasgow)',
    glasgow_ocular: 'Glasgow Ocular',
    glasgow_verbal: 'Glasgow Verbal',
    glasgow_motor: 'Glasgow Motor',
    rass: 'RASS',
    four_score: 'FOUR Score',
    pupilas: 'Pupilas',
    pupilas_dir: 'Pupila D',
    pupilas_esq: 'Pupila E',
    sedacao_meta: 'Meta sedação',
    delirium_cam: 'CAM-ICU (Delirium)',
    cam_icu: 'CAM-ICU',
    ramsay: 'Ramsay',
    nihss: 'NIHSS',
    obs: 'Observações',
    notas: 'Notas',
  },
  resp: {
    modo_ventilatorio: 'Modo ventilatório',
    modo: 'Modo',
    tipo_via_aerea: 'Via aérea',
    tot: 'TOT',
    tqt: 'TQT',
    fio2: 'FiO₂',
    peep: 'PEEP',
    vc_vt: 'VC/VT',
    vt: 'VT',
    fr: 'FR',
    fr_total: 'FR total',
    spo2: 'SpO₂',
    pao2: 'PaO₂',
    paco2: 'PaCO₂',
    pf_ratio: 'P/F',
    driving_pressure: 'Driving Pressure',
    pressao_platô: 'Pressão Platô',
    pressao_pico: 'P. Pico',
    complacencia: 'Complacência',
    ausculta: 'Ausculta',
    rx_torax: 'RX Tórax',
    obs: 'Observações',
    notas: 'Notas',
  },
  hemo: {
    pa: 'PA',
    pas: 'PAS',
    pad: 'PAD',
    pam: 'PAM',
    pam_media: 'PAM média',
    fc: 'FC',
    ritmo: 'Ritmo',
    ecg: 'ECG',
    pvc: 'PVC',
    ic: 'IC',
    svo2: 'SvO₂',
    svv: 'SVV',
    lactato: 'Lactato',
    be: 'BE',
    acesso_venoso: 'Acesso venoso',
    pac: 'PAC (cateter)',
    notas_hemo: 'Notas hemo',
    obs: 'Observações',
    notas: 'Notas',
  },
  tgi: {
    dieta_tipo: 'Tipo dieta',
    dieta: 'Dieta',
    dieta_aceitacao: 'Aceitação',
    abdome: 'Abdome',
    evacuacao: 'Evacuação',
    estase: 'Estase',
    sng_gtd: 'SNG/GTD',
    sne: 'SNE',
    gtt: 'GTT',
    dreno: 'Dreno',
    notas_tgi: 'Notas TGI',
    obs: 'Observações',
    notas: 'Notas',
  },
  renal: {
    diurese_24h: 'Diurese 24h (ml)',
    diurese: 'Diurese',
    balanco_hidrico: 'Balanço hídrico',
    bh: 'BH',
    creatinina: 'Creatinina',
    ureia: 'Uréia',
    k: 'K⁺',
    potassio: 'K⁺',
    na: 'Na⁺',
    sodio: 'Na⁺',
    mg: 'Mg²⁺',
    ca: 'Ca²⁺',
    ph: 'pH',
    bic: 'BIC',
    bicarbonato: 'Bicarbonato',
    be: 'BE',
    trs: 'TRS (diálise)',
    dialise: 'Diálise',
    notas_renal: 'Notas renal',
    obs: 'Observações',
    notas: 'Notas',
  },
  hemato: {
    hb: 'Hb',
    hemoglobina: 'Hemoglobina',
    ht: 'Ht',
    hematocrito: 'Hematócrito',
    leucocitos: 'Leucócitos',
    plaquetas: 'Plaquetas',
    inr: 'INR',
    tp: 'TP',
    ttpa: 'TTPa',
    fibrinogenio: 'Fibrinogênio',
    coagulopatia: 'Coagulopatia',
    transfusao: 'Transfusão',
    profilaxia_tvp: 'Profilaxia TVP',
    obs: 'Observações',
    notas: 'Notas',
  },
  infecto: {
    foco: 'Foco infeccioso',
    foco_infeccioso: 'Foco',
    culturas_pendentes: 'Culturas pendentes',
    culturas: 'Culturas',
    atb_atual: 'ATB atual',
    atb: 'ATB',
    dia_atb: 'Dia ATB',
    pcr: 'PCR',
    procalcitonina: 'Procalcitonina',
    pct: 'PCT',
    temperatura: 'Temperatura',
    temp: 'Temp',
    tmax: 'T. máxima',
    profilaxia_ulcera: 'Profilaxia úlcera',
    precaucao: 'Precaução/Isolamento',
    isolamento: 'Isolamento',
    obs: 'Observações',
    notas: 'Notas',
  },
};
