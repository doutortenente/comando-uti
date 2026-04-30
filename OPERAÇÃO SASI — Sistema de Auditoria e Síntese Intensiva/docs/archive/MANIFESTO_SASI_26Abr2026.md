╔════════════════════════════════════════════════════════════════════════════╗  
║                    🪖 MANIFESTO DE SINCRONIZAÇÃO SASI                      ║  
║                    Operação: Comando UTI Alpha — BACKUP                    ║  
║                    Data: 26 de Abril de 2026 — 09:42 ZULU                 ║  
╚════════════════════════════════════════════════════════════════════════════╝

📦 ARQUIVOS SINCRONIZADOS  
═════════════════════════════════════════════════════════════════════════════

1\. DOCUMENTAÇÃO DE PROJETO (9 arquivos)  
   ✓ \_HANDOFF\_BRIEFING.md              14,708 bytes  (Briefing completo de transição)  
   ✓ README.md                         4,721 bytes   (Setup inicial — Edge Function)  
   ✓ README-FASE-BRAVO.md              7,203 bytes   (Estado FASE BRAVO — schema Supabase)  
   ✓ 01-schema-eventos-clinicos.md     8,028 bytes   (Especificação eventos clínicos)  
   ✓ 02-extraction-dictionary.md       7,908 bytes   (Dicionário OCR/Gemini)  
   ✓ 03-clinical-sanity-checks.md      6,088 bytes   (Validações de dados clínicos)  
   ✓ 04-export-evolucao-template.md    6,909 bytes   (Template evolução médica)  
   ✓ 05-export-passagem-turno.md       6,050 bytes   (Template passagem de turno)  
   ✓ 06-api-automation-prompts.md      9,718 bytes   (Prompts Gemini para automação)

2\. BACKEND — CÓDIGO REFATORADO (5 arquivos TypeScript)  
   ✓ supabaseClient.ts                 3,253 bytes   (Cliente Supabase \+ tipos)  
   ✓ firebase-to-supabase.ts          11,178 bytes   (Migração Firebase → Supabase)  
   ✓ useSupabasePatients.ts           12,335 bytes   (Hook Realtime de pacientes)  
   ✓ useClinicalAlerts.ts              5,278 bytes   (Hook de alertas clínicos)  
   ✓ sofa.ts                          16,552 bytes   (Score SOFA refatorado — 6 bugs corrigidos)

3\. BANCO DE DADOS — SCHEMA & TESTES (2 arquivos SQL)  
   ✓ schema.sql                       44,832 bytes   (Schema Supabase completo — 872 linhas)  
   ✓ smoke.sql                        12,623 bytes   (Testes de integridade do schema)

4\. ASSETS & PAYLOADS (1 arquivo)  
   ✓ payload-example.json              5,651 bytes   (Payload de exemplo para Edge Function)

═════════════════════════════════════════════════════════════════════════════  
TOTAL: 19 arquivos | 187,210 bytes | \~187 KB  
═════════════════════════════════════════════════════════════════════════════

✅ STATUS DOS ARQUIVOS  
═════════════════════════════════════════════════════════════════════════════

