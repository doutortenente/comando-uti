# STATUS — SASI (Sistema de Auditoria e Síntese Intensiva)
**Comando UTI Alpha — 33 leitos (UTI 2/3/4)**

**Data desta revisão:** 11/06/2026
**Produção:** https://sasi-uti.netlify.app  
**Operador:** Dr. Nicolas Tenente (dr.tenente@nagaitaltda.com)  
**Supabase:** idswehsvvqczzkiatuzu (Postgres 17.6)

> **Este é o documento autoritativo de estado atual.**  
> Substitui os antigos `MEMORY.md` (removidos em 11/06/2026).  
> Briefing operacional para IA: [CLAUDE.md](CLAUDE.md).  
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
| Edge Function   | `ocr-ingest` (já deployada, verify_jwt: true) · `grok-synthesis` (síntese SASI via xAI Grok) | Entrada obrigatória de evoluções via skill ou foto |

**Princípio arquitetural:**  
Escrita de evoluções **sempre via edge function ou skill** (`sasi-ingest-export`) com audit log obrigatório (`ingest_audit_log`). Edição manual no frontend é read-only ou limitada.

**3 Temas:** `dark` (padrão), `clinical` (âmbar alta luminância UTI), `light`.  
**5 Janelas (redesign 11/06/2026):**

| # | Janela | Atalho | Conteúdo |
|---|--------|--------|----------|
| 1 | Leitos | `1` | Cards por gravidade (Estável/Watcher/Instável/Crítico) + filtros smart |
| 2 | Eixo Tempo | `2` | HPMA, tabelão labs seriais, interconsultas, programação/pendências |
| 3 | Eixo Estado | `3` | Terapias vigentes, vitais+BH, labs do dia, exame físico |
| 4 | Problema→Ação | `4` | Pares 1:1 problema/conduta com meta numérica |
| 5 | Passagem | `5` | Lista 3-linhas por paciente + copiar/PDF |

Navegação: `JanelaNav` no header · `j`/`k` troca paciente · seleção persistida em `localStorage`.

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
| 2 | 5 janelas de navegação (Leitos/Tempo/Estado/Problema/Passagem) | redesign-11jun | ✅ Ativo | Substitui plantão/round/editor |
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

## 5. Mapa do Repositório (Jun 2026)

**Código ATIVO (fonte da verdade — usar este):**
```
sasi/                               ← frontend canônico
├── src/
│   ├── App.tsx
│   ├── components/                 (FichaCompleta, Dashboard, LeitoCard, etc.)
│   ├── lib/                        (supabaseClient.ts, drugs.ts, theme.tsx...)
│   └── hooks/
├── netlify.toml
├── package.json
└── tsconfig.json (strict)

supabase/                           ← backend canônico (única árvore)
├── config.toml
├── migrations/                     (01–05)
└── functions/
    ├── ocr-ingest/
    ├── grok-synthesis/
    └── _shared/

sasi-mcp-server/                    ← MCP local (referenciado em .mcp.json)
docs/                               ← SETUP.md, JETBRAINS.md
CLAUDE.md                           ← briefing IA
STATUS.md                           ← este arquivo (estado vivo)
AGENTS.md                           ← regras + env vars (sem JWTs)
```

**Faxina 11/06/2026 (conclusão):**
- Removido scaffold Vite morto na raiz (`package.json`, `index.html`, configs Tailwind v4, `node_modules/` raiz).
- Removido VSIX Tailwind + pasta extraída.
- Removidos `MEMORY.md`, `sasi/MEMORY.md`, `sasi/CLAUDE_CODE_GUIDE.md` (consolidados em `STATUS.md` + `CLAUDE.md`).
- Removidas skills IA duplicadas (`.agents/`, `.claude/skills/` — 78 arquivos).
- Removido `skills-lock.json` (Firebase/Genkit, irrelevante).
- Unificado Supabase: `sasi/supabase/` fundido em `supabase/` na raiz (`ocr-ingest` + migration `05_add_patient_summary.sql`).
- Sanitizado `AGENTS.md`: JWTs substituídos por env vars (`SASI_SERVICE_ROLE_KEY`, `SASI_SUPABASE_ANON_KEY`).

**Governança:**
- `.github/PULL_REQUEST_TEMPLATE.md` — exige update de `STATUS.md`, typecheck, build, RLS safety.

---

## 6. Dívida Técnica e Backlog Priorizado

### Prioridade CRÍTICA (bloqueiam uso pleno no hospital)
- [ ] Reativar autenticação real (email+senha + MFA TOTP) — plano no Google Drive
- [ ] Versionar migrations do schema atual (9 tabelas + views) no repositório

### Prioridade MÉDIA
- [x] Consolidar cópias duplicadas (faxina 11/06/2026)
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
| 11-Jun     | **Faxina final do repo** — scaffold raiz, skills IA, docs duplicados, Supabase unificado | chore/faxina-11jun |
| 11-Jun     | **Redesign 5 Janelas** — severity/Watcher, clinicalExtract, Passagem 3-linhas | feat/5-janelas |

---

## 10. Próximos passos

1. **Rotacionar JWTs** expostos historicamente em `AGENTS.md` (Supabase Dashboard → Settings → API).
2. **Versionar schema real** (9 tabelas + views) — migrations locais ainda parcialmente obsoletas.
3. **Reativar auth** após plano email+senha+MFA.

---

**Status resumido (11/06/2026):**  
**Produção estável** com bypass de auth. Frontend redesenhado com **5 janelas** (`severity.ts`, `clinicalExtract.ts`, `JanelaNav`). Repo limpo: `sasi/` + `supabase/` + `sasi-mcp-server/`. Maior risco residual = drift de schema + dependência do bypass de autenticação.

---

## Ações Manuais Recomendadas

### 1. Rotacionar keys (se ainda não fez)
JWTs antigos vazaram no histórico do git via `AGENTS.md`. Rotacione no Supabase e atualize `.env` local.

### 2. Configuração do Netlify (importante para deploy continuar funcionando)
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
