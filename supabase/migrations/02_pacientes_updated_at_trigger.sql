-- ============================================================================
-- SASI · Migration 02: auto-update `pacientes.updated_at` on every UPDATE.
-- Resolve race condition quando 2 plantonistas editam simultaneamente.
-- ============================================================================

-- Tenta usar moddatetime (extensão do Supabase). Se não disponível, cria manual.
DO $$
BEGIN
  -- Tenta ativar moddatetime
  CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'moddatetime not available, using manual trigger function';
END;
$$;

-- Função fallback caso moddatetime não esteja disponível
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop trigger existente (idempotente)
DROP TRIGGER IF EXISTS set_pacientes_updated_at ON public.pacientes;

-- Cria trigger usando a função manual (funciona em qualquer Postgres)
CREATE TRIGGER set_pacientes_updated_at
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Comentário pra documentação
COMMENT ON TRIGGER set_pacientes_updated_at ON public.pacientes IS
  'Auto-update updated_at em cada UPDATE. Resolve race condition do saveEvolucao concorrente.';
