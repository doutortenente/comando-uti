# comando-uti — GERAL

Projeto-índice (umbrella) do ambiente do Dr. Nicolas Nagaita ("Tenente").
Aqui vivem a **doutrina de arquitetura**, **templates**, **docs operacionais** e a
**config de ferramentas de IA** — não o código de produto, que mora nos repos irmãos.

## Os 5 repositórios

| Projeto | Repo | Papel |
|---------|------|-------|
| 🟢 **SASI** | [`doutortenente/SASI`](https://github.com/doutortenente/SASI) | Produto clínico — UTI (React+Vite frontend, MCP server, Supabase, doutrina Ramo C). Deploy Netlify. |
| 🤖 **Claude** | [`doutortenente/Claude`](https://github.com/doutortenente/Claude) | Config + skills reutilizáveis do Claude Code. |
| 🛠️ **GROK** | [`doutortenente/GROK`](https://github.com/doutortenente/GROK) | Tooling em torno do Grok Build/Composer (scaffold). |
| 🏠 **JARVIS** | [`doutortenente/JARVIS`](https://github.com/doutortenente/JARVIS) | Homelab / VPS — Docker+Traefik (scaffold). |
| 📚 **GERAL** | `doutortenente/comando-uti` (este) | Doutrina, templates, docs, config de IA. |

> Local no disco: todos irmãos em `~/WebstormProjects/`.

## O que tem aqui (GERAL)

```text
comando-uti/
├── arquitetura-padrao.md   Estrutura-padrão de pastas para projetos novos
├── templates/
│   ├── arquitetura/        Scaffolds (Node-TS, FastAPI, React+Vite, SASI v2)
│   └── obsidian/           daily.md (nota de plantão)
├── docs/                   MAPA-REPOSITORIO · DIRETORIOS_DETALHADO · JETBRAINS · SETUP
├── .claude/                Config Claude Code (settings + skills vendor)
├── .cursor/                Config Cursor
├── .github/ .idea/ .vscode/  CI + IDE
└── .gitignore .gitattributes
```

## Histórico

Este repo já foi o monorepo único do SASI. Em 17-Jun-2026 foi feito o **split em 5
repos irmãos** (branch `chore/split-into-sibling-repos`): o produto clínico migrou
para o repo `SASI`, config do Claude para `Claude`, e `comando-uti` virou o índice
GERAL. Todo o histórico anterior permanece neste repo.

> ⚠️ **Deploy:** o Netlify (`sasi-uti`) ainda aponta para `comando-uti/sasi` na **main**.
> A `main` deste repo **não foi alterada** pelo split. Antes de mergear este split na
> main, reaponte o Netlify para `doutortenente/SASI` (base `frontend/`), senão o deploy quebra.
