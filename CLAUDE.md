# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Comando UTI / SASI** is a Brazilian ICU (Intensive Care Unit) patient management web app. It allows medical staff to track and manage patient data across clinical systems (hemodynamics, respiratory, neurological, renal, infectious, etc.) and produce structured handoff/round summaries. The UI is in Portuguese.

Production URL: https://sasi-uti.netlify.app

## Repository Layout

The deployed app lives in a subdirectory whose name contains accented characters and spaces — quote it on every shell call:

```
OPERAÇÃO SASI — Sistema de Auditoria e Síntese Intensiva/
└── sasi-frontend/          ← THE DEPLOYED APP (TypeScript + React + Supabase)
    ├── src/
    │   ├── App.tsx
    │   ├── components/     ← Dashboard, FichaCompleta, LeitoCard, SmartPasteBox, …
    │   ├── hooks/          ← useSupabasePatients, useClinicalAlerts, useTrendsData
    │   └── lib/            ← supabaseClient, drugs, theme, toArray, exportPDF, exportText
    └── supabase/
        ├── functions/      ← Deno Edge Functions (ocr-ingest)
        └── migrations/     ← schema deltas applied via Supabase SQL editor
```

Other top-level entries (`SASI_BACKUP/`, `.github/`, `.agents/`, `.claude/`, `.mcp.json`, `install.cmd`, `bradlc.vscode-tailwindcss-*.vsix`) are project metadata or historical backups — **not** part of the build.

There is no second frontend at the repo root. A previous JS monolith (`src/App.jsx`) used to live there and was removed in commit `e844eaa` because it was unreachable from any deploy and caused fixes to land in the wrong codebase.

## Commands

All build / dev commands run **inside the deployed-app subdirectory**:

```bash
cd "OPERAÇÃO SASI — Sistema de Auditoria e Síntese Intensiva/sasi-frontend"

npm install        # Install deps
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run typecheck  # tsc -b --noEmit
```

## Deployment

**Netlify** is configured at the repo root in `netlify.toml`:

```toml
[build]
  base    = "OPERAÇÃO SASI — Sistema de Auditoria e Síntese Intensiva/sasi-frontend"
  command = "npm run build"
  publish = "dist"
```

Pushing to `main` triggers a build of the subdirectory and publishes its `dist/` to `sasi-uti.netlify.app`. SPA fallback redirect `/* → /index.html` is set up.

Edge Functions (e.g. `ocr-ingest`) are deployed separately via the Supabase CLI / dashboard from `sasi-frontend/supabase/functions/`. Database schema changes (`sasi-frontend/supabase/migrations/`) are applied via the Supabase SQL Editor — there is no automated migration runner.

## Architecture

### Frontend (TypeScript)

- `src/App.tsx` — Boots Supabase session (with a mock-session bypass for the auth-disabled phase), wraps the app in `ErrorBoundary` + `UIProvider` (theme) + `ToastProvider`, and renders `Dashboard`.
- `src/components/Dashboard.tsx` — Top-level UTI view: split view, war room, table view, leito grid.
- `src/components/FichaCompleta.tsx` — The patient ficha with all 7 clinical-system editors (neuro, resp, hemo, tgi, renal, hemato, infecto), plus DVAs/sedativos/escalas/atb/culturas accordions and free-text problemas/conduta/pendências. This is the largest single file and the most crash-sensitive surface; the "Antibióticos & Culturas" section is wrapped in a local `ErrorBoundary` to isolate failures from the rest of the ficha.
- `src/components/SmartPasteBox.tsx` — Paste clinical text, calls the `ocr-ingest` Edge Function to OCR/extract structured data via AI, and the result lands in Supabase.
- `src/hooks/useSupabasePatients.ts` — All CRUD + realtime subscriptions for `pacientes` and `evolucoes`. `getEvolucoes`/`getLastEvolucao` normalize the JSONB payload so array-shaped fields (`infecto.atbs`, `infecto.culturas`, `dvas`, `sedativos`, `impressao`, `conduta`) always reach React state as arrays — defense against malformed AI output stored in the DB.

### Data Layer (Supabase)

Core tables (see `sasi-frontend/supabase/migrations/`):
- `pacientes` — leito, demographic, dispositivos/isolation/severidade flags
- `evolucoes` — per-shift JSONB snapshot of each clinical system + arrays for DVAs/sedativos/impressao/conduta
- `eventos_clinicos` — timeseries (vital signs, lab values, SOFA scores); fed by the Edge Function
- `pendencias` — checklist items linked to a paciente

Views: `vw_dashboard_uti` materializes the dashboard summary.

### Edge Function `ocr-ingest`

Located at `sasi-frontend/supabase/functions/ocr-ingest/index.ts`. Receives raw clinical text from `SmartPasteBox`, calls an AI extractor (Claude or Gemini, depending on `payload.source.fonte`), and inserts the structured snapshot into `pacientes` / `evolucoes` / `eventos_clinicos`. It coerces `infecto.atbs`, `infecto.culturas`, `dvas`, `sedativos`, `impressao`, `conduta` to arrays before INSERT so that malformed AI output cannot poison the JSONB columns.

## Defensive coding conventions

`src/lib/toArray.ts` is the canonical guard for any value coming from Supabase JSONB, AI output, or other external source that should be an array. Always use:

```ts
import { toArray } from '../lib/toArray';
toArray<MyType>(maybeArrayValue).map(...)
```

instead of TypeScript-only patterns like `((x as MyType[]) ?? []).map(...)` — the cast is compile-time only and lies at runtime if the value is a string or object (the exact bug that crashed the ficha when culturas came back as something other than an array).

## Environment Setup

Inside `sasi-frontend/`, create `.env` (or `.env.local`):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.env.example` in the same folder documents the full list of expected variables.

## UI Conventions

- **Tailwind CSS v3** with content scanning configured in `sasi-frontend/tailwind.config.js`
- Theme: `UIProvider` (`src/lib/theme.tsx`) provides 3 themes (dark / clinical / light) plus 3 view modes (split / war room / table)
- Toasts: `useToasts` hook + `ToastProvider`
- Icons: `lucide-react` throughout
- Error UX: `ErrorBoundary` at the App root catches anything that escapes; in addition, the Antibióticos & Culturas section in `FichaCompleta.tsx` is wrapped in its own boundary so a crash there does not kill the rest of the ficha during a plantão
