-- 04_security_perf_hardening.sql
-- Comando UTI / SASI — projeto Supabase idswehsvvqczzkiatuzu
-- Correções de segurança e performance apontadas pelo Supabase advisor (29/05/2026).
-- Escopo: NÃO toca no bypass de auth (dev_bypass RLS) — isso é intencional e
-- será revertido no plano de reativação de autenticação (ver STATUS.md §2).
-- Tudo aqui é reversível e de baixo risco.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. [ERROR] View com SECURITY DEFINER → SECURITY INVOKER
--    vw_dashboard_uti ignorava o RLS de quem consulta. Recriada como invoker
--    para alinhar com as outras 4 views (STATUS.md §4).
--    ALTER VIEW SET basta — não precisa redefinir o SELECT da view.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER VIEW public.vw_dashboard_uti SET (security_invoker = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. [WARN] search_path mutável em funções → fixar (anti-injeção via schema)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.sync_severidade_visual() SET search_path = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. [PERF] Índices para foreign keys sem cobertura (9)
--    CONCURRENTLY evita lock de escrita; rode fora de transação se aplicar
--    manualmente. (apply_migration roda em transação → ver nota no chat.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alerts_log_acked_by     ON public.alerts_log (acked_by);
CREATE INDEX IF NOT EXISTS idx_alerts_log_evento_id     ON public.alerts_log (evento_id);
CREATE INDEX IF NOT EXISTS idx_alerts_log_user_id       ON public.alerts_log (user_id);
CREATE INDEX IF NOT EXISTS idx_atbs_user_id             ON public.atbs (user_id);
CREATE INDEX IF NOT EXISTS idx_culturas_user_id         ON public.culturas (user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_clinicos_user_id ON public.eventos_clinicos (user_id);
CREATE INDEX IF NOT EXISTS idx_ingest_audit_log_user_id ON public.ingest_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_pendencias_evolucao_id   ON public.pendencias (evolucao_id);
CREATE INDEX IF NOT EXISTS idx_pendencias_user_id       ON public.pendencias (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. [WARN] Extensão pg_trgm no schema public → mover para `extensions`
--    Comentado por padrão: mover extensão pode quebrar índices/queries que
--    referenciem funções trgm sem schema-qualify. Validar antes de descomentar.
-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION pg_trgm SET SCHEMA extensions;
