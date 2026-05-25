-- ============================================================================
-- SASI · Prescricao / Kardex estruturado na evolucao
-- Aplicar via: Supabase Dashboard → SQL Editor (ou Supabase MCP apply_migration)
-- Reverter: ver seção "ROLLBACK" ao final
-- ============================================================================

-- Coluna para guardar a prescricao vigente (Kardex) extraida do prontuario.
-- Estrutura: objeto por categoria, cada categoria um array de strings.
--   { "cardiovascular": ["Clexane 40mg SC 1x/dia", ...],
--     "snc": [...], "gastro_endocrino": [...], "infeccioso_resp": [...],
--     "sintomaticos_sn": [...], "solucoes_diureticos": [...], "nutricao": [...] }
alter table public.evolucoes
  add column if not exists prescricao jsonb default '{}'::jsonb;

comment on column public.evolucoes.prescricao is
  'Kardex/prescricao vigente estruturada por categoria (cardiovascular, snc, gastro_endocrino, infeccioso_resp, sintomaticos_sn, solucoes_diureticos, nutricao). Cada categoria e um array de strings.';

-- ============================================================================
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- alter table public.evolucoes drop column if exists prescricao;
-- ============================================================================
