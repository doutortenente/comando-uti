// ============================================================================
// usePatientDetail — carrega dados completos de um paciente selecionado
// Usado nas janelas 2-4 (eixos) e passagem detalhada
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase, type Paciente, type Evolucao, type Pendencia, type PatientSummary } from '../lib/supabaseClient';
import { useSupabasePatients } from './useSupabasePatients';

export interface PatientDetail {
  paciente: Paciente | null;
  evolucao: Evolucao | null;
  evolucoes: Evolucao[];
  pendencias: Pendencia[];
  summary: PatientSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePatientDetail(pacienteId: string | null): PatientDetail {
  const { getLastEvolucao, getEvolucoes, getPatientSummary } = useSupabasePatients();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!pacienteId) {
      setPaciente(null);
      setEvolucao(null);
      setEvolucoes([]);
      setPendencias([]);
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const [pacRes, evol, hist, pendRes, sum] = await Promise.all([
        supabase.from('pacientes').select('*').eq('id', pacienteId).single(),
        getLastEvolucao(pacienteId),
        getEvolucoes(pacienteId, 14),
        supabase.from('pendencias').select('*').eq('paciente_id', pacienteId).order('prioridade'),
        getPatientSummary(pacienteId),
      ]);

      if (cancelled) return;

      if (pacRes.error) {
        setError(pacRes.error.message);
        setLoading(false);
        return;
      }

      setPaciente(pacRes.data);
      setEvolucao(evol);
      setEvolucoes(hist);
      setPendencias(pendRes.data ?? []);
      setSummary(sum);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [pacienteId, getLastEvolucao, getEvolucoes, getPatientSummary, tick]);

  return { paciente, evolucao, evolucoes, pendencias, summary, loading, error, refresh };
}