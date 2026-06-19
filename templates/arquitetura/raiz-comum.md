[[ARQUITETURA REPOSITÓRIOS/---Raiz_Comum  ---![[Sem título.base]].md|---
1. Raiz_Comum: 
```
meu-projeto/
├── .github/                    # Workflows CI/CD, templates de PR e issues
├── src/ ou app/                # Código-fonte principal (quase sempre aqui)
├── tests/ ou __tests__/        # Testes (unitários, integração, e2e)
├── public/ ou static/          # Arquivos estáticos servidos diretamente
├── docs/                       # Documentação extra (opcional)
├── scripts/                    # Scripts de build, seed, deploy, etc.
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml          # (quase obrigatório em produção)
├── package.json / pyproject.toml / composer.json / go.mod
└── tsconfig.json / biome.json / ruff.toml (configurações)
```
--- 

2. NODE.JS / TYPESCRIPT BACKEND (Melhorado)

```
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
------------

**Variações rápidas:**

- Express/Fastify → estrutura manual por camadas ou features
- NestJS → usa modules/ com decorators (mais opinativo)
```

---
