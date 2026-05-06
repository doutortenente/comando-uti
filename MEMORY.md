# MEMORY.md — SASI (Sistema de Auditoria e Sintese Intensiva)

> Resumo do estado atual do projeto para continuidade por sessoes futuras de Claude.
> Ultima atualizacao: 2026-05-06 | Commit: `fc8cd75`

---

## 1. O que e o SASI

App web React + Supabase para gestao de UTI com 33 leitos (UTI2/3/4).
Desenvolvido pro Dr. Nicolas Tenente (intensivista).
**Deploy:** https://sasi-uti.netlify.app
**Repo:** github.com/doutortenente/comando-uti
**Branch:** `main`

---

## 2. Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18.3 + TypeScript + Vite 5 |
| Estilo | Tailwind CSS 3.4 (3 temas via CSS vars) |
| Backend | Supabase (Postgres 17.6, Auth, Realtime, RLS) |
| Deploy | Netlify (auto-deploy atualmente quebrado, trigger manual) |
| Icons | lucide-react |
| PDF | jspdf + jspdf-autotable (lazy-loaded) |

**Supabase project ref:** `idswehsvvqczzkiatuzu`

---

## 3. Estrutura de Arquivos (frontend)

```
OPERACAO SASI .../sasi-frontend/
  src/
    App.tsx                          # Root — auth bypass ativo (MOCK_SESSION)
    components/
      Dashboard.tsx                  # Sala de guerra — 3 view modes
      LeitoCard.tsx                  # Card individual do paciente
      PatientModal.tsx               # Ficha completa (3 abas: Detalhes/Editar/Evolucao)
      Login.tsx                      # Magic-link (DESABILITADO — nao renderiza)
      NovoLeitoModal.tsx             # Admissao manual de paciente
      TimelineDrawer.tsx             # Timeline de eventos clinicos
      SplitView.tsx                  # Modo Round (lista + preview)
      TableView.tsx                  # Modo Editor (tabela densa)
      InfusionEditor.tsx             # Calculadora de dose DVA/Sedacao
      MiniChart.tsx                  # Sparkline charts
      CriticalAlerts.tsx             # Banner de alertas criticos
      Skeletons.tsx                  # Loading placeholders + EmptyState
      ErrorBoundary.tsx              # Error boundary global
      ThemeToggle.tsx                # Botao de ciclar tema
      ViewSwitcher.tsx               # Botao de trocar view mode
    lib/
      supabaseClient.ts              # Client Supabase + tipos (Paciente, Evolucao, etc.)
      theme.tsx                      # UIProvider (3 temas, 3 view modes)
      drugs.ts                       # Dicionarios clinicos DVA/Sedacao + calculadora
      exportPDF.ts                   # Gera PDF passagem de turno (lazy-loaded)
      useKeyboardShortcuts.ts        # Hook de atalhos globais
      useToasts.tsx                  # ToastProvider + useToasts hook
    hooks/
      useSupabasePatients.ts         # Fetch dashboard + Realtime subscription
      useClinicalAlerts.ts           # Contagem de criticos/warnings
  supabase/
    migrations/
      01_initial_schema.sql          # Schema original (patients, clinical_parameters, etc.)
      02_pacientes_updated_at_trigger.sql  # Trigger auto-update updated_at
      03_dev_bypass_rls.sql          # Policies dev_bypass (TEMPORARIO)
```

---

## 4. Convencoes Obrigatorias

- **Tokens de tema:** `bg-app`, `bg-app-card`, `bg-app-tertiary`, `border-app-border`, `text-app-text`, `text-app-text-2`, `text-app-text-muted`, `bg-app-accent`, `bg-app-accent-hover`
- **NUNCA usar `bg-slate-*` hardcoded** — quebra os 3 temas (dark/clinical/light)
- **Animacoes:** `sasi-fade-in` (entrada), `sasi-critical-pulse` (criticos) — definidas em `src/index.css`
- **SOFA color:** `sofaColorClass(value)` de `src/lib/drugs.ts`
- **Gravidade badges:** classes `gravidade-{estavel|moderado|grave|critico|obito}` (themed)
- **Schema gotcha:** `pacientes.uti` aceita so `'UTI2'|'UTI3'|'UTI4'` (CHECK constraint)
- **Edge-function-first:** writes de evolucao vao via skill `sasi-ingest-export` ou edge function `/ocr-ingest`
- **tsconfig strict:** `noUnusedLocals: true`, `noUnusedParameters: true`

---

## 5. Estado da Autenticacao (CRITICO)

### Situacao atual: AUTH DESABILITADA

O hospital bloqueia Gmail, tornando magic-link inutilizavel. A auth foi desabilitada em `fc8cd75`:

1. **App.tsx** usa `MOCK_SESSION` (fallback se nao ha session real):
   - `user.id = '00000000-0000-0000-0000-000000000000'`
   - `user.email = 'dev@sasi-uti.local'`
   - Login.tsx NAO e renderizado

2. **Dashboard.tsx**: botao Logout oculto, header mostra "Modo dev - sem auth"

3. **Supabase RLS**: 9 policies `dev_bypass` com `USING (true)` em todas as tabelas:
   - pacientes, evolucoes, eventos_clinicos, pendencias, culturas, antibiograma, atbs, alerts_log, ingest_audit_log

### Para reativar auth:

1. Reverter App.tsx: remover MOCK_SESSION, restaurar `!session ? <Login /> : <Dashboard />`
2. Dropar policies: `DROP POLICY "dev_bypass" ON public.<tabela>;` (9 tabelas)
3. Restaurar import Login e botao Logout no Dashboard
4. SQL completo em `supabase/migrations/03_dev_bypass_rls.sql`

### Plano futuro de auth:

