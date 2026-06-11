# CLAUDE.md — SASI (Sistema de Auditoria e Síntese Intensiva)

> Briefing operacional do projeto. Lido pelo Claude Code ao abrir o repo.
> **Última atualização:** 11-Jun-2026 — sincronizado com o estado VIVO do Supabase (catálogo Postgres) e do workspace Notion.
> Este arquivo substitui qualquer `_HANDOFF_BRIEFING.md` (datado 23-Abr-2026, **STALE** — não é fonte da verdade).

-----

## 1. Missão

Sistema de gestão clínica para a operação solo de UTI do Dr. Nicolas Nagaita (intensivista, “Tenente”) — **33 leitos** distribuídos em **UTI 2 (L01–L12, 12 leitos)**, **UTI 3 (13 leitos)**, **UTI 4 (L01–L08, 8 leitos)**. Padrão de referência de leito: `UTI#-L##`.

Dupla frente:

1. **Tempo real de plantão** — documentação clínica de alta qualidade e suporte à decisão durante turnos noturnos.
1. **Construção do SASI** — reduzir deterioração evitável via melhor tooling de dados e automação.

Toda documentação clínica é em **Português do Brasil**.

-----

## 2. Doutrina inviolável (regras de ouro)

1. **ZERO ALUCINAÇÃO** — campo sem fonte legível → `null` + warning. Nunca um valor “razoável”. Componentes de SOFA ficam sem calcular quando falta dado, jamais estimados. Inventar dado em prontuário é falsificação documental.
1. **Ortogonalidade de eixos (Ramo C)** — cada bloco governa UM eixo: Tempo (Intercorrências) / Estado (EF) / Problema (Impressão + vetor) / Ação (Conduta 1:1). Nenhum fato cabe em dois blocos.
1. **Sinais vitais Max–Min** — `[MÁXIMO]–[MÍNIMO]` em todos os parâmetros, **SpO2 incluso** (`98–89%`, nunca `89–98`).
1. **Conduta 1:1** com a Impressão, metas sempre numéricas.
1. **Flags gritam, não consertam** — o sistema sinaliza o implausível; o médico decide.
1. **Prosa limpa e juridicamente sólida** dentro dos blocos de prontuário. Comentário tático isolado em `// Comando Tático`.
1. **Sem UPSERT clínico direto a partir das skills** — as skills produzem payload; o Edge Function `ocr-ingest` grava (mantém a RLS honesta). Exceção: comando explícito “deploy” autoriza INSERT direto via MCP.

-----

## 3. Stack

- **Frontend:** React + TypeScript + Tailwind + Vite.
- **Backend:** Supabase (PostgreSQL 17, projeto `idswehsvvqczzkiatuzu`, região `sa-east-1`).
- **Edge Function:** `ocr-ingest` (ativo).
- **Deploy:** Cloud Run — `comando-uti-alpha-190641874300.us-west1.run.app`.
- **Ferramentas de IA:** Claude Code (refactor multi-arquivo), Claude.ai web (componentes isolados, planejamento), cascata Gemini Vision → Claude API (OCR de folha de enfermagem via iOS Shortcut).

-----

## 4. Schema do banco (estado VIVO — 11-Jun-2026)

Fonte fiel: `SASI_schema_LIVE_10JUN26.sql` (dump do catálogo via `pg_get_*`). 9 tabelas, todas com RLS habilitado.

|Tabela            |Função                                                             |Linhas (atual)|
|------------------|-------------------------------------------------------------------|--------------|
|`pacientes`       |Cadastro + status do leito + severidade visual                     |13            |
|`evolucoes`       |Snapshot por sistema (JSONB) + SOFA + conduta                      |13            |
|`eventos_clinicos`|**Timeseries** — coração do Meta-Vision (ΔSOFA, BH, tendências 72h)|0 ⚠️           |
|`atbs`            |Antibiotic stewardship (D-ATB)                                     |0             |
|`culturas`        |Microbiologia                                                      |0             |
|`antibiograma`    |S/I/R por cultura                                                  |0             |
|`pendencias`      |Tarefas por paciente                                               |0             |
|`alerts_log`      |Alertas com dedupe SHA-256 (anti alarm-fatigue)                    |0             |
|`ingest_audit_log`|Auditoria de ingest                                                |0             |

