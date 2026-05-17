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
  /** Onda 5: dispositivos em uso ({mv,dva,sed,atb,cvc,trr} booleans). */
  dispositivos?: {
    mv?: boolean;
    dva?: boolean;
    sed?: boolean;
    atb?: boolean;
    cvc?: boolean;
    trr?: boolean;
  };
  /** Onda 5: precaução de isolamento. */
  isolation?: 'none' | 'contact' | 'droplet' | 'aerosol';
  /** Onda 5: nº de valores fora do range clínico. */
  out_of_range_count?: number;
  /** Onda 5: semáforo clínico explícito. */
  severidade_visual?: 'red' | 'yellow' | 'green';
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
  impressao: string[];
  conduta: string[];
  sofa_snapshot: {
    total?: number;
    components?: Record<string, number>;
    detail?: string[];
    suppressed?: string[];
  };
  sofa_total?: number;
  created_at: string;
  updated_at: string;
}

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
  /** Onda 5: nº de valores fora do range. Badge ⚠️ no LeitoCard compact. */
  out_of_range_count?: number;
  /** Onda 5: dispositivos (espelhado da view). */
  dispositivos?: Record<string, boolean>;
  /** Onda 5: precaução de isolamento (espelhado da view). */
  isolation?: 'none' | 'contact' | 'droplet' | 'aerosol';
  /** Onda 5: semáforo clínico (espelhado da view). */
  severidade_visual?: 'red' | 'yellow' | 'green';
}
