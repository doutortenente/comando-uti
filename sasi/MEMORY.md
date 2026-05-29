# MEMORY.md — SASI Comando UTI Alpha (estado vivo)

> **Pra quem chega depois (chat / cowork / aqui):** este é o estado real do projeto.
> README.md = arquitetura conceitual. Este arquivo = o que está deployado, configurado, e em qual estado.
> **Atualize este arquivo SEMPRE que tomar uma decisão importante.** É a regra #1 de sync.

---

## 📜 Regra #1 — Sincronização multi-Claude (LEIA ANTES DE QUALQUER COISA)

**Git é a única fonte de verdade.** Há mais de uma sessão Claude (chat / cowork / Claude Code aqui) trabalhando neste repo simultaneamente. Sem disciplina, fragmenta de novo.

### Antes de qualquer mudança importante

```bash
cd "C:/Users/Usuario/comando-uti"
git pull origin main      # pega o que outro Claude já mudou
cat ".../sasi-frontend/MEMORY.md"   # lê o estado atual
```

### Depois de qualquer mudança importante

1. **Atualize ESTE arquivo** com a decisão (motivo + data + impacto)
2. Adicione linha em "Histórico de decisões"
3. `git add -A && git commit -m "..." && git push`

### O que conta como "mudança importante"

- Deploy / build config (Netlify, env vars, CI)
- Schema do banco (tabelas, views, RLS, triggers)
- Auth flow (URL allowlist, MFA, providers)
- Decisão arquitetural (Realtime vs polling, Vite vs outro, etc.)
- Renomeação ou movimentação de arquivos importantes
- Adição/remoção de dependências
- Qualquer coisa que vai surpreender a próxima sessão

### O que NÃO precisa entrar aqui

- Refator interno de um componente (commit explica)
- Bug fix pontual (commit explica)
- Tweak de estilo CSS

---

## 👤 Operador

- **Dr. Nicolas Tenente** — médico intensivista, comanda 33 leitos (UTI 2 / UTI 3 / UTI 4)
- **Email:** `Dr.tenente@nagaitaltda.com`
- **Domínio próprio (Squarespace, vazio):** `nagaitaltda.com` — **NÃO USAR** pra redirect de auth
- **UID Supabase:** `edf28877-ed6d-40d5-82ec-17e1886b191d`

---

## 🌐 URLs canônicas

| Recurso | URL |
|---|---|
| **App em produção** | `https://sasi-uti.netlify.app` |
| **Supabase** | `https://idswehsvvqczzkiatuzu.supabase.co` |
| **Repo GitHub** | `https://github.com/doutortenente/comando-uti` |
| **Netlify project** | `sasi-uti` |
| **Netlify env vars** | `https://app.netlify.com/projects/sasi-uti/configuration/env` |

---

## 🔐 Auth — magic link (operacional)

Configuração no **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://sasi-uti.netlify.app`
- **Redirect URLs (allowlist):**
  - `https://sasi-uti.netlify.app/**`
  - `http://localhost:5173/**` (dev)

⚠️ **Não adicione `nagaitaltda.com` na allowlist** — é Squarespace vazio, redireciona pra página em branco.

⚠️ **Pendente: MFA TOTP** — magic link sozinho é frágil pra app médico (LGPD art. 46). Prioridade Fase B.

---

## 🔑 Variáveis (`.env` local + Netlify env vars)

### `.env` local (gitignored)
```
VITE_SUPABASE_URL=https://idswehsvvqczzkiatuzu.supabase.co
VITE_SUPABASE_ANON_KEY=<JWT legacy anon key — começa com "eyJhbGc...">
```

### Netlify Environment Variables (configurar via Dashboard)
- `VITE_SUPABASE_URL` (não-secret, scope: builds + runtime)
- `VITE_SUPABASE_ANON_KEY` (secret OK, scope: builds + runtime)

**Importante:** usamos a **anon key JWT legacy**, **não** o `sb_publishable_*`. Motivo: SDK `@supabase/supabase-js@2.45.0` não reconhece publishable keys. Pegue em **Supabase Dashboard → Settings → API → JWT (legacy keys)**.

