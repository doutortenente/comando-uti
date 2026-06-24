# Relatório: Melhores Práticas para CLAUDE.md e Memória do Claude Code — Aplicado a Três Arquivos (Global, Por-Projeto, Memória Manual)

## TL;DR
- **CLAUDE.md é CONTEXTO (sugestão), não enforcement** — a doc oficial é explícita: *"Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead."* Para sua regra inviolável de PHI (LGPD/CFM), o CLAUDE.md sozinho **NÃO basta**; é obrigatório combinar com `permissions.deny` + hooks PreToolUse.
- **ALERTA CRÍTICO para seu setup**: o sandbox do Claude Code — a única garantia em nível de SO que bloqueia subprocessos arbitrários — **NÃO roda em Windows nativo** (só macOS/Linux/WSL2). No Windows nativo, permissions e hooks são controles *best-effort* de cliente, não uma barreira de SO. Para garantia real anti-vazamento de PHI, rode o Claude Code dentro de WSL2 com sandbox.
- Estrutura recomendada: **Global** (~50-80 linhas: regras universais, persona, CoD, anti-alucinação), **Por-projeto** (<150 linhas: índice + arquitetura, com `.claude/rules/` path-scoped para Supabase), **Memória manual** (semeada via import de `~/.claude/`, separada da auto memory que o Claude escreve sozinho).

---

## Key Findings (Fatos CONFIRMADOS pela documentação oficial)

### Hierarquia e ordem de carregamento
A doc oficial (`code.claude.com/docs/en/memory`) lista quatro escopos, em ordem de carregamento do mais amplo ao mais específico:
1. **Managed policy** (organização): Windows = `C:\Program Files\ClaudeCode\CLAUDE.md` (ou a chave `claudeMd` em `managed-settings.json`). **NÃO pode ser excluído** por settings individuais.
2. **User/global**: `~/.claude/CLAUDE.md` (Windows: `%USERPROFILE%\.claude\CLAUDE.md`) — todos os projetos.
3. **Project**: `./CLAUDE.md` ou `./.claude/CLAUDE.md` — compartilhado via git.
4. **Local**: `./CLAUDE.local.md` — gitignored, pessoal.

**Resolução de conflitos**: a doc afirma que todos os arquivos descobertos são **concatenados** (*"All discovered files are concatenated into context rather than overriding each other"*). A ordem vai da raiz do filesystem até o working directory, então *"instructions closer to where you launched Claude are read last"*. O escopo mais específico tende a prevalecer porque é lido por último — mas a doc enfatiza que **NÃO se deve confiar na ordem de leitura** para resolver conflitos: *"if two rules contradict each other, Claude may pick one arbitrarily."* A comunidade (Medium/Bijit Ghosh) descreve isso como *"soft weighting effect, not a strict override"*. `.claude/rules/*.md` sem frontmatter e `.claude/CLAUDE.md` têm a **MESMA** prioridade.

### Tamanho ideal e orçamento de contexto
- Doc oficial: **"target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence."**
- HumanLayer (praticante reconhecido): root CLAUDE.md com **menos de 60 linhas**; consenso da comunidade <300 linhas.
- **Como o conteúdo é injetado (crítico para confiabilidade)**: a doc é explícita — **"CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance, especially for vague or conflicting instructions."**
- HumanLayer documentou que o Claude Code injeta um *system-reminder* junto ao CLAUDE.md: *"IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task."* Resultado: quanto mais conteúdo não-universal, mais o Claude tende a ignorar o arquivo inteiro.
- Comentários HTML de bloco (`<!-- -->`) são **removidos antes da injeção** no contexto (*"Block-level HTML comments... are stripped before the content is injected"*). Use para notas de manutenção sem gastar tokens (mas ficam visíveis ao abrir o arquivo com a ferramenta Read).

### Imports com @path
Doc oficial: sintaxe `@path/to/import`. Caminhos relativos resolvem **a partir do arquivo que importa, não do cwd** (*"Relative paths resolve relative to the file containing the import, not the working directory"*). Profundidade máxima: **4 hops** (*"maximum depth of four hops"* — nota: várias fontes da comunidade dizem 5; a doc oficial atual diz 4). Imports **NÃO reduzem contexto**: *"imported files still load and enter the context window at launch."* Parsing ignora code spans/blocks (envolva em backticks para mencionar sem importar). O primeiro import externo dispara um **diálogo de aprovação**; se recusado, fica desabilitado permanentemente.

