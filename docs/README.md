# 📚 docs/ — documentação do SASI

Documentação que **vive com o código**: versiona junto via git (rode `git commit`/push igual ao código), abre no WebStorm/Cursor, e **não** depende do Obsidian.

> Regra: nota *sobre* o projeto que precisa andar junto com o código mora aqui.
> Conhecimento pessoal e clínico continua no Obsidian (vault CELEBRO). Veja a nota "🖥️ Setup SASI" lá.

## O que tem aqui

| Arquivo / pasta | Pra quê |
|---|---|
| `SETUP.md` | Como subir o ambiente de dev |
| `JETBRAINS.md` | Configuração do WebStorm/IDE |
| `notas/` | Notas de decisão, ideias e TODOs do projeto |
| `superpowers/` | Skills/automações |

## Por que aqui e não no vault do Obsidian

O vault sincroniza por LiveSync (CouchDB) em tempo real. Um repo com `.git` e `node_modules` brigaria com esse sync e poderia corromper o git. Então: **docs do projeto → `docs/` (git)**; **conhecimento → Obsidian (LiveSync)**. Cada um com seu sync, sem se morder.
