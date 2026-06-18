# Supabase — migrations e schema

## Qual arquivo é a verdade

| Arquivo | Estado |
|---|---|
| `05_schema_real_snapshot.sql` | ✅ **AUTORITATIVO** — snapshot do schema REAL em produção (projeto `idswehsvvqczzkiatuzu`), capturado em 2026-06-14 via Supabase MCP. |
| `../types/database.types.ts` | ✅ Tipos TS canônicos gerados do mesmo schema. Fonte única para `sasi` (web) e `uti-tracker` (mobile). |
| `01_initial_schema.sql` | ⛔ **OBSOLETO** — schema antigo de 4 tabelas (`patients`/`clinical_parameters`/`prescriptions`/`lab_results`). Não existe mais em produção. Mantido só por histórico. |
| `02`–`04` | Históricas (trigger updated_at, dev_bypass RLS, hardening). Já refletidas no snapshot. |

O schema real tem **9 tabelas** (`pacientes`, `evolucoes`, `eventos_clinicos`,
`pendencias`, `atbs`, `culturas`, `antibiograma`, `alerts_log`, `ingest_audit_log`),
**5 views** (`vw_dashboard_uti`, `vw_sofa_trend_72h`, `vw_bh_acumulado`,
`vw_dias_atb_ativo`, `vw_alertas_abertos`), funções/triggers e RLS.

## Regenerar quando o schema mudar

```bash
supabase gen types typescript --project-id idswehsvvqczzkiatuzu > supabase/types/database.types.ts
```

O snapshot SQL é re-capturado via Supabase MCP (consultas a `pg_indexes`,
`pg_policies`, `pg_get_viewdef`, `pg_get_functiondef`, `pg_get_triggerdef`).

## Achados do database linter (advisors) — 2026-06-14

O snapshot reflete a produção **como está**, incluindo os pontos abaixo. Não foram
"corrigidos" no snapshot para mantê-lo fiel; são recomendações de hardening.

### Segurança
- **`dev_bypass` RLS em 9 tabelas** (`USING (true)`) — auth desabilitada de propósito
  (ver `STATUS.md §2`). Decisão atual do projeto: **manter** (não reativar auth agora).
  As políticas reais por usuário (`*_own`, `auth.uid() = user_id`) coexistem e ficam
  ativas quando o auth voltar.
- **`vw_dashboard_uti` é SECURITY DEFINER** (ERROR no linter). Quando o auth voltar,
  recriar como `security_invoker = true` para respeitar a RLS de quem consulta.
- **search_path mutável** em `set_updated_at` e `sync_severidade_visual` (WARN).
  Adicionar `set search_path = 'public','pg_catalog'` (as demais funções já têm).
- **`pg_trgm` instalado no schema `public`** (WARN) — idealmente mover para `extensions`.
- **Leaked password protection desabilitada** no Auth (WARN) — habilitar ao reativar login.

### Performance
- **9 foreign keys sem índice de cobertura**: `alerts_log(acked_by, evento_id, user_id)`,
  `atbs(user_id)`, `culturas(user_id)`, `eventos_clinicos(user_id)`,
  `ingest_audit_log(user_id)`, `pendencias(evolucao_id, user_id)`. Criar índices btree
  nessas colunas (importante antes de a RLS por `user_id` voltar — ela faz lookups por
  `user_id`).
- **`auth_rls_initplan`** em todas as políticas `*_own`: trocar `auth.uid()` cru por
  `(select auth.uid())` para que a função seja avaliada uma vez por query, não por linha.
- **`multiple_permissive_policies`**: efeito colateral de `dev_bypass` coexistir com as
  `*_own`. Resolve-se ao dropar `dev_bypass` na reativação do auth.

> Estas correções pertencem à fase de reativação de auth/hardening — fora do escopo
> atual (convergência do app mobile com auth mantido em bypass).
