# Skills vendoradas (terceiros)

Estas skills foram **copiadas de repositórios de terceiros** para dentro do projeto, em vez de
instaladas via `git clone ~/.claude/skills` ou `/plugin install`, porque o ambiente Claude Code on
the web é **efêmero** — instalações fora do repo não persistem entre sessões. Versões **fixadas** no
commit upstream abaixo para rastreabilidade e auditoria (o repo toca credenciais Supabase / dados de
paciente, então mudanças de upstream devem ser revisadas antes de re-sincronizar).

| Skill(s) | Upstream | Commit fixado | Licença | O que foi copiado |
|---|---|---|---|---|
| `skill-creator/` | https://github.com/daymade/claude-code-skills | `96b14eb2cea2ea4f6a15e3e8182c89879e0137fc` | ver `skill-creator/LICENSE.txt` | `daymade-skill/skill-creator/` (completo) |
| 14 skills do superpowers (`brainstorming/`, `systematic-debugging/`, `test-driven-development/`, `requesting-code-review/`, `receiving-code-review/`, `writing-plans/`, `executing-plans/`, `verification-before-completion/`, `using-superpowers/`, `writing-skills/`, `dispatching-parallel-agents/`, `subagent-driven-development/`, `executing-plans/`, `finishing-a-development-branch/`, `using-git-worktrees/`) | https://github.com/obra/superpowers | `6fd4507659784c351abbd2bc264c7162cfd386dc` | MIT — `_vendor/superpowers-LICENSE` | conteúdo de `skills/*` achatado para `.claude/skills/<nome>/` |
| `prompt-improver/` | https://github.com/severity1/claude-code-prompt-improver | `306c325b7c152b537ede6a95ad1a8fc199f637eb` | MIT — `prompt-improver/LICENSE` | `skills/prompt-improver/` + `scripts/` + `nudges/` |

## Notas de instalação / fiação

### prompt-improver — hooks ATIVOS
Os 3 hooks foram religados em `.claude/settings.json`, apontando para
`${CLAUDE_PROJECT_DIR}/.claude/skills/prompt-improver/scripts/engine.py` (eventos `UserPromptSubmit`,
`PreToolUse` com matcher `EnterPlanMode|Bash`, `SubagentStart`). Requer `python3` no PATH.

- **Roda em todo prompt** (~189 tokens de overhead). O `engine.py` é defensivo: sempre sai com código 0.
- **Bypass**: comece o prompt com `*`, `/` ou `#` para pular a avaliação.
- **Para desativar**: remova o bloco `hooks` de `.claude/settings.json`.
- A resolução de `nudges/` é relativa ao próprio script (`scripts/../nudges`), então independe de
  `CLAUDE_PLUGIN_ROOT`.

### superpowers — sem SessionStart hook
O hook `SessionStart` original (injetava o dispatcher `using-superpowers`) **não** foi religado: ele
depende de um wrapper bash com path relativo de plugin que quebra ao achatar as skills. Não é
necessário — todas as 14 skills são descobertas automaticamente como project skills, incluindo
`using-superpowers`. Para religar manualmente, veja `hooks/hooks.json` no upstream.

### Descartadas na avaliação
`humanizer` (blader) e `fact-check` (petar-nauka) foram avaliadas e **não** incluídas: a primeira é
para prosa estilo marketing (saídas clínicas aqui são dados estruturados); a segunda é checagem de
desinformação de mídia (SIFT/CRAAP), não fato clínico — arriscada em contexto médico.

## Como re-sincronizar com o upstream
1. `git clone <upstream>` num diretório temporário.
2. Comparar mudanças desde o commit fixado acima; revisar diffs de qualquer `scripts/`/hook.
3. Re-copiar os subtrees, atualizar os SHAs nesta tabela.
