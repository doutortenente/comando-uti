-- Migration: Adiciona coluna patient_summary (JSONB) para o resumo vivo da admissão
-- Data: 10/05/2026 — finalização do fluxo SASI pontual
-- Rode este SQL UMA ÚNICA VEZ no Supabase SQL Editor (ou via supabase db query)

ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS patient_summary jsonb;

-- Opcional: índice GIN se quiser buscar dentro do JSONB depois
-- CREATE INDEX IF NOT EXISTS idx_pacientes_patient_summary_gin ON public.pacientes USING gin (patient_summary);

COMMENT ON COLUMN public.pacientes.patient_summary IS 
  'Patient Summary (SASI) — resumo persistente da admissão com dispositivos, HPMA, plano terapêutico/metas. Atualizado a cada evolução pontual.';

-- RLS: a política existente em pacientes (auth.uid() = user_id) já protege esta coluna automaticamente.