### `.claude/rules/`
- Cada arquivo `.md` cobre um tópico; descoberta recursiva (subdiretórios `frontend/`, `backend/`).
- Regras **SEM** `paths` frontmatter carregam no launch com a mesma prioridade que `.claude/CLAUDE.md`.
- Regras **COM** `paths` (glob, YAML) só entram em contexto quando o Claude trabalha com arquivos que casam o glob (*"Path-scoped rules trigger when Claude reads files matching the pattern, not on every tool use"*).
- Regras de usuário em `~/.claude/rules/` aplicam a todos os projetos e carregam **antes** das regras de projeto (projeto tem prioridade maior).
- Suporta symlinks para compartilhar regras entre projetos.

### Auto memory nativa
- Requer **Claude Code v2.1.59+**. Ligada por padrão.
- Localização: `~/.claude/projects/<projeto>/memory/` com `MEMORY.md` (índice) + arquivos de tópico. Derivada do repo git (worktrees compartilham um único diretório).
- **Carregamento**: *"The first 200 lines of MEMORY.md, or the first 25KB, whichever comes first, are loaded at the start of every conversation."* Arquivos de tópico só carregam sob demanda.
- O Claude decide o que salvar com base em utilidade futura (*"It decides what's worth remembering based on whether the information would be useful in a future conversation"*).
- Controles: toggle via `/memory`; `autoMemoryEnabled: false` em settings; env var `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (desliga) / `=0` (força ligado — duplo negativo).
- **Diferença prática**: CLAUDE.md = você escreve (instruções/regras); auto memory = Claude escreve (learnings/padrões). Ambos carregam no início de toda sessão.
- **Não confunda** com o "Memory Tool" da API (`memory_20250818`) — mecanismo diferente, para apps construídos sobre a API.

### Comando /init e CLAUDE_CODE_NEW_INIT
- `/init` analisa o codebase e gera um CLAUDE.md inicial com build/test/convenções. Se já existe, **sugere melhorias** em vez de sobrescrever.
- `CLAUDE_CODE_NEW_INIT=1` ativa um fluxo interativo multi-fase: pergunta quais artefatos criar (CLAUDE.md, skills, hooks), explora o codebase com subagent, faz perguntas de follow-up e apresenta uma **proposta revisável** antes de escrever.
- `/init` também lê `AGENTS.md`, `.cursorrules`, `.windsurfrules` e incorpora.

### O que sobrevive ao /compact (doc oficial — tabela "What survives compaction")
- **System prompt e output style**: inalterados (não fazem parte do histórico).
- **Project-root CLAUDE.md e regras unscoped**: re-injetados do disco.
- **Auto memory**: re-injetada do disco.
- **Regras com `paths:` frontmatter**: **PERDIDAS** até um arquivo casante ser lido de novo.
- **CLAUDE.md aninhados em subdiretórios**: **PERDIDOS** até um arquivo naquele diretório ser lido.
- **Corpos de skills invocadas**: re-injetados, com cap de 5.000 tokens/skill e 25.000 total; mais antigas dropadas primeiro (truncamento mantém o início — coloque o crítico no topo do SKILL.md).
- **Hooks**: rodam como código, não como contexto — não afetados.
- **Implicação**: regra crítica que PRECISA sobreviver à compactação → coloque no **project-root CLAUDE.md** (não em path-scoped rule). Vários praticantes movem regras de segurança para CLAUDE.md/CLAUDE.local.md por isso.

### Skills vs CLAUDE.md (progressive disclosure)
- Doc oficial: *"CLAUDE.md is always loaded. A skill is loaded when needed."* Skill = metadata (~100 tokens) sempre no system prompt; corpo (<5k tokens) carrega só quando o prompt casa a `description`.
- Regra de decisão da doc: *"If an entry is a multi-step procedure or only matters for one part of the codebase, move it to a skill or a path-scoped rule instead."*
- Skills são **model-invoked** (o Claude decide pela `description`) ou via slash command. A `description` YAML é o gatilho — precisa de keywords claras.

### Superpowers / dispatcher (using-superpowers)
- Framework de skills (`obra/superpowers`) por Jesse Vincent/Prime Radiant, no marketplace oficial (`/plugin install superpowers@claude-plugins-official`).
- Padrão **"dispatcher"**: a skill `using-superpowers` injeta no startup e após compactação um bootstrap que força o Claude a checar/invocar skills antes de responder (*"Invoke relevant or requested skills BEFORE any response or action. Even a 1% chance a skill might apply means that you should invoke the skill to check."*).
- Hierarquia explícita da própria skill: **"User's explicit instructions (CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) — highest priority; Superpowers skills — override default system behavior where they conflict."** Ou seja, **seu CLAUDE.md vence a skill**.
- Overhead real: ~22k tokens de contexto quando ativo (relato da comunidade). O criador admite ter adicionado *"psychological pressure techniques"* nos arquivos de skill para o Claude obedecer.

### Multi-projeto / monorepo
- CLAUDE.md aninhados por subdiretório carregam sob demanda (quando o Claude lê arquivos naquele dir).
- `claudeMdExcludes` (glob, em qualquer settings layer; arrays mesclam) pula CLAUDE.md de outros times. Managed policy CLAUDE.md **não** pode ser excluído.
- `--add-dir` dá acesso a diretórios extras; por padrão CLAUDE.md deles **não** carrega. `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` força o carregamento de `CLAUDE.md`/`.claude/CLAUDE.md`/`.claude/rules/*.md`/`CLAUDE.local.md`.

### ENFORCEMENT: CLAUDE.md vs permissions vs hooks (PRIORIDADE MÁXIMA para PHI)
A doc oficial separa explicitamente guia comportamental de enforcement técnico (tabela "managed CLAUDE.md vs managed settings"):
- **Block specific tools/commands/paths** → Managed settings: `permissions.deny`
- **Enforce sandbox isolation** → `sandbox.enabled`
- **Data handling and compliance reminders** → Managed CLAUDE.md (apenas lembrete comportamental)
- Frase-chave: **"Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer."**

Modelo mental da comunidade (hidekazu-konishi, corroborado): **"CLAUDE.md persuades, permissions filter, hooks enforce-and-react."** As três camadas:
1. **CLAUDE.md** = convenção/persuasão.
2. **permissions.deny** = filtro estático determinístico (avaliação **deny → ask → allow**; deny vence sempre, inclusive sobre `--allowedTools` e managed deny não pode ser relaxado).
3. **PreToolUse hook** = enforcement dinâmico/programável + reação (log/auditoria). Retorna `permissionDecision: "deny"` ou **exit code 2** para bloquear. `--dangerously-skip-permissions` pula prompts mas **NÃO** pula hooks.

**Limites críticos confirmados (doc oficial):**
- Regras Read/Edit deny aplicam às ferramentas nativas e a comandos reconhecidos (cat, head, tail, sed), MAS **"do not apply to arbitrary subprocesses that read or write files indirectly, like a Python or Node script that opens files itself."**
- WebFetch deny **NÃO** impede `curl`/`wget`: *"using WebFetch alone does not prevent network access. If Bash is allowed, Claude can still use curl, wget, or other tools to reach any URL."* Recomendação oficial: deny em curl/wget + `WebFetch(domain:...)` allow-list + PreToolUse hook validando URLs.
- Sintaxe WebFetch: `WebFetch(domain:example.com)`, `WebFetch(domain:*.example.com)`, `WebFetch(domain:*)`.

### ALERTA Windows nativo (doc oficial de sandboxing + verificação dirigida)
- **O sandbox NÃO roda em Windows nativo**: *"The sandbox is built into Claude Code and runs on macOS, Linux, and WSL2. Native Windows is not supported. On Windows, run Claude Code inside a WSL2 distribution."* (macOS=Seatbelt; Linux/WSL2=bubblewrap).
- Sandbox é a **única camada de SO** que restringe subprocessos arbitrários: *"enforced at the OS level, so they apply to all subprocess commands."*
- **Hooks no Windows nativo**: forma shell roda via **Git Bash** (se instalado) ou **PowerShell** como fallback (*"Git Bash on Windows, or PowerShell when Git Bash isn't installed"*). Um hook escrito como bash script **não é portável** sem Git Bash. Escreva em PowerShell (`"shell": "powershell"`) ou invoque via `node`. **Exit code 2 bloqueia igual** (sem exceção documentada de plataforma). `permissionDecision: "deny"` só é honrado em exit 0.
- `managed-settings.json` no Windows: `C:\Program Files\ClaudeCode\managed-settings.json` (a v2.1.75 deprecou o path legado `C:\ProgramData\ClaudeCode\`). Também via registro `HKLM\SOFTWARE\Policies\ClaudeCode`.
- **Conclusão para PHI**: no Windows nativo, permissions + hooks são *best-effort* (controles de cliente), **não barreira de SO**. Para garantia anti-vazamento, rode o Claude Code em **WSL2 com sandbox** (`enabled: true`, `failIfUnavailable: true`, `allowUnsandboxedCommands: false`, `denyRead` em diretórios de PHI/credenciais, `allowManagedDomainsOnly: true`) e aponte o plugin JetBrains para o ambiente WSL2.

---

## Details

### Confiabilidade de persona, formato de raciocínio e formato de saída via CLAUDE.md
**O que a evidência diz:**
- **Persona/tom**: funciona parcialmente. A comunidade (HumanLayer, abhishekray07) é unânime que *"Be a senior engineer"* / *"Think step by step"* desperdiça tokens porque o Claude Code já tem instruções de sistema fortes. MAS regras de tom **verificáveis e específicas** funcionam (caso Ran the Builder, regras de voz/estilo via CLAUDE.md). Para seu tom militar/tático, escreva regras concretas (*"Respostas diretas, sem preâmbulo. Sem emojis. Máximo de 1 frase de contexto antes da conclusão."*) em vez de *"seja militar"*.
- **Formato de raciocínio fixo (chain-of-draft)**: técnica real — **Chain of Draft (Silei Xu, Wenhao Xie, Lingxiao Zhao, Pengcheng He, Zoom Communications, arXiv:2502.18600, 25 fev 2025): "CoD matches or surpasses CoT in accuracy while using as little as only 7.6% of the tokens, significantly reducing cost and latency across various reasoning tasks."** Instrução canônica: *"Think step by step, but only keep a minimum draft for each thinking step, with 5 words at most. Return the answer at the end after a separator ####."* O paper avaliou Claude 3.5 Sonnet. **Porém**: o paper nota que CoD *"struggles in zero-shot settings and with smaller models"*; few-shot melhora aderência. Em CLAUDE.md, dê 1-2 exemplos do formato.
- **Formato de saída fixo (bloco "CONDUTA FINAL" + opções binárias)**: a doc reconhece que instruções de formato são seguidas, mas sem garantia (*"no guarantee of strict compliance"*). Técnicas que aumentam obediência: (1) imperativo direto, não observação; (2) `IMPORTANT`/`YOU MUST` reservado para 1-2 regras críticas (*"Anthropic's documentation confirms that adding IMPORTANT or YOU MUST to a rule improves adherence"*); (3) especificidade verificável; (4) exemplo concreto literal do bloco; (5) repetição mínima — não contradizer.
- **Onde falha**: após /compact se a instrução estava só em conversa ou em nested/path-scoped rule; quando o contexto enche e a aderência cai; quando há regras contraditórias; quando conteúdo não-universal "dilui" o sinal e o Claude trata o CLAUDE.md inteiro como irrelevante. Para um formato de saída que DEVE sempre aparecer, reforce via **Stop hook** (verificação) ou output style.

### Doutrina de ZERO ALUCINAÇÃO no CLAUDE.md
Não há feature nativa anti-alucinação; é regra comportamental (logo, persuasão, não enforcement). Práticas de redação que aumentam aderência, alinhadas à literatura médica:
- Regra imperativa verificável: *"Campo sem fonte legível no input = `null` + flag `[SEM_FONTE]`. NUNCA inferir, estimar ou preencher valor ausente. Não há exceção."* A literatura (medRxiv, arXiv) confirma que LLMs fabricam *"invented numeric values (labs/vitals/doses)"* — sua regra deve nomear explicitamente esses casos.
- Exigir *qualifying language* e citação de fonte: respostas sem fonte legível devem declarar incerteza.
- **Importante**: para dados clínicos, esta regra é guia. Enforcement real de "não inventar" não é alcançável via CLAUDE.md; exige **validação determinística** (script/teste/hook PostToolUse que rejeita campos preenchidos sem fonte rastreável).

### Compliance LGPD / CFM 2.454/2026 (contexto regulatório confirmado)
- **Resolução CFM nº 2.454, de 11 de fevereiro de 2026**, publicada no DOU em 27/02/2026 (Edição 39, Seção 1, p.158; retificação 05/03/2026, Edição 43, p.91); *vacatio* de 180 dias → **vigência em 26/08/2026** (sistemas.cfm.org.br / portal.cfm.org.br).
- Núcleo da norma: **conselheiro federal Jeancarlo Cavalcante (coordenador da Comissão de IA do CFM e relator) — a norma assegura que "a palavra final sobre as decisões diagnósticas, terapêuticas e prognósticas sempre será do médico" e proíbe delegar à IA a comunicação de diagnósticos, prognósticos ou decisões terapêuticas** (portal.cfm.org.br, 27/02/2026). Exige registro em prontuário do uso de IA; privacy by design/by default; dados de saúde = sensíveis sob LGPD.
- Auditabilidade exigida: **o Anexo I, XIII da Res. CFM 2.454/2026 exige Avaliação de Impacto Algorítmico (AIA) — contínua/periódica, fiscalizada por CRM/CFM — distinta do RIPD (Art. 38 da LGPD, fiscalizado pela ANPD); o Art. 21 aplica a sistemas já em uso, sem período de carência** (DMS Advogados / Conjur, 30/03/2026). Trilha auditável: qual modelo/versão, o que foi aceito/editado/rejeitado.
- Para de-identificação antes de qualquer modelo em nuvem: é um **GATE técnico**, não sugestão. O CLAUDE.md declara a regra; a garantia vem de hook PreToolUse + permissions.deny + (idealmente) sandbox em WSL2 bloqueando egress.

### Templates e exemplos bem avaliados pela comunidade
- **josix/awesome-claude-md — "Browse 108 curated examples of high-quality CLAUDE.md files from open source projects" (josix.github.io/awesome-claude-md); repositório com 432 stars e 154 commits no GitHub.** Também: **abhishekray07/claude-md-templates** e **cloudflare/templates/CLAUDE.md** (monorepo real). HumanLayer (<60 linhas) é o benchmark de concisão.
- O que os torna bons: imperativo direto; comandos verificáveis (build/test/lint exatos); arquitetura "at a glance"; referência a docs em vez de duplicar; ausência de personalidade inútil e de segredos.
- **Supabase**: a Supabase publicou *Postgres Best Practices* como Agent Skills (`github.com/supabase/agent-skills`) — formato aberto que funciona com Claude Code. Regras-chave para seu stack: usar `app_metadata` (não `user_metadata`) em claims RLS; SELECT policies com USING (sem WITH CHECK), INSERT com WITH CHECK (sem USING), UPDATE com ambos, DELETE com USING; **separar 4 policies (não FOR ALL)**; migrations nomeadas `YYYYMMDDHHmmss_desc.sql`, SQL em lowercase, comentários em comandos destrutivos; **SEMPRE habilitar RLS em toda tabela**; regenerar tipos TS após mudança de schema; MCP Supabase com `read_only=true` para produção.

---

## Recommendations (Decisões CONCRETAS para seus três arquivos)

### Decisão transversal (PRIORIDADE MÁXIMA): mude a topologia de execução
Antes de escrever os três arquivos, decida a camada de execução. No **Windows nativo você não tem garantia de SO** contra vazamento de PHI. Em estágios:
1. **Imediato**: instale Git for Windows (para hooks bash funcionarem) e configure `permissions.deny` + hooks PreToolUse (abaixo). Best-effort, mas captura os caminhos comuns.
2. **Curto prazo (recomendado para PHI)**: migre o Claude Code para **WSL2** e habilite o sandbox via `managed-settings.json`. Aponte o plugin JetBrains para o WSL2 (comando `wsl -d Ubuntu -- bash -lic "claude"`). Essa é a única barreira de SO real.
3. **Benchmark que muda a decisão**: se você algum dia processar PHI real (não só dados sintéticos/de-identificados) através do Claude Code, WSL2+sandbox deixa de ser opcional e vira **obrigatório** por compliance (LGPD Art. 12; CFM 2.454/2026, vigente 26/08/2026).

### Arquivo 1 — GLOBAL (`~/.claude/CLAUDE.md`), alvo ~50-80 linhas
Coloque APENAS o universal a todos os projetos:
- **Persona/tom** (verificável): respostas diretas, sem preâmbulo/emojis, português técnico, no máximo 1 frase de contexto antes da conclusão.
- **Formato de raciocínio CoD**: *"Para tarefas com decisão clínica ou de arquitetura, raciocine em rascunho mínimo: ≤5 palavras por passo. Conclusão após `####`."* + 1 exemplo curto (few-shot).
- **Formato de saída fixo**: bloco isolado ao final `CONDUTA FINAL:` seguido de `[ APROVAR ]` / `[ NEGAR E REFAZER ]`. Dê o exemplo literal do bloco.
- **Doutrina ZERO ALUCINAÇÃO** (com `IMPORTANT:`): campo sem fonte legível = `null`/`[SEM_FONTE]`, nunca inventar valores (labs/vitais/doses).
- **Regra anti-iatrogênica de arquivos** (com `YOU MUST`): mover nunca apagar; itens ambíguos → quarentena (`_quarentena/`); backup/commit antes de operações destrutivas.
- **Lembrete de compliance PHI** (sabendo que é só lembrete): *"NUNCA gravar dados de paciente (PHI) em arquivo, log, commit ou nuvem. De-identificar antes de qualquer modelo em nuvem. O enforcement real está em permissions/hooks."*
- Preferências de tooling: JetBrains (WebStorm/PyCharm/DataGrip); stack padrão.
- **NÃO** coloque: regras de um projeto específico, segredos, comandos de build de um repo.
- Reserve `IMPORTANT`/`YOU MUST` para no máximo **2 regras** (PHI e anti-alucinação) — o excesso dilui o sinal.

### Arquivo 2 — POR-PROJETO (template `./CLAUDE.md`), alvo <150 linhas + `.claude/rules/`
Estrutura como índice enxuto:
- **Descrição** (3-5 bullets): ex. *"Dashboard gestão de leitos UTI, escore SOFA. React+Vite+TS+Supabase."*
- **Comandos verificáveis**: build/test/lint/typecheck exatos.
- **Arquitetura at a glance**: pastas principais; referência a docs (não duplicar).
- **Regras "sempre faça X"**: ex. *"Rodar `npm run typecheck` antes de commit"*; *"Regenerar tipos TS após mudança de schema Supabase"*.
- **Imports**: `@docs/architecture.md` só se realmente necessário (consome contexto no launch).
- Mova o detalhe Supabase para **`.claude/rules/supabase.md` com `paths: ["supabase/**", "src/**/*.sql"]`** (path-scoped, carrega só quando relevante): RLS (USING/WITH CHECK por operação, `app_metadata`, RLS sempre on, 4 policies separadas), migrations (naming, lowercase, comentários destrutivos, MCP read_only em prod), edge functions (Deno, Web APIs, `_shared`).
- **Atenção**: regra que precisa sobreviver ao /compact **não** pode ficar em path-scoped rule — coloque no project-root CLAUDE.md.
- Para o sistema pessoal de IA e o controle financeiro de plantão: templates separados reusando o mesmo esqueleto.

