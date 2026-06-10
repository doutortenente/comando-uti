# Setup de máquina nova — Comando UTI

Checklist de apps e configuração para deixar um PC "zero bala" e pronto
para desenvolver o Comando UTI.

## Essenciais

| App | Para quê | Onde baixar |
|---|---|---|
| **Node.js LTS** | Roda o frontend (Vite) e o MCP server. Precisa de **Node >= 18**; o LTS atual já serve e vem com npm. | <https://nodejs.org> — ou melhor, via gerenciador de versões: **nvm-windows** (Windows) / **nvm** ou **fnm** (Mac/Linux) |
| **Git** | Controle de versão. No Windows o instalador inclui o Git Bash. | <https://git-scm.com> |
| **WebStorm** ou **IntelliJ IDEA Ultimate** | IDE — o repo já versiona as configs em `.idea/` (run configurations, ESLint, code style). ⚠️ IDEA *Community* NÃO serve para JS/TS. | <https://www.jetbrains.com/webstorm/> — ver [JETBRAINS.md](JETBRAINS.md) |

## Muito recomendados

| App | Para quê |
|---|---|
| **Claude Code** (CLI ou desktop) | Assistente de código direto no repo. <https://claude.ai/code> |
| **Supabase CLI** | Banco local, migrations, emulação do Postgres: `npm i -g supabase` |
| **Firebase CLI** | Só se ainda mexer em hosting/functions Firebase: `npm i -g firebase-tools` |
| **Chrome ou Edge** + extensão **React Developer Tools** | DevTools para depurar o frontend |

## Qualidade de vida (opcionais)

- **Windows Terminal** (se Windows) — terminal moderno com abas
- **Postman** ou **Bruno** — testar as APIs do Supabase manualmente
- **Obsidian** — notas do projeto (o `.gitignore` já ignora `.obsidian/`)

## Primeira configuração

```bash
# Identidade do git
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Confirmar versões
node -v        # >= 18
git --version

# Clonar e instalar (3 package.json independentes)
git clone https://github.com/doutortenente/comando-uti.git
cd comando-uti && npm install
cd sasi && npm install
cd ../sasi-mcp-server && npm install
```

## Variáveis de ambiente

Criar um `.env` na raiz do repo:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

⚠️ **Nunca commitar o `.env`** — o `.gitignore` já bloqueia, mas as chaves
ficam só na sua máquina (pegue no dashboard do Supabase, em
Settings > API).

## Conferindo que está tudo funcionando

```bash
cd sasi && npm run dev    # frontend ativo em http://localhost:5173
npm run typecheck         # TypeScript sem erros
cd .. && npm run lint     # ESLint da raiz
```

Ou, no WebStorm, use as run configurations prontas no dropdown
(`sasi: dev`, `sasi: typecheck`, `raiz: lint`) — ver
[JETBRAINS.md](JETBRAINS.md).