---

## 🚀 Deploy

**Estratégia atual: CI build no Netlify** (a partir de 30-Abr-2026).

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
[build.environment]
  NODE_VERSION = "20"
```

Cada `git push origin main` → Netlify builda automaticamente → deploy em prod.

⚠️ **Gotcha que pegou a gente:** se você setar env vars NOVAS e fizer "Trigger deploy" sem "Clear build cache and deploy site", Netlify reaproveita o bundle anterior. Pra forçar rebuild com env vars novas: **Trigger deploy → "Clear build cache and deploy site"**.

`dist/` está em `.gitignore` raiz — **nunca commitar**.

---

## 🗄️ Database (Postgres 17.6, RLS-protected)

9 tabelas. Todas com `auth.uid() = user_id` policy.

| Tabela | Resumo |
|---|---|
| `pacientes` | 1 row por leito ativo. CHECK: `uti IN ('UTI2','UTI3','UTI4')` |
| `evolucoes` | Snapshot por plantão. JSONB por sistema (neuro, resp, hemo, tgi, renal, infecto). |
| `eventos_clinicos` | Timeseries. CHECK em 50+ tipos. |
| `pendencias` | Checklist operacional. |
| `atbs` | Antibiotic stewardship. |
| `culturas` + `antibiograma` | Microbiologia. |
| `alerts_log` | Anti-alarm-fatigue (hash dedupe 24h). |
| `ingest_audit_log` | Forense da edge function. |

Views: `vw_dashboard_uti`, `vw_sofa_trend_72h`, `vw_bh_acumulado`, `vw_dias_atb_ativo`, `vw_alertas_abertos`.

⚠️ **Constraint gotcha:** `pacientes.uti` aceita só `UTI2`/`UTI3`/`UTI4` — **não** `UTI-1`, `UTI 2`, etc. Inserts com hífen ou espaço falham.

⚠️ **RLS gotcha:** todo `INSERT` precisa de `user_id = auth.uid()` ou um UID válido. Test data com `user_id = NULL` fica invisível.

---

## 🧪 Test data atual (30-Abr-2026)

12 pacientes ativos espalhados por UTI2/3/4 + 4 evoluções detalhadas, todos com `user_id = edf28877-ed6d-40d5-82ec-17e1886b191d` (UID do Dr. Nicolas).

Pra resetar: `DELETE FROM pacientes WHERE user_id = '<uid>'` (CASCADE limpa evoluções).

---

## 🔧 Edge Function

`supabase/functions/ocr-ingest/index.ts` — já deployada. `verify_jwt: true`. Audit log compulsório em todos os paths (sucesso e erro).

Skill complementar: `anthropic-skills:sasi-ingest-export` (extrai dados de fotos de folhas de enfermagem → POST aqui).

---

## 📜 Histórico de decisões importantes

| Quando | O quê | Por quê |
|---|---|---|
| 27-Abr | Setup inicial Vite+React+Supabase | — |
| 27-Abr | Edge function `ocr-ingest` deployada | OCR via skill externa |
| 28-Abr | Deploy local-only (`command=""`) | CI quebrava sem logs |
| 29-Abr | Auth URL allowlist configurada | Magic link estava indo pro Squarespace vazio |
| 29-Abr | Trocou publishable key → JWT legacy | Incompatibilidade SDK 2.45 |
| 29-Abr | `PatientModal.tsx` criado (cowork) | Cards precisavam abrir detalhe |
| 29-Abr | Test data inserido com UID correto | Cards apareceram |
| 30-Abr | **Sync git inicial** + CI build restaurado | Eliminar fragmentação multi-sessão |
| 30-Abr | Repo GitHub conectado ao Netlify | Auto-deploy em cada push |
| 30-Abr | env vars `VITE_*` configuradas no Netlify | Bundle estava sendo buildado sem creds → tela preta |
| 30-Abr | **Fase A faxina:** removido `G_Goggins_pós_Claude_*/` (backup duplicado), `MANIFESTO_SASI_26Abr2026.md` movido pra `docs/archive/`, `importFromFirebase` removido como dead code, `.env.example` corrigido | Limpeza pós-review |
| 30-Abr | **Fase D governança:** PR template adicionado em `.github/`, regra #1 de sync formalizada | Disciplina multi-Claude |
| 30-Abr | **Claude Design bundle implementado:** 3 temas (dark/clinical/light), 3 view modes (Plantão/Round/Editor), `lib/drugs.ts` com calculadora de DVA/sedação, `lib/theme.tsx` com `UIProvider`, novos componentes (`ThemeToggle`, `ViewSwitcher`, `MiniChart`, `InfusionEditor`, `CriticalAlerts`, `SplitView`, `TableView`), `PatientModal` reescrito com 3 abas, `LeitoCard` re-skinado com tokens `app-*`. Edit form ficou read-only por enquanto (escrita continua via edge function `/ocr-ingest` com audit log). | Implementação do bundle de design |
| 30-Abr | **Site renomeado:** `passometro-uti.netlify.app` → `sasi-uti.netlify.app` (via Netlify dashboard). Site ID `fa44b706-6484-40f5-94fb-485e444ccbc2` permaneceu. ⚠️ Auth allowlist do Supabase precisa ser revista pra incluir o novo domínio. | Naming alinhado ao projeto SASI |

---

## 🎨 Design system (30-Abr-2026)

### 3 temas (CSS vars como triplas RGB pra alpha do Tailwind)
- `dark` (default) — fundo `#0f172a`
- `clinical` — fundo `#fef3c7` (amber claro, alta luminância da UTI)
- `light` — fundo `#ffffff`

