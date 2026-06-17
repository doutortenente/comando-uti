# Diretórios Detalhados — comando-uti (SASI UTI)

**Data do detalhamento:** 2026-06-17  
**Baseado em:** STATUS.md (11/06/2026 — autoritativo), docs/MAPA-REPOSITORIO.md, CLAUDE.md, AGENTS.md, READMEs dos subprojetos, exploração do filesystem (find/du/list_dir).  
**Estado do repo:** Pós-faxina (11/06 + 16/06/2026) — monorepo enxuto, código ativo em `sasi/`, sem node_modules raiz, Supabase unificado.

> **Canonical reference:** Sempre consulte primeiro `docs/MAPA-REPOSITORIO.md` (visão de 1 página "onde fica cada coisa") + `STATUS.md` (estado vivo do produto, 5 janelas, auth bypass, schema). Este arquivo é o **zoom detalhado por diretório** com propósitos, contagens e anotações clínicas/engenharia.

## Evidência de Verificação (verification-before-completion)
Comandos executados para confirmar estrutura antes deste documento:

```bash
cd /home/dr/WebstormProjects/comando-uti
find . -type d \( -path '*/node_modules' -o -path '*/dist' -o -path '*/.git' ... \) -prune -o -type d -print | wc -l
# Resultado: 77 diretórios fonte (pruned)
du -sh --exclude=node_modules --exclude=dist --exclude=.git . 
# Resultado: 2,7M (tamanho fonte total)
find sasi/src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l   # 64
find sasi-mcp-server/src -type f -name '*.ts' | wc -l              # 10
find supabase -type f \( -name '*.sql' -o -name '*.ts' \) | wc -l  # 8
ls -d sasi sasi/src sasi-mcp-server supabase/supabase/functions ... # todos confirmados
```

Estrutura bate exatamente com MAPA-REPOSITORIO + STATUS (sasi/ canônico, supabase/ único, templates/ espelho, sem lixo).

---

## Visão Geral da Estrutura (Monorepo Pós-Faxina)

```
comando-uti/
├── .claude/                  # Skills vendored (superpowers + prompt-improver local)
├── .cursor/                  # Regras Cursor
├── .idea/                    # Configs JetBrains versionadas (run configs para sasi: dev/typecheck)
├── .github/                  # (PR template etc.)
├── docs/                     # Documentação operacional + specs superpowers
├── sasi/                     # ★ FRONTEND CANÔNICO (React/Vite/TS) — código ativo de produção
├── sasi-mcp-server/          # MCP Server (Node/TS) — 22 tools para Claude Desktop falar com o DB SASI
├── supabase/                 # Backend canônico (config + Edge Functions + migrations)
├── templates/                # Espelhos dos templates Padrão do Obsidian CELEBRO (doutrina + arquitetura)
├── AGENTS.md                 # Regras SASI (sempre seguir) + env vars (NUNCA JWTs)
├── CLAUDE.md                 # Briefing operacional completo para IA (missão, doutrina, schema LIVE, riscos LGPD)
├── STATUS.md                 # ★ Estado vivo do produto (fonte da verdade para deploy, features, dívida)
└── (nenhum package.json raiz, nenhum node_modules raiz — faxina concluída)
```

**Princípio:** Tudo que é produção/engenharia/clínica versionado de forma enxuta. PHI e segredos ficam no Obsidian `90-PHI-LOCAL` ou `.env` local.

**Tamanhos fonte (pruned, aprox):**
- sasi/src: ~660K (o coração clínico)
- sasi/: ~836K
- .claude/skills: ~1.2M (vendored)
- templates/: ~144K
- supabase/: ~132K
- sasi-mcp-server/src: ~92K
- Total fonte: **2.7M**

---

## Detalhamento por Diretório

### 1. sasi/ — Frontend Canônico (Produção)
**Propósito:** App clínico em tempo real para plantão UTI (33 leitos). 5 Janelas de navegação (redesign 11/06). Usa Realtime do Supabase. Entrada de dados **principalmente via skill/edge** (ocr-ingest + grok-synthesis), frontend é mais visualização + edição limitada.

**Por que subpasta (e não raiz):** Netlify base directory aponta para `sasi`. Mudar é breaking sem coordenação.

