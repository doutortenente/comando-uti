# Design — View Pacientes (Plantão Board)

**Data:** 12/06/2026
**Status:** Aprovado pelo usuário (Dr. Tenente)
**Escopo:** `sasi/src` — Plantão Board, item "Pacientes" da Sidebar

## Objetivo

Habilitar o item "Pacientes" da Sidebar (hoje desabilitado, "Em breve") como uma
view com **índice de pacientes ativos** que leva a uma **página-prontuário por
paciente** — ficha completa, timeline SOFA, histórico de evoluções e pendências,
sem modal.

## Decisões de produto

| Decisão | Escolha |
|---|---|
| Propósito | Página dedicada por paciente (prontuário SASI), acessada via índice |
| PatientModal | **Coexiste** — modal segue no clique do LeitoCard; ganha botão "Abrir prontuário" |
| Escopo do índice | **Só ativos** nesta versão (altas/óbitos ficam para iteração futura) |
| Conteúdo da página | **Máximo reuso**: FichaCompleta + TimelineDrawer + histórico de evoluções + pendências |
| Navegação | **Estado interno na shell** (sem router, sem URL) — escolha explícita do usuário |

## Arquitetura

### Navegação (estado na shell)

`Dashboard.tsx` ganha:

```ts
const [activeView, setActiveView] = useState<'overview' | 'pacientes'>('overview');
const [pacientePageId, setPacientePageId] = useState<string | null>(null);
```

- `activeView === 'overview'` → conteúdo atual (FiltersBar + CriticalAlerts + 3 view modes).
- `activeView === 'pacientes'` e `pacientePageId === null` → `PacientesIndex`.
- `activeView === 'pacientes'` e `pacientePageId` setado → `PacientePage`.
- `TopBar` permanece em todas as views; `FiltersBar` só na overview.
- `Sidebar` recebe `activeView` + `onNavigate`: "Pacientes" habilitado, "Visão
  Geral" deixa de ser hardcoded `on` (classe ativa segue `activeView`).
- Limitação aceita: F5 volta para a Visão Geral; sem deep-link.

### Componentes novos

**`PacientesIndex.tsx`** — tabela dos ativos usando as rows de
`vw_dashboard_uti` já em memória (`dashboard` do `useSupabasePatients`, com
realtime; zero query nova).

- Colunas: Leito, UTI, Nome, Idade, Dias de internação, HD, SOFA, Δ24h,
  Gravidade (badge), Pendências abertas.
- Busca por nome/leito; ordenação padrão por leito.
- Clique na linha → `PacientePage` daquele paciente.
- Reusa `EmptyState` e skeletons existentes.

**`PacientePage.tsx`** — o prontuário.

- **Cabeçalho:** botão voltar (→ índice), nome, leito, UTI, idade, dias de
  internação, badge de gravidade, botão "Timeline" que abre o `TimelineDrawer`
  existente (continua drawer; sem refactor).
- **Corpo:** `FichaCompleta` inline — props `{ paciente, evolucao, pendencias,
  onSaved }` já existentes, reuso direto (edição dos 7 sistemas + DVAs +
  impressão/conduta/pendências).
- **Histórico de evoluções:** lista read-only abaixo da ficha (data, plantão,
  SOFA, impressão resumida) via `getEvolucoes(pacienteId)` do hook existente.
  Edição de evoluções antigas está fora do escopo.

**`usePacienteFicha.ts`** (hook novo, pequeno) — carrega paciente + última
evolução + pendências para a página (mesmas queries que o `PatientModal` já
faz; o modal fica intocado para não criar risco de regressão).

### Toque único no PatientModal

Botão "Abrir prontuário" no header do modal → navega para a página
(`setActiveView('pacientes')` + `setPacientePageId(id)`) e fecha o modal.
Prop nova `onOpenProntuario?: (id: string) => void`.

## Erros e estados

- Loading: skeletons existentes.
- Erro de fetch: banner vermelho padrão + toast, como na overview.
- Paciente não encontrado (ex.: alta entre realtime e clique): EmptyState com
  botão de voltar ao índice.

## Verificação

- `npm run typecheck` e `npm run build` limpos (tsconfig strict).
- Validação manual no dev server: navegação Sidebar ⇄ índice ⇄ página, edição
  na FichaCompleta salvando, drawer de timeline, botão do modal — nos temas
  dark e clinical.

## Fora do escopo (iterações futuras)

- Altas/óbitos/transferências no índice (censo histórico).
- URL/deep-link (hash routing ou React Router).
- Edição de evoluções antigas.
- View "Exames" da Sidebar.
