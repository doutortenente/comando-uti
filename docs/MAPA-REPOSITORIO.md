# Mapa do Repositório — Comando UTI (GERAL)

**Revisão:** 17-Jun-2026 — **pós-split em 5 repos irmãos.**
**Objetivo:** uma página que responde "onde fica cada coisa?".

> 🔀 **Mudança estrutural (17-Jun-2026):** o antigo monorepo foi separado em 5 repos
> irmãos em `~/WebstormProjects/`. Este repo (`comando-uti`) virou o índice **GERAL**.
> O código de produto (frontend, mcp-server, supabase, doutrina clínica) migrou para
> o repo **`doutortenente/SASI`**. Ver [`../README.md`](../README.md).

---

## 1. Os 5 repos irmãos (`~/WebstormProjects/`)

```text
~/WebstormProjects/
├── SASI/         🟢 produto clínico — frontend (React+Vite) · mcp-server · supabase · doctrine
├── Claude/       🤖 config + skills reutilizáveis do Claude Code
├── GROK/         🛠️ tooling Grok Build/Composer (scaffold)
├── JARVIS/       🏠 homelab/VPS — Docker+Traefik (scaffold)
└── comando-uti/  📚 GERAL (este) — doutrina, templates, docs, config de IA
```

### Dentro do GERAL (este repo)

```text
comando-uti/
├── arquitetura-padrao.md   ← Estrutura-padrão de pastas (scaffolding)
├── templates/              ← arquitetura/ (scaffolds) + obsidian/ (daily)
├── docs/                   ← MAPA · DIRETORIOS_DETALHADO · JETBRAINS · SETUP
├── .claude/                ← Config Claude Code (settings + skills vendor)
├── .cursor/ .idea/ .vscode/ .github/  ← Config IDE + CI
└── .gitignore .gitattributes
```

> ⚠️ **Deploy:** Netlify (`sasi-uti`) ainda aponta `comando-uti/sasi` na **main** (intocada
> pelo split). Reaponte para `doutortenente/SASI` (base `frontend/`) **antes** de mergear o split.

---

## 2. Onde fica cada runtime

> Pós-split, os runtimes de **produto** (frontend e MCP server) migraram para o repo
> **`doutortenente/SASI`**. Aqui no GERAL não roda app — só docs, templates e config de IA.

| Runtime | Onde agora | Observação |
|---------|------------|------------|
| **Node — Frontend** | repo `SASI` (`frontend/`) | migrou no split; era `sasi/` neste repo |
| **Node — MCP** | repo `SASI` (`mcp-server/`) | migrou no split; era `sasi-mcp-server/` |
| **Deno/TS — Edge** | `supabase/functions/` (ainda aqui) | ver ⚠️ pendência abaixo |
| **Postgres** | Supabase cloud | migrations em `supabase/migrations/` (ainda aqui) |
| **Python** | `.claude/skills/*/scripts/` apenas | hooks/skills (não é app) |

### ⚠️ Pendência do split: `supabase/`

O diretório `supabase/` (função `ingest-patient`, migration snapshot, types) **não migrou**
para o repo `SASI` — continua fisicamente neste repo. Como é código clínico, pela doutrina
do split deveria viver em `SASI`. **Decidir:** mover para `SASI` ou manter aqui como exceção
documentada. Enquanto não decidido, é a única peça de produto restante no GERAL.

---

## 3. Categorias de pasta

### 🟢 Produção (migrou para o repo `SASI`)

A UI clínica, hooks, lib e o MCP server **não estão mais aqui** — vivem em `doutortenente/SASI`.
A única peça de produto restante neste repo é `supabase/` (ver §2, pendência).

### 📋 Templates e doutrina (copiados do Obsidian)

- `templates/arquitetura/` — scaffolds Node, Python, React, SASI v2
- `templates/obsidian/` — `daily.md` (nota de plantão)

> A doutrina clínica (skills, template-base v2) migrou para o repo `SASI`. Este repo
> não tem mais `templates/sasi-clinico/`.

Fonte canônica: `/home/dr/vaults/celebro/` (vault **CELEBRO**, perfil Notebook Navigator **Padrão**).

### 🤖 Ferramentas de IA (não são o app)

- `.claude/settings.json` — permissões + hooks Python do prompt-improver
- `.claude/skills/` — ~17 skills vendor (superpowers, TDD, brainstorming…)
- `.mcp.json` — Supabase HTTP + sasi MCP local
- `.cursor/` — plugins Cursor (Supabase, Netlify…)

### 📚 Documentação

