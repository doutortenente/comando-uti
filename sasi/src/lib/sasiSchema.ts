// ============================================================================
// SASI · sasiSchema — espelho do template Excel SASI_UTI_20Leitos (Jun 2026)
// Fonte: /Downloads/SASI_UTI_20Leitos.xlsx_FILES
// ============================================================================

export interface TabelaoLabDef {
  key: string;
  exame: string;
  unidade: string;
  ref: string;
  systems: Array<'hemato' | 'renal' | 'hemo' | 'infecto' | 'resp' | 'tgi'>;
  aliases: string[];
}

/** FASE 1 — Laboratório (tabelão serial) */
export const TABELAO_LABS: readonly TabelaoLabDef[] = [
  { key: 'hb', exame: 'HB', unidade: 'g/dl', ref: '12–17', systems: ['hemato'], aliases: ['hb', 'hemoglobina'] },
  { key: 'ht', exame: 'HT', unidade: '%', ref: '36–52', systems: ['hemato'], aliases: ['ht', 'hematocrito'] },
  { key: 'plaq', exame: 'PLAQ', unidade: '/mm³', ref: '150k–400k', systems: ['hemato'], aliases: ['plaquetas', 'plaq'] },
  { key: 'leuco', exame: 'LEUCO', unidade: '/mm³', ref: '4k–11k', systems: ['hemato', 'infecto'], aliases: ['leucocitos', 'leuco'] },
  { key: 'seg_bast', exame: 'Seg/Bast', unidade: '%', ref: '50–70 / <5', systems: ['hemato'], aliases: ['seg_bast', 'segmentados'] },
  { key: 'ur', exame: 'UR', unidade: 'mg/dl', ref: '15–45', systems: ['renal'], aliases: ['ureia', 'ur'] },
  { key: 'cr', exame: 'CR', unidade: 'mg/dl', ref: '0,6–1,2', systems: ['renal'], aliases: ['creatinina', 'cr'] },
  { key: 'na', exame: 'NA', unidade: 'mEq/L', ref: '136–145', systems: ['renal'], aliases: ['na', 'sodio'] },
  { key: 'k', exame: 'K', unidade: 'mEq/L', ref: '3,5–5,0', systems: ['renal'], aliases: ['k', 'potassio'] },
  { key: 'mg', exame: 'MG', unidade: 'mg/dl', ref: '1,6–2,6', systems: ['renal'], aliases: ['mg', 'magnesio'] },
  { key: 'cai', exame: 'CAI', unidade: 'mmol/L', ref: '1,15–1,35', systems: ['renal'], aliases: ['cai', 'ca_ionico'] },
  { key: 'lactato', exame: 'Lactato', unidade: 'mmol/L', ref: '<2', systems: ['hemo'], aliases: ['lactato', 'lac'] },
  { key: 'pcr', exame: 'PCR', unidade: 'mg/L', ref: '<5', systems: ['infecto'], aliases: ['pcr'] },
  { key: 'ph', exame: 'pH', unidade: '', ref: '7,35–7,45', systems: ['resp', 'renal'], aliases: ['ph'] },
  { key: 'pco2', exame: 'pCO2', unidade: 'mmHg', ref: '35–45', systems: ['resp'], aliases: ['pco2', 'pco_2'] },
  { key: 'hco3', exame: 'HCO3', unidade: 'mEq/L', ref: '22–26', systems: ['renal', 'resp'], aliases: ['hco3', 'bicarbonato', 'bic'] },
  { key: 'outros', exame: 'Outros', unidade: '', ref: '', systems: ['hemato', 'renal', 'infecto'], aliases: ['outros_labs', 'outros'] },
] as const;

export interface PrescricaoSistemaDef {
  id: string;
  label: string;
  emoji: string;
  slots: number;
}

