# SASI UTI - Grok Build + Supabase Integration

## Project Info
- Project: doutortemente's Project (NAGAITA LTDA)
- Project URL: https://idswehsvvqczzkiatuzu.supabase.co
- Status: PRODUCTION

**Código ativo (maio/2026):** `sasi/` (local canônico após faxina de 09/05).  
Consulte [STATUS.md](STATUS.md) para estado completo e instruções.

## MCP Servers

### Supabase (Principal)
type: supabase
project_url: https://idswehsvvqczzkiatuzu.supabase.co
service_role_key: ${SASI_SERVICE_ROLE_KEY}
anon_key: ${SASI_SUPABASE_ANON_KEY}

> **Segurança:** nunca commitar JWTs. Defina as variáveis no ambiente local
> (`.env`, shell profile, ou secrets do IDE). Se alguma key já vazou no histórico
> do git, rotacione em Supabase Dashboard → Settings → API.

## SASI Rules (Sempre seguir)
- Use o template SASI v2.0 (Ramo C) com ortogonalidade de eixos
- Toda nota deve ter: Impressão com vetor (↑ / ↓ / =) + Conduta 1:1 com metas numéricas
- Ao gerar nota SASI, insira automaticamente na tabela `evolucoes`
- Mantenha Max–Min em todos os sinais vitais (incluindo SpO2)
- Nunca invente dados (zero alucinação)

## Default Behavior
- Quando o usuário pedir "nota SASI", "evolução" ou "admissão", gere no formato oficial e salve no Supabase
- Sempre confirme antes de inserir dados sensíveis