### Arquivo 3 — MEMÓRIA MANUAL PERSISTENTE
- **Separe da auto memory**: a auto memory que o Claude escreve fica em `~/.claude/projects/<projeto>/memory/MEMORY.md` (não edite para semear; cure via `/memory`, removendo entradas erradas/stale). Sua memória manual deve ser um arquivo SEU, importado.
- **Como semear sem conflito**: crie `~/.claude/memory/general.md` (convenções cross-project) e importe no global via `@~/.claude/memory/general.md`. Para memória por-projeto que sobrevive a worktrees, importe de home (não use CLAUDE.local.md, que só existe num worktree).
- **Curadoria**: revisão trimestral; remova do CLAUDE.md o que a auto memory já capturou (evita duplicação); rode `/memory` para ver o que está carregado.
- **Não conflitar**: a auto memory é per-repo e gerida pelo Claude; sua memória manual é declarativa (decisões de arquitetura, padrões estáveis). Se divergirem, sua instrução manual (CLAUDE.md/import) tem prioridade de aderência na prática.

### Enforcement técnico que você DEVE adicionar (fora dos 3 arquivos)
- `.claude/settings.json` (ou managed) com `permissions.deny`: `Read(./.env)`, `Read(./secrets/**)`, deny em `Bash(curl *)`, `Bash(wget *)`, e nos diretórios/padrões de PHI. Allow-list WebFetch só para domínios necessários.
- **PreToolUse hook** (PowerShell no Windows nativo, ou bash em WSL2) que: bloqueia Write/Edit/Bash quando path/conteúdo casa padrões de PHI; bloqueia egress não-aprovado; loga tentativas para auditoria (atende a exigência de trilha auditável/AIA da CFM 2.454).
- **PostToolUse hook**: validador anti-alucinação (rejeita output com campos preenchidos sem fonte) e auto-format/lint.
- Se migrar para WSL2: sandbox com `denyRead` em PHI/credenciais e `allowManagedDomainsOnly`.

