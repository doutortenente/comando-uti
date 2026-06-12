// ============================================================================
// src/hooks/usePacienteFicha.ts
// Dados da página-prontuário (PacientePage): paciente + evoluções (última +
// histórico) + pendências abertas. Mesmas queries do PatientModal — o modal
// fica intocado pra não criar risco de regressão.
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  type Paciente,
  type Evolucao,
  type Pendencia,
} from '../lib/supabaseClient';

const HISTORICO_LIMIT = 15;

export interface UsePacienteFichaReturn {
  paciente: Paciente | null;
  evolucao: Evolucao | null;
  evolucoes: Evolucao[];
  pendencias: Pendencia[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function usePacienteFicha(pacienteId: string): UsePacienteFichaReturn {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [pacRes, evolRes, pendRes] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', pacienteId).single(),
      supabase
        .from('evolucoes')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })
        .limit(HISTORICO_LIMIT),
      supabase
        .from('pendencias')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('concluida', false)
        .order('prioridade', { ascending: true }),
    ]);

    if (pacRes.error) setError(pacRes.error.message);
    setPaciente(pacRes.data ?? null);
    setEvolucoes((evolRes.data ?? []) as Evolucao[]);
    setPendencias(pendRes.data ?? []);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    paciente,
    evolucao: evolucoes[0] ?? null,
    evolucoes,
    pendencias,
    loading,
    error,
    reload,
  };
}
