// ============================================================================
// SASI · Janela 4 — Ficha de Evolução (ex-FichaCompleta)
// Edição dos campos SASI + Impressão/Problemas Ativos + Plano/Conduta 12-24h
// ============================================================================
import type { Paciente } from '../../lib/supabaseClient';
import FichaCompleta from '../FichaCompleta';

interface Props {
  paciente: Paciente | null;
  evolucao: import('../../lib/supabaseClient').Evolucao | null;
  pendencias: import('../../lib/supabaseClient').Pendencia[];
  loading: boolean;
  onSaved: () => void;
}

export default function FichaEvolucao({ paciente, evolucao, pendencias, loading, onSaved }: Props) {
  if (loading) {
    return <div className="text-center text-app-text-muted py-12 animate-pulse">Carregando ficha de evolução…</div>;
  }

  if (!paciente) {
    return (
      <div className="bg-app-card border border-app-border rounded-xl p-8 text-center text-app-text-muted text-sm">
        Selecione um paciente na Janela Leitos (tecla 1).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-app-text-muted px-1">
        Eixo 4 — Ficha de Evolução · dados do SASI · problemas ativos ↔ condutas 1:1
      </div>
      <FichaCompleta
        paciente={paciente}
        evolucao={evolucao}
        pendencias={pendencias}
        onSaved={onSaved}
      />
    </div>
  );
}