---

## Caveats
- **Divergência doc oficial vs comunidade — profundidade de import**: a doc oficial atual diz *"maximum depth of four hops"*; muitas fontes da comunidade dizem 5. Confie na doc (4) e teste.
- **Divergência — tamanho**: doc oficial diz <200 linhas; HumanLayer e parte da comunidade defendem <60-80. Não há número oficial rígido; **menos é mais**.
- **"~70% de aderência ao CLAUDE.md" / "100% com hooks"**: amplamente citado (DataCamp, shareuhack), mas **NÃO é número oficial da Anthropic** — heurística, não fato. O fato oficial é qualitativo: *"no guarantee of strict compliance"*.
- **Regras que você quer "garantidas" mas o CLAUDE.md NÃO garante**: (a) bloqueio de PHI em arquivo/log/commit/nuvem → permissions.deny + PreToolUse hook + sandbox(WSL2); (b) de-identificação obrigatória antes de nuvem → hook + egress control; (c) "nunca apagar, só mover" → PreToolUse hook bloqueando rm/delete; (d) formato de saída sempre presente → reforço via Stop hook/output style. CLAUDE.md sozinho é **sugestão** para todas elas.
- **Windows nativo**: sandbox indisponível é limitação oficial confirmada, não opcional. Sem WSL2/container, não há garantia de SO contra subprocessos que leem/escrevem PHI.
- **Auto memory**: rollout gradual; confirme `claude --version ≥ 2.1.59`.
- **Datas/versões**: o path do managed-settings mudou na v2.1.75 (Windows). Verifique sua versão antes de aplicar paths.

---

### Fontes-âncora por categoria
- **(a) Oficial Anthropic**: `code.claude.com/docs/en/memory`, `/hooks`, `/permissions`, `/sandboxing`, `/skills`, `/context-window`, `/settings`, `/jetbrains`, `/best-practices`; `anthropic.com/engineering/effective-context-engineering-for-ai-agents`; `anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills`; PDF "How Anthropic teams use Claude Code".
- **(b) Praticantes/comunidade**: HumanLayer ("Writing a good CLAUDE.md"), Bijit Ghosh (Medium), José Parreño García (Substack), hidekazu-konishi, TurboDocx, obra/superpowers + using-superpowers, josix/awesome-claude-md, abhishekray07/claude-md-templates, cloudflare/templates, Supabase Agent Skills.
- **(c) Regulatório/acadêmico**: Res. CFM 2.454/2026 (sistemas.cfm.org.br, portal.cfm.org.br, Conjur/DMS); Chain of Draft (arXiv:2502.18600); literatura de hallucination clínica (medRxiv, arXiv, NIH PMC).