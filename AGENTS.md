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
service_role_key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkc3dlaHN2dnFjenpraWF0dXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyMTQxMSwiZXhwIjoyMDkxODk3NDExfQ.N65jpJPdHpO7rWHTPpgRKALh4TaElKZV8wdivwpczGc
anon_key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkc3dlaHN2dnFjenpraWF0dXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjE0MTEsImV4cCI6MjA5MTg5NzQxMX0.EqqlmqGBg1PaEdONLYnxH3lVVMWi2x-QXSY5rtSnYdw

## SASI Rules (Sempre seguir)
- Use o template SASI v2.0 (Ramo C) com ortogonalidade de eixos
- Toda nota deve ter: Impressão com vetor (↑ / ↓ / =) + Conduta 1:1 com metas numéricas
- Ao gerar nota SASI, insira automaticamente na tabela `evolucoes`
- Mantenha Max–Min em todos os sinais vitais (incluindo SpO2)
- Nunca invente dados (zero alucinação)

## Default Behavior
- Quando o usuário pedir "nota SASI", "evolução" ou "admissão", gere no formato oficial e salve no Supabase
- Sempre confirme antes de inserir dados sensíveis