**Conteúdo principal:**
- `sasi/src/` (64 arquivos .ts/.tsx/.css)
  - `components/` 
    - `janelas/` — As 5 janelas do redesign (atalhos 1-5):
      - `JanelaLeitos.tsx` — Cards por gravidade (Estável/Watcher/Instável/Crítico), filtros smart
      - `EixoTempo.tsx` — HPMA, tabelão labs seriais, interconsultas, pendências
      - `EixoEstado.tsx` — Terapias, vitais+BH, labs do dia, EF
      - `EixoProblemaAcao.tsx` — Pares 1:1 problema/conduta com meta numérica (Ramo C)
      - `PassagemTurno.tsx` — Lista 3-linhas + copiar/PDF
    - `clinical/` — Componentes de ficha: `FichaCompleta.tsx` (edição 7 sistemas + DVA/sedação), `VitalsTableEditable`, `TabelaoLabs`, `PrescricaoTable`, `NotasField`, `PlanilhaoGeral` etc.
    - Core UI: `Dashboard.tsx`, `LeitoCard.tsx` (cor border-l por gravidade), `PacientePage`, `PacientesIndex`, `FichaEvolucao`, `TimelineDrawer`, `NovoLeitoModal`, `InfusionEditor` (calculadora DVA), `SasiSynthesis`, `CriticalAlerts`, `PatientSummary` etc.
  - `lib/` (lógica de negócio SASI — fonte da verdade para regras clínicas no frontend)
    - `severity.ts` — `intel()` deriva tiers CRÍTICO/INSTÁVEL/VIGILÂNCIA/ESTÁVEL a partir de limiares fisiológicos (não do status declarado)
    - `clinicalExtract.ts` + `clinicalFormat.ts` — Extração e formatação para o modelo Ramo C (ortogonalidade de eixos)
    - `sasiSchema.ts` — Schemas/validação
    - `drugs.ts` + `InfusionEditor` — Calculadora de infusão
    - `exportPDF.ts` + `exportText.ts` — Passagem de turno
    - `sasiAI.ts` — Integração com síntese
    - `supabaseClient.ts` — Tipos oficiais + singleton (use este!)
    - `theme.tsx` — 3 temas (dark default, clinical âmbar UTI, light) + tokens `bg-app-*`
    - `dashboardFilters.tsx`, `useKeyboardShortcuts.ts`, `useToasts.tsx`
  - `hooks/`
    - `useSupabasePatients.ts` — CRUD + Realtime + view dashboard
    - `useClinicalAlerts.ts` — Alertas + ack (dedupe)
    - `usePacienteFicha.ts`, `usePatientDetail.ts`
  - `App.tsx`, `main.tsx`, `index.css`
- `sasi/dist/` — Build (publicado no Netlify)
- `sasi/netlify.toml` — Config de deploy (base = sasi, publish = dist)
- `sasi/package.json`, `vite.config.ts`, `tsconfig.json` (strict: noUnusedLocals/Params), `tailwind.config.js`, `postcss.config.js`
- `sasi/public/`, `sasi/scripts/`, `sasi/README.md` (arquitetura + fluxo clínico + cheatsheet schema)

**Integração clínica:** Segue doutrina inviolável (CLAUDE.md): ortogonalidade eixos, Max-Min inclusive SpO2, Conduta 1:1 numérica, zero alucinação. 5 janelas substituem o antigo plantão/round/editor.