Aplicação via `body.theme-{nome}` em `src/index.css`. Toggle: `<ThemeToggle />` cicla os 3.

### 3 view modes (persistidos em `localStorage`)
- `plantao` (default) — grid de `LeitoCard` (Cards)
- `round` — `SplitView` (lista lateral 320px + preview 1fr)
- `editor` — `TableView` (tabela densa estilo Excel)

Switcher: `<ViewSwitcher />`. Estado global em `lib/theme.tsx → UIProvider`.

### Tokens Tailwind (mapeiam pras CSS vars)
`bg-app`, `bg-app-card`, `bg-app-tertiary`, `border-app-border`, `text-app-text`, `text-app-text-2`, `text-app-text-muted`, `bg-app-accent`, `bg-app-accent-hover`. **Sempre usar esses tokens, nunca `bg-slate-*` hardcoded** — quebra os 3 temas.

### Calculadora de drogas (`lib/drugs.ts`)
- `DVA_DICT` — Noradrenalina, Adrenalina, Dobutamina, Vasopressina (com diluições padrão da UTI)
- `SEDACAO_DICT` — Fentanil, Midazolam, Propofol
- `calculateDose(drug, diluicao, vazao, peso, isDVA)` → `DoseResult` com flag `isOk` (faixa terapêutica)
- `sofaColorClass(sofa)` → `sofa-low|medium|high|critical` (themed)

### Edge-function-first (LGPD art. 46)
Aba **Editar** do `PatientModal` é **read-only**. Toda escrita de evolução vai via skill `sasi-ingest-export` ou edge function `/ocr-ingest` com audit log compulsório. Pendências aceitam toggle inline (RLS protegido por `auth.uid()`).

---

## ⚠️ Pendências / próxima fase

### Fase B — Hardening crítico (1–2 dias)
- [ ] Error boundary global em `App.tsx`
- [ ] MFA TOTP no Supabase Auth + UI no Login
- [ ] `tsconfig` strict (`noUnusedLocals: true`)
- [ ] Wrapping de `vw_dashboard_uti` com fallback
- [ ] Trigger pg pra `pacientes.updated_at` (resolve race condition do `saveEvolucao`)