| Arquivo | Função |
|---------|--------|
| `README.md` | Visão geral dos 5 repos + estado do split |
| `CLAUDE.md` | Briefing operacional para IA (GERAL) |
| `docs/SETUP.md` | Setup de máquina nova |
| `docs/JETBRAINS.md` | WebStorm / IntelliJ |
| `docs/MAPA-REPOSITORIO.md` | Este arquivo (visão geral) |
| `docs/DIRETORIOS_DETALHADO.md` | **Mapa detalhado de todos os diretórios** com propósitos, contagens de arquivos, tamanhos, anotações clínicas/engenharia e evidências (17-Jun-2026) |

> `STATUS.md` e `AGENTS.md` migraram para o repo `SASI` no split — não existem mais aqui.

### 🔒 Ignorados (não versionar)

`.env`, `node_modules/`, `dist/`, `.cursor/` (parcial), `archive/`, PHI em `90-PHI-LOCAL/` (Obsidian).

---

## 4. Obsidian CELEBRO — mapa PARA (perfil Padrão)

| Pasta Obsidian | Função | Equivalente no repo |
|----------------|--------|---------------------|
| `00-Inbox` | Captura rápida | — |
| `10-Clinica` | Protocolos (sem PHI) | — |
| `20-Plantao` | Plantão anonimizado | — |
| `30-Projetos/SASI` | Projeto SASI | repo `SASI` (frontend + doutrina) |
| `40-Permanente` | Notas permanentes | `docs/` (parcial) |
| `50-Diario` | Daily notes | `templates/obsidian/daily.md` |
| `99-Templates` | Modelos | `templates/` |
| `ARQUITETURA REPOSITÓRIOS` | Scaffolds de projeto | `templates/arquitetura/` |
| `90-PHI-LOCAL` | PHI + segredos | **NUNCA** no git |

Atalhos 1–9 do perfil Padrão: Home · Inbox · Clínica · Plantão · SASI · Diário · Pendências · Projetos · Setup.

---

## 5. Decisões não óbvias (raciocínio)

### Por que o split em 5 repos irmãos?

O monorepo único misturava produto clínico (SASI), config de IA e doutrina. Separar dá
deploy/CI independentes por projeto e um repo GERAL enxuto como índice. Ver `README.md`.

### Por que copiar templates do Obsidian em vez de symlink?

O vault fica fora do repo (`/home/dr/vaults/celebro/`). Cópia versionada garante que IA e
IDE leem os mesmos arquivos sem depender do Obsidian aberto. A fonte da verdade continua no
vault; o README em `templates/` documenta o comando de re-sync.

### Por que fundir `CONFIGURAÇÕES_CLAUDE_JB.idea` → `.idea`?

Duas pastas `.idea` confundem o JetBrains: uma incompleta (sem run configs), outra completa mas com nome não-padrão. A convenção JetBrains e o `docs/JETBRAINS.md` exigem `.idea/` na raiz.

### Por que remover `raiz: lint`?

A faxina de 11/06 removeu `package.json` da raiz. A run config apontava para um arquivo inexistente — lint na raiz não existe mais; typecheck vive em `sasi/`.

---

## 6. Comandos rápidos

```bash
# Frontend / MCP / typecheck → agora no repo SASI (ver doutortenente/SASI)

# Sync template diário do Obsidian
cp "/home/dr/vaults/celebro/99-Templates/daily.md" templates/obsidian/daily.md

# Sync scaffolds de arquitetura
cp "/home/dr/vaults/celebro/ARQUITETURA REPOSITÓRIOS/SASI_v2_Compiladao_Arquitetura_Projetos_2026.md" templates/arquitetura/sasi-v2-monorepo.md
```

---

## 7. Mapas e Otimização do Ambiente (atualizações 17-Jun-2026)

- **[docs/DIRETORIOS_DETALHADO.md](DIRETORIOS_DETALHADO.md)** — Detalhamento completo dos diretórios do repositório (árvore pruned, propósitos por pasta, contagens, tamanhos fonte, mapeamento para as 5 janelas SASI, doutrina Ramo C, fluxos de ingestão/MCP e ferramentas de IA). Gerado com análise profunda e verificação.
- **Sistema completo (PC host):** `/home/dr/MAPA_PC_2026-06-17.md` (mapa geral de /home/dr e raiz) e `/home/dr/PC_OPTIMIZATION_PLAN.md` (análise de uso de disco, limpeza de ~10GB em caches/duplicatas seguras, mapa do sistema, plano de otimização priorizado com comandos e evidências). Arquivos locais do host — fora deste repo.

**Nota:** O plano de otimização do ambiente foi executado com todas as permissões, respeitando rigorosamente dados de projetos, PHI médico (Obsidian 90-PHI-LOCAL, Documentos/SASI, Backups) e código fonte. Caches e duplicatas transitórios foram limpos com verificação pré/pós.

---

Ver também: [README.md](../README.md) · [SETUP.md](SETUP.md) · [templates/README.md](../templates/README.md) · [DIRETORIOS_DETALHADO.md](DIRETORIOS_DETALHADO.md)