**Views (5):** `vw_dashboard_uti`, `vw_sofa_trend_72h`, `vw_bh_acumulado`, `vw_dias_atb_ativo`, `vw_alertas_abertos`.
**Funções:** `fn_updated_at`, `fn_invalidate_sofa_cache`, `sync_severidade_visual`, `fn_alert_hash`, `set_updated_at`.
**Triggers:** updated_at + invalidação de cache SOFA (evolucoes) + sync severidade visual (pacientes).
**Extensões:** `pgcrypto` (gen_random_uuid, digest sha256), `pg_trgm` (busca por nome).

> ⚠️ **`eventos_clinicos` está VAZIA.** A timeseries nunca foi populada — o Meta-Vision está “cego” (sem ΔSOFA real, sem BH acumulado, sem tendências). Prioridade de FASE CHARLIE/DELTA.

-----

## 5. 🔴 ACHADO DE SEGURANÇA P0 — Buraco LGPD (NÃO RESOLVIDO)

Cada uma das 9 tabelas carrega uma policy **`dev_bypass`**: `PERMISSIVE`, role `public`, `USING(true) / CHECK(true)`.

No Postgres, policies permissivas **combinam por OR** — isso **anula** todas as policies `_own` (que filtram por `auth.uid()`). Resultado: **PHI dos 13 pacientes exposto via anon key**.

**Correção** (rodar SÓ após confirmar que o frontend autentica via Supabase Auth — dropar às cegas quebra o dashboard se o app roda no anon key):

```sql
drop policy if exists dev_bypass on public.pacientes;
-- repetir nas 9 tabelas: evolucoes, eventos_clinicos, atbs, culturas,
-- antibiograma, pendencias, alerts_log, ingest_audit_log
```

Status: **FLAGGED, não corrigido.** Decisão pendente do Dr. Nicolas.

-----

## 6. Status das fases

- **FASE ALPHA** — ✅ Completa. Refactor modular `src/lib/` (26 arquivos), 40+ testes unitários (Vitest), camada de API retrocompatível.
- **FASE BRAVO** — ✅ Entregue e deployada. `schema.sql`, `smoke.sql`, `useClinicalAlerts.ts`, `firebase-to-supabase.ts`, views vivas. (`README-FASE-BRAVO.md`.)
- **FASE CHARLIE** — 🔄 Em andamento. Migração Firebase→Supabase via dual-write. **Dados cadastrais migrados, mas `eventos_clinicos` (timeseries) nunca populada.**
- **FASE DELTA** — ⬜ Backlog. Edge Functions de automação clínica.

### Backlog FASE DELTA (prioridades)

1. Cálculo automático de day-of-therapy (D-ATB).
1. Balanço hídrico cumulativo.
1. Handoff PDF em um clique.
1. Pipeline webhook AppSheet.

### Frontend (Planos Alpha/Bravo)

War Room · toggle de visão compacta · SmartPaste · abas por UTI · chips de dispositivo · UI serial completa de labs · UI de prescrição por sistema · senior safety check.

### Outras frentes

- Integração Figma: auditoria UX com screenshots anotados, design tokens SASI → Tailwind, master components com variantes.
- Verificar wiring do hook de alertas clínicos ao entrypoint (`alerts_log` vazia sugere que pode não estar conectado).

-----

## 7. Doutrina clínica (skills + templates)

Fonte da verdade: **`_SASI_TEMPLATE_BASE_v2.md`** (Ramo C) — anatomia idêntica nas duas skills; alterou em uma, replica na outra no mesmo commit (divergência = bug clínico-legal).

