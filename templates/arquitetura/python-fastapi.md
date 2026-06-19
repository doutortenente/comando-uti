# Template — Python Backend (FastAPI)

> Fonte canônica: Obsidian CELEBRO → `ARQUITETURA REPOSITÓRIOS/SASI_v2_Compiladao_Arquitetura_Projetos_2026.md` §3.2

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

**No Comando UTI:** não há backend Python no repo. Python aparece apenas em
`.claude/skills/*/scripts/` (hooks do prompt-improver e utilitários de skills).