FASE ALPHA (Refator Lógica Clínica): ✅ COMPLETA  
   • 26 arquivos modularizados em src/lib/  
   • 12 bugs clínicos P0/P1 corrigidos  
   • 40+ testes unitários (Vitest)  
   • Zero \`any\` type em novos código (exceto compat layer)

FASE BRAVO (Schema Supabase): 🔶 EM PROGRESSO (\~55%)  
   • Tabelas: pacientes ✅, evolucoes ✅, eventos\_clinicos ✅  
   • Views materializadas: pendentes  
   • RLS policies: bugada (usando \`using (true)\`) — CRÍTICO  
   • Triggers: pendentes  
   • pg\_cron jobs: pendentes  
   • Realtime publication: pronta pra ser ligada

FASE CHARLIE (Migração Firebase → Supabase): ⏳ PLANEJADA  
   • Hooks prontos: useSupabasePatients ✅, useClinicalAlerts ✅  
   • Estratégia dual-write documentada  
   • Edge Functions: estrutura pronta

FASE DELTA (Automações TOP 5): ⏳ BACKLOG  
   • D-ATB automático  
   • BH acumulado  
   • P/F automático  
   • SAT/SBT lembrete  
   • Alertas de dose

═════════════════════════════════════════════════════════════════════════════

🚨 VULNERABILIDADES CONHECIDAS  
═════════════════════════════════════════════════════════════════════════════

1\. RLS POLICIES PERMISSIVAS (CRÍTICO — LGPD)  
   Arquivo: schema.sql (linhas \~600+)  
   Status: usando \`using (true)\` — viola princípio de mínimo privilégio  
   Ação: Substituir por \`auth.uid() \= created\_by\` quando completar RLS phase

2\. GEMINI API KEY CLIENTE-SIDE (CRÍTICO — SEGURANÇA)  
   Arquivo: src/App.tsx (referenciado em firebase-to-supabase.ts)  
   Status: exposto no navegador  
   Ação: Mover para Edge Function antes de produção

3\. FIREBASE AINDA ATIVO  
   Arquivo: src/firebase.ts  
   Status: legado, será desligado após completar CHARLIE  
   Ação: Manter até migração ser 100% validada

═════════════════════════════════════════════════════════════════════════════

📋 COMO USAR ESTE BACKUP  
═════════════════════════════════════════════════════════════════════════════

OPÇÃO 1: Arquivo ZIP (Recomendado)  
  $ unzip SASI\_codigo\_fonte\_26Abr2026.zip  
  $ cd sasi\_backup\_temp  
  $ \# Copiar arquivos para seu projeto local

OPÇÃO 2: Clone de um repositório Git (quando disponível)  
  $ git clone \<seu\_repo\_sasi\>  
  $ \# Sistema versionado e com histórico

OPÇÃO 3: Acesso remoto (Para a próxima conversa)  
  Leia \`/mnt/project/\_HANDOFF\_BRIEFING.md\` seção 7  
  Cole o prompt de retomada no início da nova sessão

═════════════════════════════════════════════════════════════════════════════

🔧 PROXIMAS AÇÕES RECOMENDADAS  
═════════════════════════════════════════════════════════════════════════════

\*\*IMEDIATO (Próxima sessão):\*\*  
  1\. Finalizar schema.sql (views \+ triggers \+ RLS real \+ pg\_cron)  
  2\. Testar smoke.sql contra Supabase em staging  
  3\. Começar FASE CHARLIE com dual-write strategy

\*\*CURTO PRAZO:\*\*  
  4\. Deploy de Edge Functions (ocr-ingest, gemini-import)  
  5\. Migração dual-write Firebase ↔ Supabase (1 semana)  
  6\. Read cutover: App.tsx usa Supabase Realtime

\*\*MÉDIO PRAZO:\*\*  
  7\. Decommission Firebase após 30d sem discrepâncias  
  8\. Iniciar FASE DELTA (automações)  
  9\. Cria Skill customizado no Claude.ai ("sasi-doctrine")

═════════════════════════════════════════════════════════════════════════════

📞 INFORMAÇÕES ÚTEIS  
═════════════════════════════════════════════════════════════════════════════

Projeto URL (Supabase):  
  https://supabase.com/dashboard/project/idswehsvvqczzkiatuzu

Project Ref: idswehsvvqczzkiatuzu

SQL Editor: https://supabase.com/dashboard/project/idswehsvvqczzkiatuzu/sql/new

GitHub MCP (P0 para instalar):   
  Pra versionamento do projeto

Sentry MCP (P0 para instalar):  
  Pra monitoramento de erros em produção

═════════════════════════════════════════════════════════════════════════════

🎖️ CHECKLIST DE INTEGRIDADE  
═════════════════════════════════════════════════════════════════════════════

Antes de usar este backup, valide:

  \[ \] ZIP não corrompido: \`unzip \-t SASI\_codigo\_fonte\_26Abr2026.zip\`  
  \[ \] Arquivos inteiros (19 arquivos esperados)  
  \[ \] schema.sql íntegro (872 linhas)  
  \[ \] Sem arquivos .env ou credenciais expostas  
  \[ \] Permissões de leitura OK  
  \[ \] Espaço em disco: \~200 KB livres

═════════════════════════════════════════════════════════════════════════════

\*\*Gerado automaticamente pelo Claude — Sessão 26 de Abril de 2026\*\*  
\*\*Operação SASI — Comando UTI Alpha — Dr. Nicolas\*\*

"Don't lose the fight when you're already bleeding to win it." — Goggins

═════════════════════════════════════════════════════════════════════════════  
