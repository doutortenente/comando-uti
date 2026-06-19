# Guia JetBrains (WebStorm / IntelliJ) — Comando UTI

> Montando uma máquina do zero? Comece pelo [SETUP.md](SETUP.md)
> (Node, Git, CLIs e checklist completo) e volte aqui para o IDE.

Este repositório versiona as configurações do JetBrains em `.idea/`
(módulo, ESLint, code style e run configurations). Arquivos por-usuário
(`workspace.xml`, `shelf/`, `misc.xml`, etc.) são ignorados via
`.idea/.gitignore` — não precisam (nem devem) ser commitados.

## Qual IDE baixar

| IDE | Serve? | Observação |
|---|---|---|
| **WebStorm** | ✅ Recomendado | Focado em JS/TS/React. Tailwind e ESLint nativos. |
| **IntelliJ IDEA Ultimate** | ✅ Sim | Mesmo suporte JS/TS do WebStorm (plugin JavaScript incluso). |
| IntelliJ IDEA **Community** | ❌ **Não** | Não tem suporte pleno a JavaScript/TypeScript. |

Download: <https://www.jetbrains.com/webstorm/> (trial de 30 dias).

## Abrindo o projeto

1. `File > Open` e selecione a **raiz do repositório** (`comando-uti/`),
   nunca `sasi/` direto — as run configurations dependem disso.
2. O IDE lê `.idea/` automaticamente. Aceite o prompt de "Trust Project".
3. Instale as dependências (2 `package.json` — `sasi/` e `sasi-mcp-server/`):

   ```bash
   cd sasi && npm install
   cd ../sasi-mcp-server && npm install
   ```

4. Confira o Node em `Settings > Languages & Frameworks > Node.js`
   (precisa de Node >= 18).

## Run configurations

Ficam no dropdown do canto superior direito, agrupadas em pastas:

- **sasi**: `dev` (Vite), `build` (tsc + vite build), `typecheck`, `preview`
- **mcp-server**: `dev` (tsx watch), `build` (tsc)

Templates de arquitetura e doutrina clínica: pasta `templates/` (espelho do Obsidian CELEBRO).
Mapa completo: [MAPA-REPOSITORIO.md](MAPA-REPOSITORIO.md).

Equivalem a `npm run <script>` em cada pasta.

## ESLint

Não há `package.json` nem ESLint na raiz (removidos na faxina 11/06/2026).
Typecheck do frontend: run config `sasi: typecheck` ou `cd sasi && npm run typecheck`.

## Tailwind

O suporte a Tailwind CSS é **nativo** no WebStorm e no IDEA Ultimate
(autocomplete de classes em `sasi/` via `sasi/tailwind.config.js`).
Não precisa instalar plugin.

## Primeira abertura: diff esperado

Na primeira vez que o IDE abrir o projeto, ele pode reescrever arquivos de
`.idea/` (reordenar atributos, acrescentar defaults). Revise o `git status`,
commite o ajuste uma única vez e o diretório estabiliza. `workspace.xml`,
`misc.xml` e afins continuam ignorados — não commite se aparecerem por
algum motivo.
