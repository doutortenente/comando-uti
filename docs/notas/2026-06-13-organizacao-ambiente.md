# Sessão de organização do ambiente — 2026-06-13

> Registro do que foi feito numa sessão de organização geral (PC + VPS + ferramentas).
> Sem segredos: credenciais ficam no Vaultwarden.

## Resumo

Faxina e organização de ponta a ponta: limpeza do PC local, enxugamento da VPS (homelab Docker), criação de cofre de senhas, atalhos de terminal, versionamento de configs e documentação.

## PC local

- Removida uma **chave SSH privada solta** na raiz da home (criada por engano, não usada).
- Apagado dump de crash do WebStorm (1,4 GB) e duplicados; `Downloads` de 273 MB → 1,6 MB.
- Clone redundante do projeto (`Documentos/GitHub/comando-uti`) removido — fonte única passa a ser `~/WebstormProjects/`.
- Vault Obsidian: removido vault-fantasma duplicado; mantido só o `CELEBRO`.

## VPS (homelab Docker + Traefik)

- Acesso por chave SSH deste PC corrigido (`ssh jarvis-vps`).
- **Removidos apps redundantes**: AppFlowy, Grist, Teable (Notion-likes), Kotaemon, e 2 instalações duplicadas do Hermes — sobrou o Jarvis oficial.
- Disco da VPS: ~52 GB → ~29 GB usados.
- Núcleo final: Jarvis, n8n, Obsidian (CouchDB + livesync), Vaultwarden, Docspell, Kan, Heimdall, Traefik.

## Cofre de senhas

- **Vaultwarden** instalado na VPS, fechado em `127.0.0.1` (sem exposição à internet), acessado por túnel SSH. Registro travado após criar a conta.

## Atalhos de terminal (`~/.bashrc`)

`vps`, `portal`, `jarvis`, `n8n`, `cofre` (+ `cofre stop`) e `salvar` (commit+push dos dotfiles).

## Configs versionados

- Repo `~/dotfiles` (symlinks de `.bashrc`, `.gitconfig`, `ssh_config`) com backup em GitHub **privado**.

## Ferramentas / IDE

- Decisão: **WebStorm** como IDE-casa; **Cursor** e agentes (Jarvis, Junie, Air via ACP) como complementos.
- **Não** instalado DataGrip — WebStorm já traz Database Tools embutido. Conexão ao Supabase documentada (via pooler, rede IPv4).
- Guias salvos no Obsidian (CELEBRO): "🖥️ Setup SASI" e "⌨️ Guia JetBrains".

## Estrutura de docs

Criado este padrão `docs/` (README + `notas/`) para documentação que vive junto do código, separada do Obsidian (que sincroniza por LiveSync).

## Pendências

- Trocar a senha-mestra do Vaultwarden no 1º login.
- Instalar 5 plugins do WebStorm (Key Promoter X, Rainbow CSV, Indent Rainbow, .env files, GitToolBox).
- Conferir no painel Hostinger se os apps removidos não ressuscitam.
