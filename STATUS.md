# STATUS — SASI (Sistema de Auditoria e Síntese Intensiva)
**Comando UTI Alpha — 33 leitos (UTI 2/3/4)**

**Data desta revisão:** 09/05/2026  
**Produção:** https://sasi-uti.netlify.app  
**Operador:** Dr. Nicolas Tenente (dr.tenente@nagaitaltda.com)  
**Supabase:** idswehsvvqczzkiatuzu (Postgres 17.6)

> **Este é o documento autoritativo de estado atual.**  
> Substitui / consolida os MEMORY.md anteriores.  
> Sempre atualize este arquivo em mudanças importantes de arquitetura, deploy, auth ou schema.

---

## 1. Stack e Arquitetura Atual

| Camada          | Tecnologia                                      | Observações |
|-----------------|--------------------------------------------------|-------------|
| Frontend        | React 18.3 + TypeScript + Vite 5                 | Código ativo em subpasta (ver seção 5) |
| Estilo          | Tailwind 3.4 + CSS vars (3 temas)                | Tokens `bg-app-*`, nunca `bg-slate-*` hardcoded |
| Backend         | Supabase (Postgres + Auth + Realtime + Edge Functions) | Zero Firebase em produção |
| Deploy          | Netlify (CI automático a partir de main)         | Base directory aponta para a pasta ativa do SASI |
| PDF             | jsPDF + jspdf-autotable (lazy)                   | Export de passagem de turno |
| Ícones          | lucide-react                                     | — |
| Edge Function   | `ocr-ingest` (já deployada, verify_jwt: true)    | Entrada obrigatória de evoluções via skill ou foto |

**Princípio arquitetural:**  
Escrita de evoluções **sempre via edge function ou skill** (`sasi-ingest-export`) com audit log obrigatório (`ingest_audit_log`). Edição manual no frontend é read-only ou limitada.

**3 Temas:** `dark` (padrão), `clinical` (âmbar alta luminância UTI), `light`.  
**3 Modos de visualização:** `plantão` (cards), `round` (SplitView), `editor` (tabela densa).

---

## 2. Estado da Autenticação (CRÍTICO)

**Situação atual (desde commit `fc8cd75` — 06/05/2026):**  
**Autenticação DESABILITADA temporariamente** para uso no hospital.

- App carrega direto no Dashboard usando `MOCK_SESSION` (user.id = `00000000-...`, email = `dev@sasi-uti.local`).
- Header mostra claramente **"Modo dev — sem auth"**.
- Botão de Logout oculto.
- Componente `Login.tsx` existe mas **não é renderizado**.
- 9 políticas RLS `dev_bypass` com `USING (true)` estão ativas em produção (ver migration `03_dev_bypass_rls.sql`).

**Motivo:** Hospital bloqueia Gmail → magic link não funciona para os médicos.

**Plano de reativação:**  
Documento completo no Google Drive: **"Plano de ação login e autenticação SASI"** (email+senha + MFA TOTP).

**Como reativar (resumo):**
1. Reverter `App.tsx` e `Dashboard.tsx` para fluxo real com `session`.
2. Dropar as 9 políticas `dev_bypass`.
3. Configurar provedor de email ou senha no Supabase Auth.
4. Atualizar allowlist de URLs (já inclui `sasi-uti.netlify.app/**` e `localhost:5173/**`).

**Risco LGPD:** Magic link sozinho é frágil para dado clínico sensível. MFA é prioridade Fase B.

---

## 3. Funcionalidades Implementadas (Produção)