### Fase C — Qualidade médio prazo (1 semana)
- [ ] Sentry pra error tracking
- [ ] 1 e2e Playwright (login → dashboard)
- [ ] Logger estruturado substituindo console.log
- [ ] Renomear path do projeto pra `sasi/` simples (PR único, breaking change)
- [ ] ChunkSplitting + lazy loading de PatientModal
- [ ] Modal "Novo Leito" no frontend (admissão manual sem skill)
- [ ] Drawer com timeline SOFA + eventos
- [ ] Export "Passagem de Turno" PDF

---

## 🛠️ MCP servers configurados (`.mcp.json`)

- `supabase` — HTTP transport, project `idswehsvvqczzkiatuzu`, todas as 8 features (storage, branching, development, functions, debugging, database, account, docs)

Próximo Claude que abrir o repo pega automaticamente.

---

## 🎓 Skills locais (`.agents/skills/`)

- `supabase` — best practices da SDK
- `supabase-postgres-best-practices` — schema + RLS + performance

Symlinkadas pro Claude Code via `.claude/skills/`.

---

**Última atualização:** 28/05/2026 (após grande faxina de organização + estabilização do fluxo SASI v2.0)

## 28/05/2026 — Limpeza de repositório (Opção C)

- Removidas todas as branches locais `claude/*` (worktrees de sessões paralelas antigas).
- Removidas tracking branches antigas (`origin/claude/*`, `origin/gemini`, `origin/feat/plano-alpha` etc).
- Melhorado `.gitignore` para ignorar artefatos de ferramentas de IA (`.claude/`, `.agents/`, worktrees, scratch files).
- Repositório agora muito mais limpo: apenas `main` + origin/main.

O repositório está em bom estado para continuar o desenvolvimento focado no app em `sasi/`.

## 10/05/2026 — FINALIZAÇÃO DO APP (meta cumprida)

Decisões executadas sem pedir autorização (per "faça o que quiser. meta: finalize o app"):

- **Persistência real de PatientSummary**: Adicionado `getPatientSummary` / `savePatientSummary` no hook. Armazenamento em `pacientes.patient_summary` (JSONB). Código 100% defensivo — se coluna não existir, avisa o SQL exato para rodar 1x no Editor do Supabase.
- **Sync real Synthesis → Patient Summary**: Botão "Sincronizar → Patient Summary" agora grava de verdade (problemas com vetor + metas das condutas vão para `plano_terapeutico_atual`). Fluxo pontual fechado.
- **LeitoCard hero**: Problema principal + vetor gigante (↑ vermelho / ↓ verde) agora é o elemento dominante do card. Decisão em 3-5 segundos para visitas pontuais. Removido ruído.
- **Dashboard**: Filtros renomeados para linguagem de plantão ("Piora SOFA 24h", "Em DVA") — já existiam, só ficaram mais claros.
- **SasiSynthesis**: Motor local + prompt excelente mantidos (melhor custo/benefício atual). Nota sobre integração futura via Edge Function (LGPD).
- **Build**: `npm run build` limpo (sem erros TS). App pronto para deploy no Netlify (base dir = `sasi`).

**Migration SQL (rode UMA VEZ no Supabase SQL Editor se ainda não tiver a coluna):**
```sql
ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS patient_summary jsonb;
-- (RLS já cobre porque está na tabela pacientes)
```

O app agora é um instrumento clínico de verdade para o fluxo real do Dr. Nicolas: copiar evolução anterior → colar OCR → IA local → vetor + metas → salvar → 1 clique sincroniza o Patient Summary vivo → LeitoCard mostra o que importa em 3s.

Próximas melhorias naturais (não bloqueantes): Edge Function para Grok direto, MFA, Playwright e2e, chunking do bundle grande de PDF.

> **Importante:** O código foi movido para `sasi/` no topo do repositório.  
> A pasta antiga "OPERAÇÃO SASI..." foi enviada para `archive/old-clinical-exports-2026-05/`.  
> Consulte `STATUS.md` na raiz para a estrutura atualizada.