Documento completo no Google Drive: **"Plano de acao login e autenticacao SASI"**
- Item 1: Auth email+senha (signUp, signInWithPassword, resetPassword)
- Item 2: MFA TOTP (enroll + challenge via supabase.auth.mfa)
- Inclui: API calls, UI design, state machine, validacoes, checklist

---

## 6. Features Implementadas (todas em producao)

| # | Feature | Commit | Status |
|---|---------|--------|--------|
| 1 | 3 temas (dark/clinical/light) | `6020c0e` | OK |
| 2 | 3 view modes (plantao/round/editor) | `6020c0e` | OK |
| 3 | Calculadora de infusao (DVA + Sedacao) | `6020c0e` | OK |
| 4 | Error Boundary global | `327f318` | OK |
| 5 | Loading skeletons + empty states | `0cb1a2a` | OK |
| 6 | Modal Novo Leito (admissao manual) | `0cb1a2a` | OK |
| 7 | Toasts + realtime feedback | `0cb1a2a` | OK |
| 8 | Atalhos de teclado globais | `0cb1a2a` | OK |
| 9 | Drawer Timeline (SOFA + eventos) | `0cb1a2a` | OK |
| 10 | Export PDF Passagem de Turno (lazy) | `0cb1a2a` | OK |
| 11 | tsconfig strict (noUnusedLocals/Params) | `ffb6523` | OK |
| 12 | Trigger pg updated_at | `ffb6523` | OK (aplicado em prod) |
| 13 | Auth bypass (mock session + dev_bypass RLS) | `fc8cd75` | OK (temporario) |

---

## 7. Pendencias e Backlog

### Prioridade CRITICA (bloqueiam uso real no hospital)

- [ ] **Auth email+senha** — signup/signin/reset password via Supabase Auth
  - Plano detalhado no Google Drive
  - Depende de: decidir se email confirmation sera required, configurar SMTP se sim
  - Ao implementar: remover MOCK_SESSION, dropar dev_bypass policies, restaurar Login.tsx

### Prioridade MEDIA

- [ ] **MFA TOTP** — 2FA opcional via Google Authenticator/Authy
  - Depende de: Item auth email+senha estar pronto
  - Criar: MFAEnroll.tsx, MFAChallenge.tsx
  - Plano detalhado no Google Drive (mesmo doc)

### Prioridade BAIXA

- [ ] **Netlify auto-deploy** — atualmente quebrado, requer trigger manual apos push
- [ ] **Git hygiene** — adicionar `.claude/worktrees/` e `skills-lock.json` ao `.gitignore`
- [ ] **Multi-tenant** — suporte a multiplos medicos com dados isolados (futuro)
- [ ] **OCR ingest mobile** — captura de foto de evolucao manuscrita via celular
- [ ] **Notificacoes push** — alertas de deterioracao clinica via browser notifications

---

## 8. Supabase Schema (tabelas principais)

| Tabela | Uso | RLS |
|--------|-----|-----|
| `pacientes` | Dados demograficos, HD, gravidade, status | `auth.uid() = user_id` + dev_bypass |
| `evolucoes` | Evolucoes por sistema (neuro, resp, hemo...) | via pacientes.user_id + dev_bypass |
| `eventos_clinicos` | Timeline (SOFA, lactato, PAM, etc.) | via pacientes.user_id + dev_bypass |
| `pendencias` | Tarefas pendentes por paciente | via pacientes.user_id + dev_bypass |
| `culturas` | Culturas microbiologicas | via pacientes.user_id + dev_bypass |
| `antibiograma` | Resultados de antibiograma | via culturas + dev_bypass |
| `atbs` | Antibioticos em uso | via pacientes.user_id + dev_bypass |
| `alerts_log` | Log de alertas clinicos | via pacientes.user_id + dev_bypass |
| `ingest_audit_log` | Audit trail LGPD | `auth.uid() = user_id` + dev_bypass |

**Trigger ativo:** `set_pacientes_updated_at` — auto-update `updated_at` em cada UPDATE de pacientes.

---

## 9. Docs no Google Drive

1. **"Plano de acao login e autenticacao SASI"** — instruções completas para implementar auth email+senha e MFA TOTP
2. **"SASI - Apresentacao para Equipe Medica"** — funcionalidades e guia de uso para enviar a colegas medicos

---

## 10. Resumo da Sessao Atual (2026-05-06)

### O que foi feito nesta sessao:

1. **Plano de acao auth** — criado Google Doc detalhado com API calls, UI design, state machine e checklist para implementar auth email+senha e MFA TOTP no futuro

2. **Auth desabilitada** — App.tsx modificado com MOCK_SESSION bypass, 9 policies dev_bypass no Supabase, botao logout oculto, Login.tsx preservado mas nao renderizado

3. **Doc de apresentacao** — criado Google Doc "SASI - Apresentacao para Equipe Medica" com funcionalidades e instrucoes de uso para enviar a colegas

4. **Este MEMORY.md** — estado completo do projeto para continuidade

### Commits desta sessao:
- `fc8cd75` — Disable auth temporarily (mock session + dev_bypass RLS)

### Sessao anterior (resumida):
- `0cb1a2a` — UX batch: skeletons, novo leito, toasts, atalhos, timeline, PDF export
- `ffb6523` — tsconfig strict + trigger updated_at
- `327f318` — Error Boundary global

---

## 11. Como comecar uma nova sessao

```bash
cd "C:\Users\Usuario\comando-uti"
cd "OPERACAO SASI — Sistema de Auditoria e Sintese Intensiva/sasi-frontend"
npm install
npm run typecheck   # deve dar 0 erros
npm run build       # deve dar build limpo
npm run dev         # dev server em http://localhost:5173
```

O app abre direto no Dashboard (sem login). Para ver dados, e preciso ter pacientes no Supabase.