/** FASE 2 — Prescrição vigente por sistema */
export const PRESCRICAO_SISTEMAS: readonly PrescricaoSistemaDef[] = [
  { id: 'cv_hemo', label: 'CV/Hemo', emoji: '🫀', slots: 4 },
  { id: 'snc', label: 'SNC', emoji: '🧠', slots: 3 },
  { id: 'gi_endoc', label: 'GI/Endoc', emoji: '🩺', slots: 3 },
  { id: 'infec_resp', label: 'Infec/Resp', emoji: '🫁', slots: 4 },
  { id: 'sn', label: 'SN', emoji: '💊', slots: 3 },
  { id: 'profilax', label: 'Profilax', emoji: '🛡️', slots: 2 },
] as const;

export interface PrescricaoItem {
  sistema: string;
  sistemaLabel: string;
  medicamento: string;
  dose: string;
  via: string;
  frequencia: string;
  horarios: string;
  obs: string;
}

export interface ResumoSistemaRow {
  id: string;
  label: string;
  emoji: string;
  texto: string;
}

/** FASE 3 — Patient Summary tabular (base de dados por sistema) */
export const PATIENT_SUMMARY_ROWS: readonly Omit<ResumoSistemaRow, 'texto'>[] = [
  { id: 'hemo_cv', label: 'Hemodinâmica/CV', emoji: '🫀' },
  { id: 'infecto', label: 'Infeccioso (ATB/dias)', emoji: '🦠' },
  { id: 'renal', label: 'Renal/Metabólico', emoji: '🩸' },
  { id: 'gi', label: 'GI/Nutricional', emoji: '🥗' },
  { id: 'resp', label: 'Respiratório', emoji: '🫁' },
  { id: 'snc', label: 'SNC/Neurológico', emoji: '🧠' },
  { id: 'pontos_criticos', label: 'Pontos Críticos p/ Equipe', emoji: '🚨' },
] as const;

export function emptyPrescricaoItems(): PrescricaoItem[] {
  const items: PrescricaoItem[] = [];
  for (const sys of PRESCRICAO_SISTEMAS) {
    for (let i = 0; i < sys.slots; i++) {
      items.push({
        sistema: sys.id,
        sistemaLabel: `${sys.emoji} ${sys.label}`,
        medicamento: '',
        dose: '',
        via: '',
        frequencia: '',
        horarios: '',
        obs: '',
      });
    }
  }
  return items;
}

export function emptyResumoSistemas(): ResumoSistemaRow[] {
  return PATIENT_SUMMARY_ROWS.map(r => ({ ...r, texto: '' }));
}

/** Linha editável do planilhão — FASE 1 Sinais Vitais (espelho Excel U2-L01) */
export interface PlanilhaoVitalRow {
  key: string;
  label: string;
  max: string;
  min: string;
  unidade: string;
  limite: string;
  obs: string;
}

export const PLANILHAO_VITAIS: readonly Omit<PlanilhaoVitalRow, 'max' | 'min' | 'obs'>[] = [
  { key: 'pas', label: 'PAS', unidade: 'mmHg', limite: '50–260' },
  { key: 'pad', label: 'PAD', unidade: 'mmHg', limite: '20–200' },
  { key: 'pam', label: 'PAM', unidade: 'mmHg', limite: '30–200' },
  { key: 'fc', label: 'FC', unidade: 'bpm', limite: '20–250' },
  { key: 'fr', label: 'FR', unidade: 'rpm', limite: '4–80' },
  { key: 'spo2', label: 'SpO₂', unidade: '%', limite: '50–100' },
  { key: 'tax', label: 'TAX', unidade: '°C', limite: '30–43' },
  { key: 'dx', label: 'Dx (glicemias mg/dl)', unidade: 'mg/dl', limite: '20–800' },
  { key: 'bh', label: 'BH Total (ml)', unidade: 'ml', limite: '' },
  { key: 'diurese', label: 'Diurese (ml)', unidade: 'ml', limite: '' },
  { key: 'dieta', label: 'Dieta / Vazão', unidade: '', limite: '' },
] as const;

export function emptyPlanilhaoVitais(): PlanilhaoVitalRow[] {
  return PLANILHAO_VITAIS.map(v => ({ ...v, max: '', min: '', obs: '' }));
}

/** Célula editável do tabelão laboratorial */
export interface TabelaoLabCell {
  val1: string;
  val2: string;
  tendencia: string;
  alerta: string;
}