**Skills** (em `/mnt/skills/user/` — read-only para o Claude; edições vão para `/home/claude/skills/` e backup):

- `sasi-ingest-export` — extrai dados de fotos/PDFs/laudos → payload JSON validado; gera “Exportar Evolução” e “Exportar Turno”.
- `admissao-uti` — nota de admissão (modo D1).

**References:** `01-schema-eventos-clinicos`, `02-extraction-dictionary`, `03-clinical-sanity-checks`, `04-export-evolucao-template_v2` (+ v1 legado), `05-export-passagem-turno`, `06-api-automation-prompts`.

**Espelhos da doutrina:**

- **Notion** → espaço 🪖 SASI → página “📐 Doutrina SASI — SKILLs & Templates” (9 subpáginas, escrito direto via MCP).
- **Obsidian/Drive** → `SASI_OBSIDIAN_doutrina.zip` + Drive “SASI — Arquivo de Operação”.

-----

## 8. Padrões de output

- **Saída clínica:** duas partes — (1) SITREP de triagem rankeado por acuidade, depois (2) notas de evolução completas, prontas pro prontuário.
- **Planos de manejo:** blocos numerados com título de sistema, mapeamento 1:1 com problemas ativos.
- **Tabela tática de pacientes:** `intel()` deriva tiers de severidade de limiares fisiológicos (não do status declarado) — CRÍTICO / INSTÁVEL / VIGILÂNCIA / ESTÁVEL.
- **Documentos:** `.docx` em Times New Roman 10pt, A4, via lib `docx`, validado com OXML validator, entregue em `/mnt/user-data/outputs/`.
- **Comando “deploy”:** executa INSERT direto no Supabase via MCP sem pedir confirmação adicional.

-----

## 9. Estilo de comunicação

Terso, operacional, com inflexão militar (SITREP tático). **Chain-of-draft** quando pedir explicação/pesquisa/diagnóstico diferencial: passo a passo, ≤5 palavras por etapa ou só a equação. **Conduta final, doses e metas isoladas no fim da resposta.** Execução direta sem perguntas de esclarecimento como padrão; correções aceitas de forma terse e autocorrigidas integralmente.

-----

## 10. Aprendizados de engenharia (anti-armadilha)

- **Migração Supabase:** uma única chamada `apply_migration` lida com DDL interdependente (enums → tabelas → triggers → views) com mais confiabilidade que `execute_sql` sequencial.
- **Views:** `security_invoker = true` previne bypass de RLS.
- **Alertas:** dedupe por hash SHA-256 em `alerts_log` previne alarm fatigue.
- **Arquivos disfarçados:** `.pdf` pode ser container ZIP/Office — identificar por magic bytes `PK\x03\x04` (`xxd`), extrair com `unzip`.
- **Extração XLSX:** copiar para `/tmp/`, `load_workbook(data_only=True)`, iterar sheets, primeiras 25 linhas por sheet pra triagem rápida.
- **Upload a Drive:** base64 grande em `create_file` trunca silenciosamente — usar `textContent` para arquivos de texto.
- **Sandbox reseta entre sessões.** Arquivos de sessões passadas (binários, .docx, código) não persistem. `mkdir -p /mnt/user-data/outputs/SASI_BACKUP/` no início da sessão. Ler o SKILL.md relevante antes de processar.
- **MCP instalado no meio da conversa** só fica disponível na próxima sessão.
- **GitHub MCP indisponível** → pedir `git log --oneline -20 && git status -s && git branch -a && git remote -v` e reconstruir o estado a partir disso.

-----

## 11. Setup de sessão (checklist)

1. Ler o SKILL.md relevante antes de qualquer processamento.
1. `mkdir -p /mnt/user-data/outputs/SASI_BACKUP/`.
1. Fazer backup de arquivos-fonte antes de transformar.
   1. Tratar `_HANDOFF_BRIEFING.md` (23-Abr-2026) como STALE — este `CLAUDE.md` e os artefatos entregues prevalecem em qualquer conflito.