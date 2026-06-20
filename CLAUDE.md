# CLAUDE.md — comando-uti (GERAL)

> Repo-índice (umbrella) do ambiente do Dr. Tenente. **Não é o produto clínico.**

## O que é este repo

Após o split de 17-Jun-2026, `comando-uti` é o projeto **GERAL**: doutrina de
arquitetura, templates de scaffolding, docs operacionais e config de IA. O código
clínico (SASI) vive em repo próprio.

## Mapa dos 6 repos irmãos (`~/dev/`)

- **SASI** (`doutortenente/SASI`) — produto clínico de UTI. Toda doutrina clínica
  (zero alucinação, Ramo C, Max–Min, conduta 1:1), o `CLAUDE.md` clínico, skills e
  schema vivem **lá**. Trabalho clínico → abrir o repo SASI.
- **Claude** (`doutortenente/Claude`) — config + skills do Claude Code.
- **GROK** (`doutortenente/GROK`) — tooling Grok (scaffold).
- **JARVIS** (`doutortenente/JARVIS`) — homelab/VPS (scaffold).
- **Cursor** (`doutortenente/Cursor`) — config do Cursor (scaffold).
- **comando-uti** (este) — GERAL.

## O que mora aqui

- `arquitetura-padrao.md` + `templates/arquitetura/` — scaffolding de projetos novos.
- `templates/obsidian/` — espelho de templates do vault CELEBRO.
- `docs/` — MAPA-REPOSITORIO, DIRETORIOS_DETALHADO, JETBRAINS, SETUP.
- `.claude/`, `.cursor/` — config de ferramentas de IA.

## Avisos

- **Deploy:** o Netlify (`sasi-uti`) ainda aponta para `comando-uti/sasi` na `main`,
  que **não foi alterada** pelo split. Reaponte para `doutortenente/SASI` (base
  `frontend/`) antes de mergear o split na main, ou o deploy quebra.
- Estilo de comunicação e doutrina clínica completa: ver o `CLAUDE.md` do repo SASI.