**Comandos:** `cd sasi && npm run dev` (http://localhost:5173, abre direto no Dashboard com MOCK_SESSION), `npm run typecheck`, `npm run build`.

---

### 2. sasi-mcp-server/ — MCP Server para Claude (22 Tools)
**Propósito:** Permite que Claude Desktop / Claude Code chame tools diretamente no banco SASI real (service_role). Ponte entre IA e dados clínicos vivos (pacientes, evolucoes, eventos_clinicos, atbs, culturas, pendencias, alerts).

**Conteúdo:**
- `src/index.ts`, `src/db.ts` — Setup MCP + cliente Supabase
- `src/tools/` (8 módulos → 22 tools expostas):
  - `sitrep.ts` — Visão tática completa da UTI
  - `pacientes.ts` — list/get/admit/update
  - `evolucoes.ts` — get/create (SOAP + SOFA + kardex)
  - `eventos.ts` — insert/get timeseries (PAM, lactato, pH...)
  - `pendencias.ts` — list/create/close
  - `atbs.ts` — stewardship (start/stop + DTA calculado)
  - `culturas.ts` + `antibiograma` embutido
  - `alerts.ts` — list/ack (anti alarm-fatigue)
- `package.json`, `tsconfig.json`, `README.md` (lista completa das 22 tools + setup Claude Desktop config + fluxo tático)

**Uso típico:** `sasi_sitrep` → visão geral → `sasi_get_patient` → `sasi_create_evolution` ou `sasi_insert_event`.

**Build/Run:** `npm run build` → `node dist/index.js` (com SUPABASE_URL + SERVICE_ROLE_KEY no env). Nunca use anon key aqui.

---

### 3. supabase/ — Backend Canônico
**Propósito:** Postgres (cloud) + Edge Functions (ingestão e síntese) + migrations locais (parcialmente obsoletas — dívida documentada).

**Conteúdo:**
- `config.toml` — Config do Supabase CLI (project ref idswehsvvqczzkiatuzu, sa-east-1)
- `functions/`
  - `ocr-ingest/index.ts` — Edge principal: recebe payload da skill `sasi-ingest-export` (foto da folha → JSON validado), resolve paciente, insere em `evolucoes` + `eventos_clinicos` + `ingest_audit_log`. `verify_jwt: true`.
  - `grok-synthesis/index.ts` — Síntese SASI via xAI Grok (usa prompt compartilhado).
  - `_shared/sasiPrompt.ts` — Prompts comuns (doutrina Ramo C).
- `migrations/` (5 arquivos — histórico; schema real de 9 tabelas + views está na cloud e no dump `SASI_schema_LIVE...`):
  - `01_initial_schema.sql`
  - `02_pacientes_updated_at_trigger.sql`
  - `03_dev_bypass_rls.sql` ← **P0 LGPD** (as 9 policies `dev_bypass` PERMISSIVE public expõem PHI via anon key — flagged em CLAUDE.md)
  - `04_security_perf_hardening.sql`
  - `05_add_patient_summary.sql`
- `.temp/` (temporários)

**Schema vivo (de CLAUDE/STATUS):** 9 tabelas RLS (`pacientes`, `evolucoes` JSONB, `eventos_clinicos` timeseries — ainda vazia, prioridade Fase Charlie/Delta), 5 views security_invoker, triggers, pgcrypto, pg_trgm.

**Risco:** Migrations locais não versionam o schema atual de 9 tabelas. Drift possível.

---

### 4. templates/ — Espelhos da Doutrina e Arquitetura (Obsidian CELEBRO)
**Propósito:** Cópias de referência para IDE, Cursor, Claude Code e skills usarem os mesmos modelos da operação clínica sem depender do vault Obsidian aberto o tempo todo. Fonte da verdade continua no Obsidian.

**Subdiretórios:**
- `sasi-clinico/` (11 arquivos .md) — Doutrina SASI v2 (Ramo C), `_SASI_TEMPLATE_BASE_v2.md`, `admissao-uti_SKILL.md`, `sasi-ingest-export_SKILL.md`, references/ (schema eventos, extraction dictionary, sanity checks, export templates).
- `arquitetura/` (5 .md) — Scaffolds de projeto (Node, Python, React, monorepo SASI v2).
- `obsidian/` — `daily.md` (template de nota de plantão).
- `README.md` + instruções de sync (cp do vault `30-Projetos/SASI/Doutrina/...` e `ARQUITETURA REPOSITÓRIOS/`).

**Sincronização recomendada (após editar no Obsidian):** usar os comandos do README.

---

### 5. docs/ — Documentação Operacional
- `MAPA-REPOSITORIO.md` — Visão de alto nível "onde fica cada coisa" (obrigatório ler).
- `SETUP.md` — Checklist máquina nova (Node, Git, WebStorm, Supabase CLI, envs).
- `JETBRAINS.md` — Run configs, code style, WebStorm specific.
- `superpowers/specs/` — Specs locais de superpowers (usado pelo projeto).

---

### 6. .claude/skills/ — Superpowers + Ferramentas IA Vendored
Contém cópias locais de:
- using-superpowers, brainstorming, systematic-debugging, test-driven-development, writing-plans, writing-skills, verification-before-completion, executing-plans, subagent-driven-development, dispatching-parallel-agents, requesting/receiving-code-review, finishing-a-development-branch, using-git-worktrees etc.
- `prompt-improver/` (custom com nudges para PreToolUse etc.)
- Outros (skill-creator, etc.)

**Por quê aqui?** Para que o Claude Code dentro do repo tenha acesso imediato às disciplinas sem depender de instalação global. Usado pelo projeto para manter qualidade (TDD, plans, verification, etc.).

---

### 7. Outros (Config/IDE)
- `.idea/` — Run configurations (`sasi: dev`, `sasi: typecheck`), code styles, inspection profiles (versionado — fundido durante faxina).
- `.cursor/` — Regras (aponta para templates).
- `.vscode/` (se existir).
- `.sasi-session-backup/` — Scratch (gitignored).

---

## Relação com o Sistema Clínico SASI

- **Doutrina Ramo C** (ortogonalidade Tempo/Estado/Problema/Ação) está espelhada em `templates/sasi-clinico/`, `lib/clinicalExtract.ts` + `clinicalFormat.ts`, e nas 5 janelas do frontend.
- **Ingestão** (zero alucinação): Foto → skill `sasi-ingest-export` → Edge `ocr-ingest` → Postgres (com audit) → Realtime → Dashboard.
- **MCP** (`sasi-mcp-server`): Dá superpoderes ao Claude para operar diretamente no DB (sitrep, evolução, stewardship ATB, alertas etc.) usando service role.
- **5 Janelas + severity tiers** implementam a "tabela tática de pacientes" e "planos de manejo 1:1" descritos em CLAUDE.md.
- **Zero alucinação + Max-Min + Conduta 1:1 numérica** são enforced em múltiplos lugares (schema, extract, UI, skills).

---

## Comandos Rápidos de Exploração
```bash
# Árvore limpa (pruned)
find . -type d \( -path '*/node_modules' -o -path '*/dist' ... \) -prune -o -type d -print | sort

# Tamanhos fonte
du -h --max-depth=2 --exclude=node_modules --exclude=dist .

# No sasi (frontend)
cd sasi && npm run typecheck && npm run dev

# MCP
cd sasi-mcp-server && npm run build
```

---

**Gerado com disciplina superpowers** (brainstorming para escopo/intent, writing-plans via todo list, verification-before-completion com comandos confirmatórios).

Ver também: `STATUS.md` (atualizações), `CLAUDE.md` (doutrina + riscos), `docs/MAPA-REPOSITORIO.md` (visão 1 página), `AGENTS.md` (regras obrigatórias).

Stay hard. 🦅
