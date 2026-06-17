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

| Runtime | Onde | `package.json` / entry | Comando dev |
|---------|------|------------------------|-------------|
| **Node — Frontend** | `sasi/` | `sasi/package.json` | `cd sasi && npm run dev` |
| **Node — MCP** | `sasi-mcp-server/` | `sasi-mcp-server/package.json` | `cd sasi-mcp-server && npm run dev` |
| **Deno/TS — Edge** | `supabase/functions/` | cada função tem `index.ts` | `supabase functions serve` |
| **Python** | `.claude/skills/*/scripts/` apenas | hooks/skills (não é app) | n/a |
| **Postgres** | Supabase cloud | migrations em `supabase/migrations/` | Supabase Dashboard / MCP |

### ⚠️ Lixo removido / não usar

| Item | Status | Ação |
|------|--------|------|
| `node_modules/` na **raiz** | Órfão (sem `package.json`) | **Removido** — era resíduo da faxina de 11/06 |
| `CONFIGURAÇÕES_CLAUDE_JB.idea/` | Duplicata de `.idea/` | **Fundido** em `.idea/` |
| `.sasi-session-backup/` | Scratch de sessão IA | Ignorado no git — não é código |
| `sasi/.claude/` | Só `settings.local.json` | Pode ignorar; config real é `.claude/` na raiz |

---

## 3. Categorias de pasta

### 🟢 Produção (versionar, mexer com cuidado)

- `sasi/src/` — UI clínica (componentes, hooks, lib)
- `supabase/functions/` — `ocr-ingest`, `grok-synthesis`
- `supabase/migrations/` — schema (parcialmente obsoleto — ver STATUS.md)
- `sasi-mcp-server/src/` — tools MCP para Supabase

### 📋 Templates e doutrina (copiados do Obsidian)

- `templates/arquitetura/` — scaffolds Node, Python, React, SASI v2
- `templates/sasi-clinico/` — `_SASI_TEMPLATE_BASE_v2`, skills ingest/admissão
- `templates/obsidian/` — `daily.md` (nota de plantão)

Fonte canônica: `/home/dr/Obsidian /CELEBRO/` (vault **CELEBRO**, perfil Notebook Navigator **Padrão**).

### 🤖 Ferramentas de IA (não são o app)

- `.claude/settings.json` — permissões + hooks Python do prompt-improver
- `.claude/skills/` — ~17 skills vendor (superpowers, TDD, brainstorming…)
- `.mcp.json` — Supabase HTTP + sasi MCP local
- `.cursor/` — plugins Cursor (Supabase, Netlify…)

### 📚 Documentação

| Arquivo | Função |
|---------|--------|
| `STATUS.md` | Estado vivo do produto |
| `CLAUDE.md` | Briefing operacional para IA |
| `AGENTS.md` | Regras SASI + env vars |
| `docs/SETUP.md` | Setup de máquina nova |
| `docs/JETBRAINS.md` | WebStorm / IntelliJ |
| `docs/MAPA-REPOSITORIO.md` | Este arquivo (visão geral) |
| `docs/DIRETORIOS_DETALHADO.md` | **Mapa detalhado de todos os diretórios** com propósitos, contagens de arquivos, tamanhos, anotações clínicas/engenharia e evidências (17-Jun-2026) |

### 🔒 Ignorados (não versionar)

`.env`, `node_modules/`, `dist/`, `.cursor/` (parcial), `archive/`, PHI em `90-PHI-LOCAL/` (Obsidian).

---

## 4. Obsidian CELEBRO — mapa PARA (perfil Padrão)

