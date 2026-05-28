# archive/ — Histórico e Bagunça Organizada

Esta pasta foi criada durante a **grande faxina de 09/05/2026**.

## O que está aqui

- `session-copies/` → Cópias completas do projeto geradas automaticamente por sessões de IA (Claude/Grok) com nomes aleatórios (elegant-hypatia, sweet-wing, etc.). Podem ser deletadas com segurança após revisão.
- `legacy-firebase/` → Todas as antigas codebases Firebase (backend, genkit, etc.) que foram abandonadas após a migração total para Supabase.
- `design-prototypes/` → Protótipos HTML gerados por Gemini + arquivos de extração. Úteis apenas como referência histórica de design.
- `sensitive/` → Arquivos .docx contendo chaves e senhas (NUNCA versionar). Recomenda-se deletar após mover para gerenciador de senhas ou cofre seguro.
- `old-root-code/` → Código antigo do app monolítico (`src/App.jsx` etc.) + configs velhas da raiz.

## Por que não deletamos tudo?

- Preservação de histórico (git + contexto clínico em alguns exports).
- Reversibilidade — se algo der errado, está tudo aqui.

## Recomendação futura

Depois de 30-60 dias sem uso, a maior parte desta pasta pode ser deletada com segurança (exceto `sensitive/`, que deve ser destruída).

**Data da faxina:** 09/05/2026
**Responsável:** Grok (com autorização total do usuário)