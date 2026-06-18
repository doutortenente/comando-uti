// ============================================================================
// database.types.ts — Tipos TypeScript CANÔNICOS do schema Supabase real.
// Gerados em 2026-06-14 via Supabase MCP (generate_typescript_types) do projeto
// idswehsvvqczzkiatuzu. Fonte única de verdade para AMBOS os apps (sasi web e
// uti-tracker mobile). NÃO editar à mão — regenerar quando o schema mudar:
//   supabase gen types typescript --project-id idswehsvvqczzkiatuzu
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts_log: {
        Row: {
          acked: boolean
          acked_at: string | null
          acked_by: string | null
          created_at: string
          evento_id: string | null
          hash_key: string
          id: string
          mensagem: string
          paciente_id: string
          payload: Json | null
          severidade: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          acked?: boolean
          acked_at?: string | null
          acked_by?: string | null
          created_at?: string
          evento_id?: string | null
          hash_key: string
          id?: string
          mensagem: string
          paciente_id: string
          payload?: Json | null
          severidade?: string
          tipo: string
          user_id?: string | null
        }
        Update: {
          acked?: boolean
          acked_at?: string | null
          acked_by?: string | null
          created_at?: string
          evento_id?: string | null
          hash_key?: string
          id?: string
          mensagem?: string
          paciente_id?: string
          payload?: Json | null
          severidade?: string
          tipo?: string
          user_id?: string | null
        }
      }
      antibiograma: {
        Row: {
          antibiotico: string
          cim: number | null
          created_at: string
          cultura_id: string
          id: string
          resultado: string
        }
        Insert: {
          antibiotico: string
          cim?: number | null
          created_at?: string
          cultura_id: string
          id?: string
          resultado: string
        }
        Update: {
          antibiotico?: string
          cim?: number | null
          created_at?: string
          cultura_id?: string
          id?: string
          resultado?: string
        }
      }
      atbs: {
        Row: {
          agente_alvo: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          dose: string | null
          droga: string
          foco: string | null
          frequencia: string | null
          id: string
          intencao: string | null
          motivo_suspensao: string | null
          paciente_id: string
          updated_at: string
          user_id: string | null
          via: string | null
        }
        Insert: {
          agente_alvo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dose?: string | null
          droga: string
          foco?: string | null
          frequencia?: string | null
          id?: string
          intencao?: string | null
          motivo_suspensao?: string | null
          paciente_id: string
          updated_at?: string
          user_id?: string | null
          via?: string | null
        }
        Update: {
          agente_alvo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dose?: string | null
          droga?: string
          foco?: string | null
          frequencia?: string | null
          id?: string
          intencao?: string | null
          motivo_suspensao?: string | null
          paciente_id?: string
          updated_at?: string
          user_id?: string | null
          via?: string | null
        }
      }
      culturas: {
        Row: {
          agente: string | null
          coleta_ts: string
          created_at: string
          crescimento: boolean
          id: string
          laudo_ts: string | null
          material: string
          observacoes: string | null
          paciente_id: string
          ufc_por_ml: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agente?: string | null
          coleta_ts: string
          created_at?: string
          crescimento?: boolean
          id?: string
          laudo_ts?: string | null
          material: string
          observacoes?: string | null
          paciente_id: string
          ufc_por_ml?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agente?: string | null
          coleta_ts?: string
          created_at?: string
          crescimento?: boolean
          id?: string
          laudo_ts?: string | null
          material?: string
          observacoes?: string | null
          paciente_id?: string
          ufc_por_ml?: number | null
          updated_at?: string
          user_id?: string | null
        }
      }
      eventos_clinicos: {
        Row: {
          confidence: number | null
          created_at: string
          evolucao_id: string | null
          fonte: string
          id: string
          paciente_id: string
          requires_review: boolean
          source_text: string | null
          tipo: string
          ts: string
          unidade: string | null
          user_id: string | null
          valor_json: Json | null
          valor_num: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evolucao_id?: string | null
          fonte: string
          id?: string
          paciente_id: string
          requires_review?: boolean
          source_text?: string | null
          tipo: string
          ts: string
          unidade?: string | null
          user_id?: string | null
          valor_json?: Json | null
          valor_num?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evolucao_id?: string | null
          fonte?: string
          id?: string
          paciente_id?: string
          requires_review?: boolean
          source_text?: string | null
          tipo?: string
          ts?: string
          unidade?: string | null
          user_id?: string | null
          valor_json?: Json | null
          valor_num?: number | null
        }
      }
      evolucoes: {
        Row: {
          conduta: string[]
          created_at: string
          data_evolucao: string
          dvas: Json
          hemato: Json
          hemo: Json
          id: string
          impressao: string[]
          infecto: Json
          neuro: Json
          paciente_id: string
          plantao: string
          prescricao: Json | null
          renal: Json
          resp: Json
          sedativos: Json
          sofa_snapshot: Json | null
          sofa_total: number | null
          tgi: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          conduta?: string[]
          created_at?: string
          data_evolucao?: string
          dvas?: Json
          hemato?: Json
          hemo?: Json
          id?: string
          impressao?: string[]
          infecto?: Json
          neuro?: Json
          paciente_id: string
          plantao?: string
          prescricao?: Json | null
          renal?: Json
          resp?: Json
          sedativos?: Json
          sofa_snapshot?: Json | null
          sofa_total?: number | null
          tgi?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          conduta?: string[]
          created_at?: string
          data_evolucao?: string
          dvas?: Json
          hemato?: Json
          hemo?: Json
          id?: string
          impressao?: string[]
          infecto?: Json
          neuro?: Json
          paciente_id?: string
          plantao?: string
          prescricao?: Json | null
          renal?: Json
          resp?: Json
          sedativos?: Json
          sofa_snapshot?: Json | null
          sofa_total?: number | null
          tgi?: Json
          updated_at?: string
          user_id?: string | null
        }
      }
      ingest_audit_log: {
        Row: {
          created_at: string
          error_msg: string | null
          eventos_ids: string[] | null
          fonte: string | null
          id: string
          ok: boolean
          paciente_id: string | null
          payload_raw: Json | null
          response: Json | null
          source_type: string | null
          user_id: string | null
          warnings: string[] | null
        }
        Insert: {
          created_at?: string
          error_msg?: string | null
          eventos_ids?: string[] | null
          fonte?: string | null
          id?: string
          ok: boolean
          paciente_id?: string | null
          payload_raw?: Json | null
          response?: Json | null
          source_type?: string | null
          user_id?: string | null
          warnings?: string[] | null
        }
        Update: {
          created_at?: string
          error_msg?: string | null
          eventos_ids?: string[] | null
          fonte?: string | null
          id?: string
          ok?: boolean
          paciente_id?: string | null
          payload_raw?: Json | null
          response?: Json | null
          source_type?: string | null
          user_id?: string | null
          warnings?: string[] | null
        }
      }
      pacientes: {
        Row: {
          alergias: string | null
          altura: number | null
          created_at: string
          data_adm: string
          dispositivos: Json
          gravidade: string
          hd: string | null
          id: string
          idade: number | null
          isolation: string
          leito: string
          nome: string
          out_of_range_count: number
          patient_summary: Json | null
          peso: number | null
          severidade_visual: string
          sofa_baseline: number | null
          status_leito: string
          updated_at: string
          user_id: string | null
          uti: string
        }
        Insert: {
          alergias?: string | null
          altura?: number | null
          created_at?: string
          data_adm?: string
          dispositivos?: Json
          gravidade?: string
          hd?: string | null
          id?: string
          idade?: number | null
          isolation?: string
          leito: string
          nome: string
          out_of_range_count?: number
          patient_summary?: Json | null
          peso?: number | null
          severidade_visual?: string
          sofa_baseline?: number | null
          status_leito?: string
          updated_at?: string
          user_id?: string | null
          uti: string
        }
        Update: {
          alergias?: string | null
          altura?: number | null
          created_at?: string
          data_adm?: string
          dispositivos?: Json
          gravidade?: string
          hd?: string | null
          id?: string
          idade?: number | null
          isolation?: string
          leito?: string
          nome?: string
          out_of_range_count?: number
          patient_summary?: Json | null
          peso?: number | null
          severidade_visual?: string
          sofa_baseline?: number | null
          status_leito?: string
          updated_at?: string
          user_id?: string | null
          uti?: string
        }
      }
      pendencias: {
        Row: {
          concluida: boolean
          concluida_at: string | null
          created_at: string
          evolucao_id: string | null
          id: string
          paciente_id: string
          prioridade: number
          tarefa: string
          user_id: string | null
        }
        Insert: {
          concluida?: boolean
          concluida_at?: string | null
          created_at?: string
          evolucao_id?: string | null
          id?: string
          paciente_id: string
          prioridade?: number
          tarefa: string
          user_id?: string | null
        }
        Update: {
          concluida?: boolean
          concluida_at?: string | null
          created_at?: string
          evolucao_id?: string | null
          id?: string
          paciente_id?: string
          prioridade?: number
          tarefa?: string
          user_id?: string | null
        }
      }
    }
    Views: {
      vw_dashboard_uti: {
        Row: {
          data_adm: string | null
          delta_sofa_24h: number | null
          dias_internacao: number | null
          dispositivos: Json | null
          dvas: Json | null
          evolucao_id: string | null
          gravidade: string | null
          hd: string | null
          idade: number | null
          isolation: string | null
          leito: string | null
          nome: string | null
          out_of_range_count: number | null
          paciente_id: string | null
          pendencias_abertas: number | null
          peso: number | null
          sedativos: Json | null
          severidade_visual: string | null
          sofa_snapshot: Json | null
          sofa_total: number | null
          status_leito: string | null
          ultima_evolucao: string | null
          user_id: string | null
          uti: string | null
        }
      }
      vw_sofa_trend_72h: {
        Row: {
          paciente_id: string | null
          sofa_total: number | null
          ts: string | null
        }
      }
      vw_bh_acumulado: {
        Row: {
          bh_24h: number | null
          bh_48h: number | null
          bh_72h: number | null
          eventos_24h: number | null
          paciente_id: string | null
        }
      }
      vw_dias_atb_ativo: {
        Row: {
          agente_alvo: string | null
          atb_id: string | null
          data_inicio: string | null
          dias_terapia: number | null
          droga: string | null
          foco: string | null
          frequencia: string | null
          intencao: string | null
          paciente_id: string | null
          stewardship_flag: string | null
          via: string | null
        }
      }
      vw_alertas_abertos: {
        Row: {
          criticos: number | null
          infos: number | null
          leito: string | null
          nome: string | null
          paciente_id: string | null
          total: number | null
          uti: string | null
          warnings: number | null
        }
      }
    }
    Enums: {
      gravidade_enum: "estavel" | "moderado" | "grave" | "critico" | "obito"
      status_leito_enum: "ativo" | "alta" | "obito" | "transferencia"
    }
  }
}

export const Constants = {
  public: {
    Enums: {
      gravidade_enum: ["estavel", "moderado", "grave", "critico", "obito"],
      status_leito_enum: ["ativo", "alta", "obito", "transferencia"],
    },
  },
} as const