| Pasta Obsidian | Função | Equivalente no repo |
|----------------|--------|---------------------|
| `00-Inbox` | Captura rápida | — |
| `10-Clinica` | Protocolos (sem PHI) | — |
| `20-Plantao` | Plantão anonimizado | — |
| `30-Projetos/SASI` | Projeto SASI | `sasi/` + `templates/sasi-clinico/` |
| `40-Permanente` | Notas permanentes | `docs/` (parcial) |
| `50-Diario` | Daily notes | `templates/obsidian/daily.md` |
| `99-Templates` | Modelos | `templates/` |
| `ARQUITETURA REPOSITÓRIOS` | Scaffolds de projeto | `templates/arquitetura/` |
| `90-PHI-LOCAL` | PHI + segredos | **NUNCA** no git |

Atalhos 1–9 do perfil Padrão: Home · Inbox · Clínica · Plantão · SASI · Diário · Pendências · Projetos · Setup.

---

## 5. Decisões não óbvias (raciocínio)

### Por que não mover `sasi/` para a raiz?

O Netlify aponta `base = sasi`. Renomear quebra deploy sem coordenação. O monorepo com subpastas é intencional.

### Por que Python não tem pasta própria?

O stack de produção é Node (frontend + MCP) + Deno/TS (edge) + Postgres. Python só existe para scripts de skills Claude — não merece `backend-python/` separado.

### Por que copiar templates do Obsidian em vez de symlink?

O path do vault tem espaço (`Obsidian /CELEBRO`) e fica fora do repo. Cópia versionada garante que IA e IDE leem os mesmos arquivos sem depender do Obsidian aberto. A fonte da verdade continua no vault; o README em `templates/` documenta o comando de re-sync.

### Por que fundir `CONFIGURAÇÕES_CLAUDE_JB.idea` → `.idea`?

Duas pastas `.idea` confundem o JetBrains: uma incompleta (sem run configs), outra completa mas com nome não-padrão. A convenção JetBrains e o `docs/JETBRAINS.md` exigem `.idea/` na raiz.

### Por que remover `raiz: lint`?

A faxina de 11/06 removeu `package.json` da raiz. A run config apontava para um arquivo inexistente — lint na raiz não existe mais; typecheck vive em `sasi/`.

---

## 6. Comandos rápidos

```bash
# Frontend
cd sasi && npm install && npm run dev

# MCP server
cd sasi-mcp-server && npm install && npm run build

# Typecheck
cd sasi && npm run typecheck

# Sync templates do Obsidian
cp -r "/home/dr/Obsidian /CELEBRO/30-Projetos/SASI/Doutrina/00 - Doutrina (SKILLs e Templates)/"* templates/sasi-clinico/
```

---

## 7. Mapas e Otimização do Ambiente (atualizações 17-Jun-2026)

- **[docs/DIRETORIOS_DETALHADO.md](DIRETORIOS_DETALHADO.md)** — Detalhamento completo dos diretórios do repositório (árvore pruned, propósitos por pasta, contagens, tamanhos fonte, mapeamento para as 5 janelas SASI, doutrina Ramo C, fluxos de ingestão/MCP e ferramentas de IA). Gerado com análise profunda e verificação.
- **Sistema completo (PC host):** [MAPA_PC_2026-06-17.md](/home/dr/MAPA_PC_2026-06-17.md) (mapa geral de /home/dr e raiz) e [PC_OPTIMIZATION_PLAN.md](/home/dr/PC_OPTIMIZATION_PLAN.md) (análise de uso de disco, limpeza de ~10GB em caches/duplicatas seguras, mapa do sistema, plano de otimização priorizado com comandos e evidências).

**Nota:** O plano de otimização do ambiente foi executado com todas as permissões, respeitando rigorosamente dados de projetos, PHI médico (Obsidian 90-PHI-LOCAL, Documentos/SASI, Backups) e código fonte. Caches e duplicatas transitórios foram limpos com verificação pré/pós.

---

Ver também: [STATUS.md](../STATUS.md) · [SETUP.md](SETUP.md) · [templates/README.md](../templates/README.md) · [DIRETORIOS_DETALHADO.md](DIRETORIOS_DETALHADO.md)