| # | Funcionalidade                              | Commit     | Status     | Observação |
|---|---------------------------------------------|------------|------------|----------|
| 1 | 3 temas (dark/clinical/light) + tokens UI   | 6020c0e    | ✅ Ativo   | `lib/theme.tsx` |
| 2 | 3 modos de visualização (plantão/round/editor) | 6020c0e | ✅ Ativo   | Persistido em localStorage |
| 3 | Calculadora de infusão (DVA + Sedação)      | 6020c0e    | ✅ Ativo   | `lib/drugs.ts` + `InfusionEditor.tsx` |
| 4 | Error Boundary global                       | 327f318    | ✅ Ativo   | — |
| 5 | Skeletons + Empty States                    | 0cb1a2a    | ✅ Ativo   | — |
| 6 | Novo Leito (admissão manual)                | 0cb1a2a    | ✅ Ativo   | `NovoLeitoModal.tsx` |
| 7 | Toasts + feedback Realtime                  | 0cb1a2a    | ✅ Ativo   | — |
| 8 | Atalhos de teclado globais                  | 0cb1a2a    | ✅ Ativo   | — |
| 9 | Timeline Drawer (SOFA + eventos)            | 0cb1a2a    | ✅ Ativo   | `TimelineDrawer.tsx` |
|10 | Export PDF Passagem de Turno (lazy)         | 0cb1a2a    | ✅ Ativo   | `exportPDF.ts` |
|11 | tsconfig strict                             | ffb6523    | ✅ Ativo   | `noUnusedLocals/Params` |
|12 | Trigger `updated_at` no Postgres            | ffb6523    | ✅ Ativo   | — |
|13 | Auth bypass (mock + dev_bypass RLS)         | fc8cd75    | ✅ Ativo (temp) | — |
|14 | Redesign Gemini-style + FichaCompleta       | d8a648c + 760b52d | ✅ Ativo | Replica exata do protótipo Gemini (edição inline 7 sistemas) |
|15 | Sinais vitais + labs estruturados           | b3c82eb    | ✅ Ativo   | Import de planilhas Excel |
|16 | LeitoCard com border-l por gravidade        | c780f71    | ✅ Ativo   | — |
|17 | Plantão Board: shell Sidebar/TopBar/FiltersBar | e526bad | ✅ Ativo   | PR #12 |
|18 | View Pacientes (índice + página-prontuário) | 12/06/2026 | ✅ Ativo   | `PacientesIndex` + `PacientePage` (reusa FichaCompleta/TimelineDrawer); botão "Prontuário" no modal |

**Funcionalidades em destaque recentes (maio/2026):**  
- `FichaCompleta.tsx` — edição completa de todos os sistemas (neuro, resp, hemo, tgi, renal, hemato, infecto) + DVA/sedativos + impressão/conduta/pendências.  
- Export de passagem de turno com dados estruturados.

---

## 4. Schema Real em Produção vs Migrations Locais

**Schema em produção (Supabase):**
- 9 tabelas principais com RLS (`auth.uid() = user_id`):
  - `pacientes`, `evolucoes` (JSONB por sistema + `sofa_snapshot`), `eventos_clinicos`, `pendencias`, `atbs`, `culturas`, `antibiograma`, `alerts_log`, `ingest_audit_log`.
- 5 views `security_invoker`: `vw_dashboard_uti`, `vw_sofa_trend_72h`, `vw_bh_acumulado`, `vw_dias_atb_ativo`, `vw_alertas_abertos`.
- Constraint forte: `pacientes.uti IN ('UTI2','UTI3','UTI4')`.

**Migrations locais no repo (`supabase/migrations/`):**
- Contêm apenas o schema antigo de 4 tabelas (`patients`, `clinical_parameters`, `prescriptions`, `lab_results`) — **obsoleto**.
- Existe migration `03_dev_bypass_rls.sql` (usada no bypass de maio).

**Dívida:** As migrations do schema atual não estão versionadas no repositório. Risco de drift.

**Tipos TypeScript oficiais:** `src/lib/supabaseClient.ts` (da pasta ativa) — fonte da verdade para o frontend.

---

## 5. Mapa do Repositório (Maio 2026)

**Código ATIVO (fonte da verdade — usar este):**
```
sasi/                               ← NOVO LOCAL CANÔNICO (após faxina 09/05/2026)
├── src/
│   ├── App.tsx
│   ├── components/                 (FichaCompleta, Dashboard, LeitoCard, etc.)
│   ├── lib/                        (supabaseClient.ts, drugs.ts, theme.tsx...)
│   └── hooks/
├── netlify.toml
├── package.json
├── tsconfig.json (strict)
└── MEMORY.md
```

