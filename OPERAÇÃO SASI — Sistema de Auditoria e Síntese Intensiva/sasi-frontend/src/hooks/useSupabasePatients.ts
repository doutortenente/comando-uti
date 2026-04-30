// ============================================================================
// src/hooks/useSupabasePatients.ts
// Hook principal — substitui toda lógica Firebase do App.tsx
// Gerencia: CRUD de pacientes, evolucoes, realtime, dashboard view
// ============================================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type Paciente, type Evolucao, type DashboardRow } from '../lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// ESTADO LOCAL (espelho do que estava no Firebase)
// ============================================================================
export interface UseSupabasePatientsReturn {
  // Dados
  patients: Paciente[];
  dashboard: DashboardRow[];
  loading: boolean;
  error: string | null;

  // CRUD Pacientes
  addPatient: (data: Omit<Paciente, 'id' | 'created_at' | 'updated_at'>) => Promise<Paciente | null>;
  updatePatient: (id: string, data: Partial<Paciente>) => Promise<void>;
  removePatient: (id: string) => Promise<void>;

  // CRUD Evoluções
  saveEvolucao: (
    pacienteId: string,
    evolucao: Omit<Evolucao, 'id' | 'paciente_id' | 'created_at' | 'updated_at'>
  ) => Promise<Evolucao | null>;
  getEvolucoes: (pacienteId: string, limit?: number) => Promise<Evolucao[]>;
  getLastEvolucao: (pacienteId: string) => Promise<Evolucao | null>;

  // SOFA Trend (timeseries 72h)
  getSofaTrend: (pacienteId: string) => Promise<{ ts: string; sofa_total: number }[]>;

  // Migração Firebase
  importFromFirebase: (firebasePatients: unknown[]) => Promise<{ ok: number; err: number }>;
}

