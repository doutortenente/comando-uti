# 📦 COMPILADÃO COMPLETO DE ARQUITETURAS DE PROJETOS (2026)

**Versão consolidada para SASI v2.0 / Comando-UTI**  
Inclui templates gerais + estrutura personalizada para gestão de UTI (React + TypeScript + Supabase)

---

## Índice

1. [Princípios Universais de Boa Arquitetura](#1-princípios-universais-de-boa-arquitetura)
2. [Estrutura Raiz Comum Recomendada](#2-estrutura-raiz-comum-recomendada)
3. [Templates por Ecossistema](#3-templates-por-ecossistema)
   - [3.1 Node.js / TypeScript Backend](#31-nodejs--typescript-backend)
   - [3.2 Python Backend (FastAPI)](#32-python-backend-fastapi)
   - [3.3 PHP Moderno (Laravel)](#33-php-moderno-laravel)
   - [3.4 React + Vite + TypeScript](#34-react--vite--typescript)
   - [3.5 Next.js 15 (App Router)](#35-nextjs-15-app-router)
   - [3.6 Go (Padrão Oficial)](#36-go-padrão-oficial)
4. [Template Personalizado SASI v2.0](#4-template-personalizado-sasi-v20)
5. [Recomendações Finais para SASI](#5-recomendações-finais-para-sasi)

---

## 1. Princípios Universais de Boa Arquitetura

- **Separação de responsabilidades** (Separation of Concerns)
- Consistência acima de perfeição
- Nunca commitar secrets (`.env` sempre no `.gitignore`)
- Type safety forte (TypeScript, Pydantic, etc.)
- Estrutura que escala: comece simples → migre para **feature-based**
- Testes próximos do código ou centralizados
- Preparado para realtime, Edge Functions e produção clínica (LGPD)

**Duas abordagens principais:**
- **Por camadas** (layered): boa para começar
- **Por features/domínios** (feature-based): escala melhor em projetos médios/grandes como SASI

---

## 2. Estrutura Raiz Comum Recomendada

```text
meu-projeto/
├── .github/                    # Workflows CI/CD, templates de PR
├── src/ ou app/                # Código-fonte principal
├── tests/ ou __tests__/        # Testes
├── public/ ou static/          # Arquivos estáticos
├── docs/
├── scripts/
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml
└── [package.json | pyproject.toml | composer.json | go.mod]
```

---

## 3. Templates por Ecossistema

### 3.1 Node.js / TypeScript Backend

```text
meu-projeto-node/
├── src/
│   ├── config/
│   ├── modules/ ou features/
│   │   └── users/
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       ├── users.repository.ts
│   │       ├── dto/
│   │       └── users.module.ts
│   ├── shared/ ou lib/
│   ├── middleware/
│   ├── prisma/ ou migrations/
│   └── main.ts ou server.ts
├── tests/
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

### 3.2 Python Backend (FastAPI)

```text
meu-projeto-python/
├── src/
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── api/ ou routers/
│       ├── core/
│       ├── models/ ou schemas/
│       ├── services/
│       ├── repositories/
│       └── utils/
├── tests/
│   ├── unit/
│   └── integration/
├── alembic/
├── .env
├── pyproject.toml
└── README.md
```

---

### 3.3 PHP Moderno (Laravel)

```text
meu-projeto-laravel/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   └── Providers/
├── bootstrap/
├── config/
├── database/
│   ├── migrations/
│   └── seeders/
├── public/                     # ← ÚNICA pasta exposta
│   └── index.php
├── resources/
├── routes/
├── storage/
├── tests/
├── vendor/
├── .env
├── artisan
└── composer.json
```

---

### 3.4 React + Vite + TypeScript

```text
meu-projeto-react/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   └── ui/
│   ├── features/ ou pages/
│   ├── hooks/
│   ├── lib/ ou utils/
│   ├── services/ ou api/
│   ├── stores/
│   ├── types/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── .env
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

### 3.5 Next.js 15 (App Router)

```text
meu-projeto-nextjs/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── (auth)/
│   ├── components/
│   │   ├── ui/
│   │   └── features/
│   ├── lib/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   └── styles/
├── public/
├── .env
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

### 3.6 Go (Padrão Oficial)

```text
meu-app-go/
├── cmd/
│   └── server/
├── internal/
│   ├── domain/
│   ├── usecase/
│   ├── repository/
│   └── handler/
├── pkg/
├── api/
├── configs/
├── go.mod
├── go.sum
└── Makefile
```

---

## 4. Template Personalizado SASI v2.0

**Stack recomendada:** Next.js 15 App Router + TypeScript + Supabase + Tailwind + shadcn/ui + Zustand

```text
sasi-v2/
├── .github/
├── src/
│   ├── app/                          # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # War Room principal
│   │   ├── beds/
│   │   ├── patients/
│   │   ├── rounds/
│   │   └── api/
│   │
│   ├── features/                     # Domínios clínicos
│   │   ├── beds/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types.ts
│   │   │   └── BedCard.tsx
│   │   ├── patients/
│   │   ├── hemodynamics/             # VTI, lactate, SvO2, Delta PP
│   │   ├── sepsis/
│   │   ├── devices/                  # VMI, DVA, SED, ATB, CVC, TRR
│   │   ├── sofa/
│   │   ├── war-room/
│   │   ├── rounds/
│   │   └── exports/
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui
│   │   └── shared/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── realtime.ts
│   │   ├── utils/
│   │   ├── formatters/
│   │   └── constants/
│   │
│   ├── hooks/
│   │   ├── useRealtimeBeds.ts
│   │   ├── usePatientData.ts
│   │   └── useHemodynamics.ts
│   │
│   ├── stores/
│   │   ├── bedStore.ts
│   │   ├── warRoomStore.ts
│   │   └── userStore.ts
│   │
│   ├── types/
│   │   ├── clinical.ts
│   │   ├── supabase.ts
│   │   └── index.ts
│   │
│   └── styles/
│
├── supabase/
│   ├── functions/                    # Edge Functions
│   │   ├── generate-sofa/
│   │   ├── sepsis-bundle-check/
│   │   ├── export-round/
│   │   └── ocr-nursing-note/
│   └── migrations/
│
├── public/
├── tests/
├── .env.local
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

### Principais Decisões de Arquitetura no SASI v2.0

- **feature-based** → cada domínio clínico (hemodinâmica, sepsis, devices) fica isolado
- `lib/supabase/` → centraliza toda comunicação realtime e queries
- `stores/` → Zustand para estado global leve (ideal para múltiplos cards de leito)
- `types/clinical.ts` → tipagem forte de dados de UTI
- `supabase/functions/` → lógica sensível ou pesada roda como Edge Functions
- `hooks/` → abstrai subscriptions de realtime

---

## 5. Recomendações Finais para SASI

1. Comece com a estrutura `features/` desde o dia 1.
2. Mantenha `types/clinical.ts` sempre atualizado (é sua fonte de verdade).
3. Use Edge Functions para cálculos críticos (SOFA, bundles de sepsis).
4. Realtime via Supabase é excelente para war room — aproveite bem os hooks customizados.
5. Para plantão/noturno: priorize performance e clareza visual nos componentes de leito.

---

**Arquivo gerado em:** `/home/workdir/artifacts/SASI_v2_Compiladao_Arquitetura_Projetos_2026.md`

FICA DURO. O paciente não morre no nosso turno.