**Faxina realizada em 09/05/2026 (grande organização):**
- Código ativo extraído da pasta com nome gigante "OPERAÇÃO SASI..." → agora está limpo em `sasi/` no topo do repositório (maior vitória da faxina).
- Todas as duplicatas de sessão IA (elegant-*, sweet-*, friendly-*, compassionate-*, hopeful-*) movidas para `archive/session-copies/`.
- 6 codebases Firebase legadas movidas para `archive/legacy-firebase/`.
- Protótipos Gemini HTML + extrações movidas para `archive/design-prototypes/`.
- Arquivos de chaves/senhas (.docx) movidos para `archive/sensitive/`.
- Lixo antigo (`src/`, `public/`, configs velhas, pastas suspeitas) movido para `archive/`.
- `.gitignore` reforçado com seção "FAXINA 09/05/2026".
- Novo local canônico de desenvolvimento: `cd sasi && npm run dev`

**Estrutura final limpa (após faxina completa 09/05/2026):**
- `sasi/` → código ativo (único lugar que você deve trabalhar)
- `archive/` → todo o lixo histórico organizado (session-copies, legacy-firebase, design-prototypes, old-clinical-exports, sensitive)
- `supabase/` + `.github/` → mantidos na raiz
- Tudo mais (APPS_BETA, Tags, y, src antigo, dist, public, arquivos .docx de chaves, etc.) → deve ser deletado manualmente pelo usuário (ver seção "Ações Manuais Recomendadas" no final deste arquivo)

**⚠️ Arquivos sensíveis ainda na raiz (ação urgente):**
- `Chaves, Senhas e Acesso a Sistemas (Ficheiro Antigravity).docx`
- `Links e APIKEYs.docx`

Esses dois arquivos contêm credenciais. Delete-os imediatamente (eles já estão no .gitignore).

**Duplicatas de sessão (worktrees gerados por IA):**
- `sasi-frontend/elegant-hypatia-bb4773/`, `friendly-jones-cec0ec/`, `sweet-wing-572e9b/`, etc.
- Recomendação futura: mover para `.claude/worktrees/` ou `archive/`.

**Governança:**
- `.github/PULL_REQUEST_TEMPLATE.md` (excelente — exige update de STATUS/MEMORY, typecheck, build, RLS safety).

---

## 6. Dívida Técnica e Backlog Priorizado

### Prioridade CRÍTICA (bloqueiam uso pleno no hospital)
- [ ] Reativar autenticação real (email+senha + MFA TOTP) — plano no Google Drive
- [ ] Versionar migrations do schema atual (9 tabelas + views) no repositório

### Prioridade MÉDIA
- [ ] Consolidar todas as cópias duplicadas (faxina de repositório)
- [ ] Modal "Novo Leito" completo no frontend (atualmente depende de skill/edge)
- [ ] Drawer detalhado com timeline SOFA + eventos (já existe esqueleto)
- [ ] Error tracking (Sentry ou similar)
- [ ] 1 teste E2E (Playwright)

### Prioridade BAIXA
- [ ] Renomear caminho do projeto para `sasi/` simples (breaking change — avaliar impacto no Netlify)
- [ ] Code splitting + lazy loading mais agressivo (FichaCompleta + exportPDF já são lazy)
- [ ] Logger estruturado (substituir console.log)

---

## 7. Comandos para Desenvolvimento (Pasta Ativa)

```bash
# Local canônico após faxina (09/05/2026)
cd sasi

npm install
npm run typecheck     # deve sair limpo (0 erros)
npm run build         # deve gerar dist/ com sucesso
npm run dev           # http://localhost:5173 (abre direto no Dashboard com mock)
```

**Smoke test no Supabase (SQL Editor):**
```sql
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';  -- deve ser 9+
SELECT count(*) FROM pg_views WHERE schemaname='public' AND viewname LIKE 'vw_%'; -- 5
```

---

## 8. Regras Clínicas SASI (Obrigatórias)

Ver arquivo completo: [AGENTS.md](AGENTS.md)

