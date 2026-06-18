# Templates — Comando UTI / SASI

Espelho local dos modelos **Padrão** do vault Obsidian **CELEBRO** (perfil Notebook Navigator).

| Pasta | Conteúdo | Fonte no Obsidian |
|-------|----------|-------------------|
| `arquitetura/` | Scaffolds Node, Python, React, SASI v2 | `ARQUITETURA REPOSITÓRIOS/` |
| `sasi-clinico/` | Doutrina, skills, template-base v2 | `30-Projetos/SASI/Doutrina/00 - Doutrina (SKILLs e Templates)/` |
| `obsidian/` | Nota diária / plantão | `99-Templates/daily.md` |

## Fonte da verdade

O vault Obsidian continua sendo a fonte canônica para notas e doutrina clínica:

```
/home/dr/vaults/celebro/
```

Estes arquivos são **cópias de referência** para o IDE e para skills de IA no repo.
Ao alterar doutrina clínica, edite no Obsidian e sincronize (`notas`), depois recopie se necessário.

## Uso no IDE

- **WebStorm / IntelliJ:** `templates/` aparece na árvore do projeto; use como referência ao criar módulos.
- **Cursor:** regras em `.cursor/rules/templates.mdc` apontam para esta pasta.
- **Claude Code:** skills clínicas em `templates/sasi-clinico/`; engenharia em `templates/arquitetura/`.

## Sincronizar do Obsidian

```bash
# Doutrina clínica
cp -r "/home/dr/vaults/celebro/30-Projetos/SASI/Doutrina/00 - Doutrina (SKILLs e Templates)/"* templates/sasi-clinico/

# Arquitetura
cp "/home/dr/vaults/celebro/ARQUITETURA REPOSITÓRIOS/SASI_v2_Compiladao_Arquitetura_Projetos_2026.md" templates/arquitetura/sasi-v2-monorepo.md

# Diário
cp "/home/dr/vaults/celebro/99-Templates/daily.md" templates/obsidian/daily.md
```