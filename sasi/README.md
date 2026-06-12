# 🪖 SASI — Comando UTI Alpha

**Sistema de Auditoria e Síntese Intensiva** · 33 leitos · UTI 2/3/4
Stack 100% Supabase-native. Firebase morto e enterrado.

---

## ⚡ Setup rápido (3 comandos)

```bash
cp .env.example .env
npm install
npm run dev
```

Abre em http://localhost:5173. Faz login com seu e-mail (magic link). Pronto.

---

## 🏗️ Arquitetura

```
┌──────────────────────┐         ┌────────────────────────────┐
│ Claude (você)        │  POST   │ Supabase Edge Function     │
│ skill: sasi-ingest-  │ ──────▶ │ /functions/v1/ocr-ingest   │
│        export        │  JWT    │ - valida schema v1         │
└──────────────────────┘         │ - resolve paciente         │
                                 │ - cria evolução + eventos  │
                                 │ - audit em ingest_audit    │
                                 └─────────────┬──────────────┘
                                               │ INSERT
                                               ▼
                  ┌──────────────────────────────────────────┐
                  │ Postgres 17.6 (idswehsvvqczzkiatuzu)     │
                  │ - 9 tabelas RLS-protected (auth.uid())   │
                  │ - 5 views security_invoker               │
                  │ - 5 tabelas em supabase_realtime         │
                  └─────────────┬────────────────────────────┘
                                │ Realtime channel
                                ▼
                  ┌──────────────────────────────────────────┐
                  │ Frontend (este projeto)                  │
                  │ Vite + React 18 + Tailwind + Lucide      │
                  │ - useSupabasePatients (Realtime)         │
                  │ - useClinicalAlerts (Realtime)           │
                  │ - Dashboard / LeitoCard / Login          │
                  └──────────────────────────────────────────┘
```

---

## 📂 Estrutura

```
sasi-frontend/
├── src/
│   ├── App.tsx              # Auth-gate (Supabase session)
│   ├── main.tsx             # Entry React 18
│   ├── index.css            # Tailwind + tema escuro
│   ├── lib/
│   │   └── supabaseClient.ts  # Singleton + tipos
│   ├── hooks/
│   │   ├── useSupabasePatients.ts  # CRUD + Realtime + dashboard view
│   │   └── useClinicalAlerts.ts    # Alertas + ack
│   └── components/
│       ├── Login.tsx        # Magic link OTP
│       ├── Dashboard.tsx    # Sala de guerra: filtros, stats, header
│       └── LeitoCard.tsx    # Trincheira por paciente (cor por gravidade)
└── supabase/functions/ocr-ingest/index.ts   # Edge function (já deployada)
```

---

## 🔐 Credenciais (já no `.env.example`)

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://idswehsvvqczzkiatuzu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_9DVsZExR5QOIowCbpirhyw_dRuEVHsy` |

A `service_role` key **NÃO** entra aqui. Fica só na Edge Function (env var do Supabase).

---

## 🩺 Fluxo de uso operacional

### 1. Admitir um paciente
- Login no frontend → criar paciente manualmente OU
- Mandar foto da folha de admissão pra Claude → skill `sasi-ingest-export` → POST `/ocr-ingest` com `paciente_upsert` preenchido

### 2. Atualizar evolução do plantão
- Foto da folha de enfermagem → Claude → skill → POST. O leito é resolvido por `(uti, leito, status_leito='ativo')`.

### 3. Ver dashboard
- Frontend já está escutando `supabase_realtime`. Atualiza sozinho.
- Filtra por UTI2/3/4. Cores por gravidade. ΔSOFA 24h visível por card.

---

## 🧪 Testes

### Smoke schema (já passou no deploy)
```bash
# No Supabase SQL Editor:
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';  -- 9
SELECT count(*) FROM pg_views WHERE schemaname='public' AND viewname LIKE 'vw_%';  -- 5
SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=true;  -- 9
```

### Edge function E2E (precisa de JWT real, não anon)
```bash
# 1. Pegue um JWT logando no frontend e copiando do localStorage
# 2. Substitua $JWT abaixo
curl -X POST "https://idswehsvvqczzkiatuzu.supabase.co/functions/v1/ocr-ingest" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d @../sasi_backup_temp/payload-example.json
```

---

## 🚨 Hardening checklist

- ✅ RLS em 9/9 tabelas (`auth.uid() = user_id`)
- ✅ Views `security_invoker` (RLS herdada do role do consumidor)
- ✅ Functions com `set search_path = public, pg_catalog` (anti-hijack)
- ✅ Edge function com `verify_jwt: true`
- ⚠️ `pg_trgm` em schema `public` (WARN aceitável — recomendação Supabase)
- ⚠️ Adicione MFA na conta Supabase (Dashboard → Account → Security)

---

## 📋 Schema clínico (cheatsheet)

| Tabela | Função |
|---|---|
| `pacientes` | Cadastro do leito. `sofa_baseline` pra ΔSOFA do Sepsis-3. |
| `evolucoes` | Snapshot por plantão (manha/tarde/noite). JSONB por sistema. |
| `eventos_clinicos` | TIMESERIES — coração do Meta-Vision. CHECK em 50+ tipos. |
| `pendencias` | Checklist operacional do leito. |
| `atbs` | Antibiotic stewardship. `dias_terapia` calculado em view. |
| `culturas` + `antibiograma` | Microbiologia estruturada. |
| `alerts_log` | Histórico anti-alarm-fatigue (hash dedupe 24h). |
| `ingest_audit_log` | Forense da edge function. |

| View | Função |
|---|---|
| `vw_dashboard_uti` | 1 row por leito ativo + ΔSOFA 24h + pendências. |
| `vw_sofa_trend_72h` | Gráfico SOFA 3 dias. |
| `vw_bh_acumulado` | Balanço hídrico 24/48/72h. |
| `vw_dias_atb_ativo` | D-X com `stewardship_flag` (warning ≥7d, critical ≥14d). |
| `vw_alertas_abertos` | Badge no header (críticos/warnings/infos). |

---

## 🔥 Comandos úteis

```bash
# Deploy edge function (CLI)
supabase functions deploy ocr-ingest --project-ref idswehsvvqczzkiatuzu
supabase functions deploy grok-synthesis --project-ref idswehsvvqczzkiatuzu

# Secrets da edge function Grok (Dashboard → Edge Functions → grok-synthesis → Secrets)
# supabase secrets set XAI_API_KEY=sk-... --project-ref idswehsvvqczzkiatuzu
# supabase secrets set XAI_MODEL=grok-3-mini --project-ref idswehsvvqczzkiatuzu

# Logs da edge function
supabase functions logs ocr-ingest --project-ref idswehsvvqczzkiatuzu --tail
supabase functions logs grok-synthesis --project-ref idswehsvvqczzkiatuzu --tail

# Build prod
npm run build

# Type-check sem buildar
npm run typecheck
```

---

## 🎯 Roadmap (Fase Echo)

- [ ] Modal "Novo Leito" no frontend (admissão sem skill)
- [ ] Drawer detalhado por paciente (timeline SOFA + eventos)
- [ ] Export "Passagem de Turno" PDF (skill já gera o texto)
- [ ] Edge function `gemini-import` (esconder Gemini key do cliente)
- [ ] Auto-cálculo SOFA server-side (trigger pg)

---

**Stay hard.** 🦅 Comando UTI Alpha · v1.0 · 26-Abr-2026
