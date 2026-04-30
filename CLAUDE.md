# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Comando UTI** is a Brazilian ICU (Intensive Care Unit) patient management web app. It allows medical staff to track and manage patient data across clinical systems (hemodynamics, respiratory, neurological, renal, infectious, etc.) and produce structured handoff/round summaries. The UI is in Portuguese.

## Commands

### Frontend (root directory)
```bash
npm run dev        # Start Vite dev server
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run lint       # Run ESLint on src/
```

### Firebase Functions (run inside each subdirectory)
```bash
cd functions && npm run build       # Compile TypeScript
cd functions && npm run lint        # Lint functions code
cd functions && npm run serve       # Build + start emulator (functions only)
cd genkitggoggins && npm run build  # Compile Genkit codebase
```

### Firebase Deployment
```bash
firebase deploy                     # Deploy everything
firebase deploy --only hosting      # Deploy frontend only
firebase deploy --only functions    # Deploy all function codebases
firebase emulators:start            # Start all emulators (functions + dataconnect)
```

### Database
The Supabase schema is at `supabase/migrations/01_initial_schema.sql`. Apply it via the Supabase dashboard SQL editor — there is no migration runner configured locally.

## Architecture

### Frontend (`src/`)
The entire frontend is a single large React component in `src/App.jsx`. All patient state, clinical dictionaries (DVA drugs, sedatives, neurological scales), and UI sections live in this one file. There is no routing — the app is one page with multi-patient management via a patient list sidebar.

**State model**: Each patient is a flat JSON object with nested objects per clinical system (`neuro`, `resp`, `hemo`, `tgi`, `renal`, `hemato`, `infecto`), plus arrays for `dvas`, `sedativos`, `impressao` (diagnosis), `conduta` (plan), and `pendencias` (pending tasks).

### Data Layer (`src/lib/`)
- `supabase.js`: Supabase client, reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`
- `supabaseAdapter.js`: **Critical bridge** — maps the flat React patient JSON to/from the normalized Supabase schema. Uses polling (10-second interval) rather than Supabase Realtime because data spans 4 tables simultaneously.

### Supabase Schema (4 tables)
| Table | Purpose |
|---|---|
| `patients` | Demographics, diagnosis, active problems, plan, pending issues |
| `clinical_parameters` | Vital signs and shift data (inserted each save, not upserted) |
| `prescriptions` | DVAs, sedatives, antibiotics (fully replaced on each save) |
| `lab_results` | Blood work (inserted each save, not upserted) |

### Firebase Backend (multiple codebases)
`firebase.json` defines 4 functions codebases deployed separately:
- `functions/` (codebase `default`): Main Cloud Functions entry point (TypeScript); currently mostly empty scaffolding
- `genkitggoggins/` (codebase `genkit`): Genkit AI flows
- `base-de-dados-ggoggins/` (codebase `backendfirebase`): Database-related functions
- `]ty/` (codebase `f`): Additional functions
- `codebase/` (codebase `codebase`): Additional functions

Firebase Hosting serves `dist/` with SPA rewrites. Firestore is in `southamerica-east1`.

## Environment Setup

Create a `.env` file in the root with:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## UI Conventions

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin — no `tailwind.config.js` class scanning needed
- Print support: use `no-print` class to hide elements, `print:` Tailwind variants for print styles
- Dark mode: custom classes `dark-input` and `dark-textarea` are used (defined in `src/index.css`)
- Icons: `lucide-react` throughout
