# CLAUDE CODE GUIDE — SASI UTI (Estado Atual)

**Data:** 28 de Maio de 2026  
**Contexto:** Este guia foi criado para que o Claude Code consiga continuar o desenvolvimento de forma consistente.

---

## 1. Visão Geral do Projeto Atual

O app está em `sasi/` (Vite + React + TypeScript + Tailwind + Supabase).

O foco atual **não é mais** o modelo antigo de "sala de guerra para 33 leitos". O fluxo real do médico é **pontual**:

1. Chega no paciente → copia evolução anterior
2. Cola OCR do folhão + prescrição
3. Gera síntese estruturada SASI v2.0 (com vetores ↑/↓/= + metas numéricas)
4. Salva a evolução
5. **Sincroniza** problemas + metas para o **Patient Summary** da admissão (o artefato vivo)
6. O LeitoCard mostra o problema principal com vetor grande para decisão rápida (3-5 segundos)

---

## 2. O Que Foi Implementado Recentemente (Trabalho Principal)

### Core Clínico (SASI v2.0 Pontual)

- **PatientSummary** persistente
  - Armazenado em `pacientes.patient_summary` (JSONB)
  - Campos importantes: `hpma`, `medicamentos_domiciliares`, `exames_relevantes`, `dispositivos` (com local), `plano_terapeutico_atual`, etc.
  - Edição completa no PatientModal (aba Detalhes)

- **SasiSynthesis** (`src/components/SasiSynthesis.tsx`)
  - Motor local inteligente + prompt excelente para Grok/Claude/Gemini
  - Gera `problemasAtivos` com vetor obrigatório + `condutasSistemas` com `meta` numérica

- **Sync real** Synthesis → Patient Summary
  - Botão "Sincronizar com Patient Summary" logo após a síntese estruturada
  - Atualiza `plano_terapeutico_atual` com problemas + metas
  - Feedback com toasts

- **LeitoCard** otimizado para visita pontual
  - Problema principal com **vetor gigante** (↑ vermelho / ↓ verde)
  - Mostra SOFA + delta + suporte crítico de forma clara

- **Dashboard**
  - Filtros úteis: "Piora SOFA 24h" e "Em DVA"

### Estabilidade & UX

- Loading states dedicados (PatientSummary, sync)
- Uso de toasts para feedback
- Melhor tratamento quando a coluna `patient_summary` ainda não existe
- Formulário do PatientSummary enriquecido (HPMA, medicamentos domiciliares, exames, local do dispositivo)
- .gitignore melhorado contra poluição de agentes de IA

### Git & Deploy

- Limpeza de branches `claude/*` mortas
- Correções de .gitignore (o `index.html` e `public/` estavam sendo ignorados)
- Vários commits de polimento e estabilização

---

## 3. Arquitetura Importante

| Conceito              | Onde está                          | Observação |
|-----------------------|------------------------------------|----------|
| Patient Summary       | `pacientes.patient_summary` (JSONB) | Migration necessária (já feita pelo usuário) |
| Evolução estruturada  | `evolucoes.problemas_ativos` + `condutas_sistemas` | JSONB |
| Geração de síntese    | `SasiSynthesis.tsx` + `sasiAI.ts` | Atualmente só simulação local + prompt |
| Sync                  | `FichaCompleta.tsx` → `useSupabasePatients.ts` | Usa `savePatientSummary` |
| LeitoCard             | Lê do `vw_dashboard_uti` + `sofa_snapshot` | Precisa de problemas estruturados na view |

**Importante:** O código é defensivo em relação à coluna `patient_summary`. Se ela não existir, ele avisa no console e não quebra.

---

## 4. O Que Ainda Falta / Prioridades

### Crítico (Bloqueando uso real)

- **Deploy está quebrado** (você está indo corrigir isso agora)
- Integração real com LLM (Grok/Claude) — atualmente só simulação local + botão de copiar prompt

### Importante (próximas iterações)

- Validar todo o fluxo novo em produção (PatientSummary + Sync + LeitoCard com vetores)
- Melhorar o LeitoCard (mostrar mais do plano terapêutico ou alertas)
- Tornar o PatientSummary ainda mais útil (talvez histórico de atualizações)
- Decidir se vamos manter os dois modos (texto livre + estruturado) para sempre ou migrar gradualmente
- Limpeza final do repositório raiz (ainda tem muita coisa antiga)

### Técnico / Futuro

- Edge Function ou Netlify Function para chamada real de LLM (segura)
- MFA no Supabase
- Melhor timeline de SOFA + eventos
- Export de passagem de turno usando os dados estruturados (muito mais poderoso)

---

## 5. Regras Importantes para Continuar

1. **Nunca quebre o fluxo atual** sem falar antes. O usuário está usando o app em produção.
2. Qualquer mudança em `PatientSummary` ou no fluxo de sync deve ser testada com cuidado.
3. Prefira **toasts** (`useToasts`) em vez de `alert()`.
4. Mantenha o código defensivo em relação ao banco (a coluna `patient_summary` pode não existir em alguns ambientes).
5. Quando for mexer em deploy, avise que o Base directory do Netlify **tem que ser `sasi`**.

---

## 6. Como Testar o Fluxo Novo (Checklist Rápido)

1. Abrir um paciente
2. Ir na aba de evolução / ficha
3. Gerar síntese estruturada (pode colar texto fake)
4. Ver o botão grande de sincronizar logo abaixo
5. Sincronizar
6. Fechar a ficha e abrir novamente → verificar se o Patient Summary atualizou na aba "Detalhes"
7. Olhar o LeitoCard → deve mostrar o problema principal com vetor grande

---

## 7. Arquivos Mais Importantes (Recentemente Modificados)

- `sasi/src/components/PatientSummary.tsx`
- `sasi/src/components/FichaCompleta.tsx`
- `sasi/src/components/SasiSynthesis.tsx`
- `sasi/src/components/LeitoCard.tsx`
- `sasi/src/hooks/useSupabasePatients.ts`
- `sasi/src/components/PatientModal.tsx`
- `sasi/src/lib/supabaseClient.ts` (tipos)

---

**Resumo para o Claude Code que vai continuar:**

O grande trabalho recente foi **transformar o app de um modelo antigo de texto livre para um fluxo clínico estruturado SASI v2.0** focado em visitas pontuais. O Patient Summary + sincronização é o coração do que foi entregue.

O deploy está quebrado agora — sua missão principal é consertar isso o mais rápido possível para que o usuário consiga validar o que foi construído.

Depois que o deploy voltar, o próximo grande passo natural é a **integração real com LLM**.

Boa sorte. Se precisar de contexto adicional, leia também `sasi/MEMORY.md`.