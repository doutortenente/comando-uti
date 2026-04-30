# MEMORY.md — SASI Comando UTI Alpha (estado vivo)

> **Pra quem chega depois (chat / cowork / aqui):** este é o estado real do projeto.
> README.md = arquitetura conceitual. Este arquivo = o que está deployado, configurado, e em qual estado.
> Atualize aqui sempre que tomar uma decisão importante ou consertar algo grande.

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
| **App em produção** | `https://passometro-uti.netlify.app` |
| **Supabase** | `https://idswehsvvqczzkiatuzu.supabase.co` |
| **Repo GitHub** | `https://github.com/doutortenente/comando-uti` |
| **Netlify project** | `passometro-uti` |

---

## 🔐 Auth — magic link (já funciona end-to-end)

Configuração no **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://passometro-uti.netlify.app`
- **Redirect URLs (allowlist):**
  - `https://passometro-uti.netlify.app/**`
  - `http://localhost:5173/**` (dev)

⚠️ **Não adicione `nagaitaltda.com` na allowlist** — é Squarespace vazio, redireciona pra página em branco.

---

## 🔑 Variáveis (`.env`)

```
VITE_SUPABASE_URL=https://idswehsvvqczzkiatuzu.supabase.co
VITE_SUPABASE_ANON_KEY=<JWT legacy anon key — NÃO publishable>
```

**Importante:** usamos a **anon key JWT legacy** (header `eyJhbGc...`), **não** o `sb_publishable_*`. Motivo: SDK `@supabase/supabase-js@2.45.0` não reconhece publishable keys. Pegue em **Supabase Dashboard → Settings → API → JWT (legacy keys)**.

`.env` é git-ignored. `.env.example` está em git pra referência (mas com placeholder).

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

Pré-requisitos no Netlify Dashboard → Site Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Histórico:** antes usávamos `command = ""` + deploy de `dist/` pré-buildado local via `@netlify/mcp`. Funcionou como workaround quando CI quebrava (exit code 2 sem logs visíveis), mas causava **fragmentação multi-Claude**: cada sessão tinha um `dist/` diferente, e quem buildou por último vencia. Voltamos pro CI agora que `package-lock.json` está consistente (`npm ci --dry-run` passa).

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

`supabase/functions/ocr-ingest/index.ts` — já deployada. `verify_jwt: true`.

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
| 30-Abr | Sync git (este commit) + CI build restaurado | Eliminar fragmentação multi-sessão |

---

## ⚠️ Pendências / problemas conhecidos

- [ ] **Confirmar** que cards abrem o `PatientModal` em produção após deploy via CI
- [ ] Modal "Novo Leito" no frontend (admissão manual sem skill)
- [ ] Drawer com timeline SOFA + eventos
- [ ] Export "Passagem de Turno" PDF
- [ ] Trigger pg pra auto-cálculo SOFA server-side
- [ ] MFA na conta Supabase (Dashboard → Account → Security)

---

## 🤝 Sincronização entre sessões Claude

**Regra:** git é a única fonte de verdade. Antes de mexer em algo:

```bash
git pull origin main
```

Depois de mudar algo importante (deploy, schema, decisão arquitetural):

```bash
# Atualize MEMORY.md com a decisão
git add -A && git commit -m "..." && git push
```

Se tem coisa que outro Claude precisa saber **rápido**, escreva aqui em MEMORY.md.
Se é referência permanente (arquitetura, fluxos), vai pro README.md.

---

**Última atualização:** 30-Abr-2026 · Stay hard. 🦅
