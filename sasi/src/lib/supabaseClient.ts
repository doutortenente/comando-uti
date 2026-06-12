// ============================================================================
// src/lib/supabaseClient.ts
// Cliente Supabase singleton — substitui firebase/firestore
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[SASI] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Copie .env.example para .env e preencha.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============================================================================
// TIPOS — espelho do schema Supabase (gerados via: supabase gen types typescript)
// ============================================================================

export interface Paciente {
  id: string;
  user_id?: string;
  leito: string;
  uti: string;
  nome: string;
  idade?: number;
  peso?: number;
  altura?: number;
  hd?: string;
  data_adm: string;
  alergias?: string;
  gravidade: 'estavel' | 'moderado' | 'grave' | 'critico' | 'obito';
  status_leito: 'ativo' | 'alta' | 'obito' | 'transferencia';
  created_at: string;
  updated_at: string;
}

export interface Evolucao {
  id: string;
  paciente_id: string;
  user_id?: string;
  data_evolucao: string;
  plantao: string;
  neuro: Record<string, unknown>;
  resp: Record<string, unknown>;
  hemo: Record<string, unknown>;
  tgi: Record<string, unknown>;
  renal: Record<string, unknown>;
  hemato: Record<string, unknown>;
  infecto: Record<string, unknown>;
  dvas: unknown[];
  sedativos: unknown[];

  // === LEGACY (manter por compatibilidade durante transição) ===
  impressao: string[];
  conduta: string[];

  // === SÍNTESE CLÍNICA ESTRUTURADA (SASI v2.0) ===
  problemas_ativos?: SasiProblemaAtivo[];
  condutas_sistemas?: SasiCondutaSistema[];
  riscos?: SasiRisco[];

  sofa_snapshot: {
    total?: number;
    components?: Record<string, number>;
    detail?: string[];
    suppressed?: string[];
    justificativa?: string;
  };
  sofa_total?: number;
  created_at: string;
  updated_at: string;
}

// ==================== TIPOS DE SÍNTESE CLÍNICA (Foco Opção B) ====================

export type Vetor = '↑' | '↓' | '=';

export interface SasiProblemaAtivo {
  id?: string;
  texto: string;
  vetor: Vetor | null;                    // Obrigatório no método SASI
  sistema?: SystemKey;
  gravidade?: 'leve' | 'moderada' | 'grave' | 'critica';
}

export interface SasiCondutaSistema {
  id?: string;
  sistema: SystemKey | 'geral';
  texto: string;
  meta?: string;                          // Ex: "PAM ≥ 65 mmHg", "Diurese > 0.5 ml/kg/h"
  prazo?: string;
  responsavel?: string;
}

export interface SasiRisco {
  texto: string;
  nivel?: 'baixo' | 'medio' | 'alto';
}

export type SystemKey = 
  | 'neuro' 
  | 'resp' 
  | 'hemo' 
  | 'tgi' 
  | 'renal' 
  | 'hemato' 
  | 'infecto';

export interface EventoClinico {
  id: string;
  paciente_id: string;
  evolucao_id?: string;
  user_id?: string;
  ts: string;
  tipo: 'sofa' | 'lactato' | 'pam' | 'pf_ratio' | 'diurese' | 'temp' | 'custom';
  valor_num?: number;
  valor_json?: Record<string, unknown>;
  unidade?: string;
  fonte: 'manual' | 'gemini_ocr' | 'appsheet' | 'auto_trigger';
  created_at: string;
}

export interface Pendencia {
  id: string;
  paciente_id: string;
  evolucao_id?: string;
  user_id?: string;
  tarefa: string;
  prioridade: 1 | 2 | 3;
  concluida: boolean;
  concluida_at?: string;
  created_at: string;
}

export interface DashboardRow {
  paciente_id: string;
  user_id?: string;
  leito: string;
  uti: string;
  nome: string;
  idade?: number;
  peso?: number;
  hd?: string;
  gravidade: string;
  status_leito: string;
  data_adm: string;
  dias_internacao: number;
  evolucao_id?: string;
  ultima_evolucao?: string;
  sofa_total?: number;
  sofa_snapshot?: Record<string, unknown>;
  dvas?: unknown[];
  sedativos?: unknown[];
  delta_sofa_24h?: number;
  pendencias_abertas: number;
}

// ==================== PATIENT SUMMARY (início do trabalho) ====================

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

export interface TabelaoLabCell {
  val1?: string;
  val2?: string;
  tendencia?: string;
  alerta?: string;
}

export interface Interconsulta {
  especialidade: string;
  data?: string;
  status?: 'pendente' | 'agendada' | 'realizada' | 'cancelada';
  notas?: string;
}

export interface ProgramacaoItem {
  descricao: string;
  data?: string;
  tipo?: 'exame' | 'procedimento' | 'alta' | 'transferencia' | 'outro';
  status?: 'pendente' | 'agendado' | 'concluido';
}

export interface PatientSummary {
  id: string;
  paciente_id: string;
  data_admissao: string;
  motivo_admissao: string;
  hpma?: string;
  antecedentes?: string;
  medicamentos_domiciliares?: string[];
  alergias?: string;
  peso?: number;
  altura?: number;
  dispositivos: Array<{
    tipo: string;
    local?: string;
    data_insercao?: string;
  }>;
  suporte_atual: {
    dvas?: unknown[];
    ventilacao?: string;
    sedacao?: string;
    antibioticos?: string[];
  };
  interconsultas?: Interconsulta[];
  programacao?: ProgramacaoItem[];
  /** Base tabular por sistema (espelho Excel FASE 3) */
  resumo_sistemas?: ResumoSistemaRow[];
  /** Iatrogenias, sutilezas, DVA/fluidos (campos livres do Excel) */
  iatrogenias?: string;
  sutilezas?: string;
  dva_fluidos?: string;
  exames_relevantes?: string;
  plano_terapeutico_atual?: string;
  ultima_atualizacao: string;
  created_at: string;
}