// ============================================================================
// HOOK
// ============================================================================
export function useSupabasePatients(): UseSupabasePatientsReturn {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [dashboard, setDashboard] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ============================================================
  // CARREGAR DASHBOARD (view materializada do Supabase)
  // ============================================================
  const loadDashboard = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('vw_dashboard_uti')
      .select('*')
      .order('leito');

    if (err) {
      console.error('[SASI] Erro ao carregar dashboard:', err);
      setError(err.message);
      return;
    }
    setDashboard(data ?? []);
  }, []);

  // ============================================================
  // CARREGAR LISTA SIMPLES DE PACIENTES ATIVOS
  // ============================================================
  const loadPatients = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('pacientes')
      .select('*')
      .eq('status_leito', 'ativo')
      .order('leito');

    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    setPatients(data ?? []);
  }, []);

  // ============================================================
  // REALTIME: ouve mudanças na tabela pacientes e evolucoes
  // ============================================================
  const setupRealtime = useCallback(() => {
    // Limpa canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('sasi-uti-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => {
        loadPatients();
        loadDashboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evolucoes' }, () => {
        loadDashboard();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[SASI] Realtime conectado — escutando UTI');
        }
      });

    channelRef.current = channel;
  }, [loadPatients, loadDashboard]);

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  useEffect(() => {
    loadPatients();
    loadDashboard();
    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadPatients, loadDashboard, setupRealtime]);

  // ============================================================
  // CRUD — PACIENTES
  // ============================================================
  const addPatient = useCallback(
    async (data: Omit<Paciente, 'id' | 'created_at' | 'updated_at'>): Promise<Paciente | null> => {
      const { data: inserted, error: err } = await supabase
        .from('pacientes')
        .insert(data)
        .select()
        .single();

      if (err) {
        console.error('[SASI] Erro ao inserir paciente:', err);
        setError(err.message);
        return null;
      }
      return inserted;
    },
    []
  );

  const updatePatient = useCallback(async (id: string, data: Partial<Paciente>): Promise<void> => {
    const { error: err } = await supabase
      .from('pacientes')
      .update(data)
      .eq('id', id);

    if (err) {
      console.error('[SASI] Erro ao atualizar paciente:', err);
      setError(err.message);
    }
  }, []);

  const removePatient = useCallback(async (id: string): Promise<void> => {
    // Soft delete — muda status, não destrói histórico
    const { error: err } = await supabase
      .from('pacientes')
      .update({ status_leito: 'alta' })
      .eq('id', id);

    if (err) {
      console.error('[SASI] Erro ao dar alta ao paciente:', err);
      setError(err.message);
    }
  }, []);

  // ============================================================
  // CRUD — EVOLUÇÕES
  // ============================================================
  const saveEvolucao = useCallback(
    async (
      pacienteId: string,
      evolucao: Omit<Evolucao, 'id' | 'paciente_id' | 'created_at' | 'updated_at'>
    ): Promise<Evolucao | null> => {
      const { data, error: err } = await supabase
        .from('evolucoes')
        .insert({ paciente_id: pacienteId, ...evolucao })
        .select()
        .single();

      if (err) {
        console.error('[SASI] Erro ao salvar evolução:', err);
        setError(err.message);
        return null;
      }

      // Atualiza updated_at do paciente (para ordenação no dashboard)
      await supabase
        .from('pacientes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', pacienteId);

      return data;
    },
    []
  );

  const getEvolucoes = useCallback(
    async (pacienteId: string, limit = 10): Promise<Evolucao[]> => {
      const { data, error: err } = await supabase
        .from('evolucoes')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('data_evolucao', { ascending: false })
        .limit(limit);

      if (err) return [];
      return data ?? [];
    },
    []
  );

  const getLastEvolucao = useCallback(
    async (pacienteId: string): Promise<Evolucao | null> => {
      const { data, error: err } = await supabase
        .from('evolucoes')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('data_evolucao', { ascending: false })
        .limit(1)
        .single();

      if (err) return null;
      return data;
    },
    []
  );

  // ============================================================
  // SOFA TREND — timeseries 72h (para gráfico de tendência)
  // ============================================================
  const getSofaTrend = useCallback(
    async (pacienteId: string): Promise<{ ts: string; sofa_total: number }[]> => {
      const { data, error: err } = await supabase
        .from('eventos_clinicos')
        .select('ts, valor_num')
        .eq('paciente_id', pacienteId)
        .eq('tipo', 'sofa')
        .gte('ts', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
        .order('ts', { ascending: true });

      if (err) return [];
      return (data ?? []).map((e) => ({
        ts: e.ts,
        sofa_total: e.valor_num ?? 0,
      }));
    },
    []
  );

  // ============================================================
  // MIGRAÇÃO FIREBASE → SUPABASE
  // Converte o formato antigo do Firebase para o novo schema
  // ============================================================
  const importFromFirebase = useCallback(
    async (firebasePatients: unknown[]): Promise<{ ok: number; err: number }> => {
      let ok = 0;
      let err = 0;

      for (const raw of firebasePatients) {
        const fp = raw as Record<string, unknown>;
        
        try {
          // 1. Criar paciente no novo formato
          const { data: novoPaciente, error: errPac } = await supabase
            .from('pacientes')
            .insert({
              leito: (fp.leito as string) ?? 'Leito ?',
              uti: (fp.uti as string) ?? 'UTI-1',
              nome: (fp.nome as string) ?? 'Paciente Migrado',
              idade: fp.idade ? Number(fp.idade) : undefined,
              peso: fp.peso ? parseFloat(fp.peso as string) : undefined,
              altura: fp.altura ? parseFloat(fp.altura as string) : undefined,
              hd: (fp.hd as string) ?? undefined,
              data_adm: (fp.adm as string) ?? new Date().toISOString().split('T')[0],
              alergias: (fp.alergias as string) ?? undefined,
              gravidade: 'grave',
              status_leito: 'ativo',
            })
            .select()
            .single();

          if (errPac || !novoPaciente) {
            console.error('[MIGRAÇÃO] Erro ao criar paciente:', errPac);
            err++;
            continue;
          }

          // 2. Criar evolução com dados dos sistemas (formato JSONB)
          const sistemas = {
            neuro: (fp.neuro as Record<string, unknown>) ?? {},
            resp: (fp.resp as Record<string, unknown>) ?? {},
            hemo: (fp.hemo as Record<string, unknown>) ?? {},
            tgi: (fp.tgi as Record<string, unknown>) ?? {},
            renal: (fp.renal as Record<string, unknown>) ?? {},
            hemato: (fp.hemato as Record<string, unknown>) ?? {},
            infecto: (fp.infecto as Record<string, unknown>) ?? {},
          };

          const { error: errEv } = await supabase.from('evolucoes').insert({
            paciente_id: novoPaciente.id,
            plantao: 'manha',
            ...sistemas,
            dvas: (fp.dvas as unknown[]) ?? [],
            sedativos: (fp.sedativos as unknown[]) ?? [],
            impressao: (fp.impressao as string[]) ?? [],
            conduta: (fp.conduta as string[]) ?? [],
            sofa_snapshot: {},
          });

          if (errEv) {
            console.error('[MIGRAÇÃO] Erro ao criar evolução:', errEv);
            // Paciente foi criado, evolução falhou — aceitável, continua
          }

          // 3. Migrar pendências
          const pendencias = (fp.pendencias as unknown[]) ?? [];
          for (const p of pendencias) {
            const pend = p as Record<string, unknown>;
            await supabase.from('pendencias').insert({
              paciente_id: novoPaciente.id,
              tarefa: (pend.tarefa as string) ?? (pend.text as string) ?? 'Pendência migrada',
              prioridade: 2,
              concluida: Boolean(pend.concluida ?? pend.done ?? false),
            });
          }

          ok++;
          console.log(`[MIGRAÇÃO] ✅ ${novoPaciente.nome} (leito ${novoPaciente.leito}) migrado`);
        } catch (e) {
          console.error('[MIGRAÇÃO] Exceção:', e);
          err++;
        }
      }

      console.log(`[MIGRAÇÃO] Concluída — OK: ${ok} | ERR: ${err}`);
      return { ok, err };
    },
    []
  );

  return {
    patients,
    dashboard,
    loading,
    error,
    addPatient,
    updatePatient,
    removePatient,
    saveEvolucao,
    getEvolucoes,
    getLastEvolucao,
    getSofaTrend,
    importFromFirebase,
  };
}
