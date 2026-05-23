import { toArray } from './toArray';
import type { Evolucao } from './supabaseClient';

// Garante que campos esperados como array em evolucao.infecto cheguem como array,
// mesmo que o JSONB do Supabase tenha sido escrito com shape inesperado.
// Aplicar em TODO ponto de entrada de uma `Evolucao` na UI (hooks, queries
// independentes em PatientModal/SplitView/TableView, snapshots de IA).
export function normalizeEvolucao(ev: Evolucao): Evolucao {
  const rawInfecto = (ev.infecto ?? {}) as Record<string, unknown>;
  const rawNeuro = (ev.neuro ?? {}) as Record<string, unknown>;
  return {
    ...ev,
    neuro: {
      ...rawNeuro,
      escalas: toArray(rawNeuro.escalas),
    },
    infecto: {
      ...rawInfecto,
      atbs: toArray(rawInfecto.atbs),
      culturas: toArray(rawInfecto.culturas),
    },
    dvas: toArray(ev.dvas),
    sedativos: toArray(ev.sedativos),
    impressao: toArray(ev.impressao),
    conduta: toArray(ev.conduta),
  };
}
