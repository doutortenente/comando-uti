# Template — Node.js / TypeScript Backend

> Fonte canônica: Obsidian CELEBRO → `ARQUITETURA REPOSITÓRIOS/SASI_v2_Compiladao_Arquitetura_Projetos_2026.md` §3.1

```text
meu-projeto-node/
├── src/
│   ├── config/                 # Validação de env, db config, constants
│   ├── modules/ ou features/   # (recomendado para escalar)
│   │   └── users/
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       ├── users.repository.ts
│   │       ├── dto/ ou schemas/
│   │       └── users.module.ts (se usar NestJS)
│   ├── shared/ ou lib/         # Utils, helpers, errors, logger
│   ├── middleware/             # Auth, validation, error handler
│   ├── prisma/ ou migrations/  # (se usar Prisma, Drizzle, etc.)
│   └── main.ts ou server.ts
├── tests/
├── prisma/ ou drizzle/
├── .env
├── package.json
├── tsconfig.json
├── vitest.config.ts ou jest.config
└── README.md
```

**Variações:** Express/Fastify → camadas ou features. NestJS → `modules/` com decorators.

**No Comando UTI:** `sasi-mcp-server/` segue este padrão (Node + TypeScript + MCP).