- Usar sempre o template SASI v2.0 (Ramo C) com ortogonalidade de eixos.
- Toda nota deve ter: **Impressão com vetor (↑ / ↓ / =)** + **Conduta 1:1 com metas numéricas**.
- Ao gerar nota SASI via skill/IA → inserir automaticamente na tabela `evolucoes`.
- Manter Max–Min em todos os sinais vitais (incluindo SpO2).
- **Nunca inventar dados** (zero alucinação).

---

## 9. Histórico de Decisões Importantes

| Data       | Decisão                                      | Commit / Motivo |
|------------|----------------------------------------------|-----------------|
| 27-Abr     | Setup inicial Vite + React + Supabase        | Migração de Firebase |
| 30-Abr     | Deploy CI no Netlify + renomeio para sasi-uti.netlify.app | Fase A faxina |
| 30-Abr     | Implementação do bundle de design (3 temas + 3 views + calculadora) | 6020c0e |
| 06-Mai     | **Auth bypass temporário** (mock + dev_bypass RLS) | fc8cd75 — hospital bloqueia Gmail |
| 06-09-Mai  | Port de features do protótipo Gemini (FichaCompleta, LeitoCard, labs estruturados) | d8a648c, 760b52d, b3c82eb |

---

## 10. Recomendações de Faxina (Próximos PRs Seguros)

1. **Curto prazo (esta semana):**  
   - Criar/atualizar `STATUS.md` (este arquivo) e sincronizar MEMORY.md da pasta ativa.  
   - Adicionar item no PR template: "Atualizei STATUS.md".

2. **Médio prazo:**  
   - Mover duplicatas de sessão para `.claude/worktrees/` ou `archive/`.  
   - Versionar o schema real (gerar migrations a partir do Supabase atual).

3. **Longo prazo (após reativação de auth):**  
   - Avaliar renomeação para estrutura mais limpa (`sasi/` na raiz).

---

**Status resumido (09/05/2026):**  
**Produção estável** com bypass de auth. Código ativo saudável (typecheck + build limpos). Maior risco atual = fragmentação do repositório + drift de schema + dependência do bypass de autenticação.

**Stay hard.**  
— Faxina completa realizada em 09/05/2026 por Grok (com autorização total do usuário).

---

## Ações Manuais Recomendadas (Faça agora)

Depois de dar `git pull`, execute estas ações rápidas:

### 1. Delete os arquivos sensíveis (URGENTE - contêm chaves)
Delete diretamente no Windows Explorer:
- `Chaves, Senhas e Acesso a Sistemas (Ficheiro Antigravity).docx`
- `Links e APIKEYs.docx`

Eles já estão no `.gitignore`, mas é mais seguro removê-los fisicamente.

### 2. Delete o que sobrou de lixo na raiz (opcional mas recomendado)
Você pode deletar com segurança:
- `APPS_BETA_VERSOES_ANTERIORES/`
- `bradlc.vscode-tailwindcss-0.14.29.vsix`
- `extract.cjs`
- `gemini_code_extracted.tsx`
- `index.html`
- `install.cmd`
- `postcss.config.js`
- `tailwind.config.js`
- `vite.config.js`
- Qualquer outro arquivo pequeno estranho que não seja `.md`, `.json` de config ou `eslint.config.js`

### 3. Configuração do Netlify (importante para deploy continuar funcionando)
Acesse https://app.netlify.com/projects/sasi-uti/configuration/general

- **Base directory**: mude de (vazio ou caminho antigo longo) para **`sasi`**
- **Build command**: `npm run build` (já deve estar correto)
- **Publish directory**: `sasi/dist`

Depois disso, faça um "Clear cache and deploy site" para testar.

### 4. Commit e Push
```bash
git add -A
git commit -m "chore: faxina final - remoção de lixo remanescente"
git push
```

---

*Referências rápidas (atualizado após faxina):*  
- Código ativo: `sasi/`  
- Deploy: Netlify `sasi-uti` (Base directory = `sasi` após ajuste manual)  
- Supabase: projeto `idswehsvvqczzkiatuzu`  
- Plano de auth: Google Drive (documento "Plano de ação login e autenticação SASI")
