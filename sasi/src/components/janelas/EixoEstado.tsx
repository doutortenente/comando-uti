// ============================================================================
// SASI · Janela 3 — Eixo Estado → Planilhão Geral (dados tabulados editáveis)
// Inspirado em SASI_UTI_20Leitos.xlsx (FASE 1 vitais + labs + prescrição)
// ============================================================================
import type { Evolucao, Paciente } from '../../lib/supabaseClient';
import PlanilhaoGeral from '../clinical/PlanilhaoGeral';

interface Props {
  paciente: Paciente | null;
  evolucao: Evolucao | null;
  loading: boolean;
  onSaved?: () => void;
}

export default function EixoEstado({ paciente, evolucao, loading, onSaved }: Props) {
  if (!paciente) {
    return (
      <div className="bg-app-card border border-app-border rounded-xl p-8 text-center text-app-text-muted text-sm">
        Selecione um paciente na Janela Leitos (tecla 1).
      </div>
    );
  }

  return (
    <PlanilhaoGeral
      paciente={paciente}
      evolucao={evolucao}
      loading={loading}
      onSaved={onSaved}
    />
  );
}