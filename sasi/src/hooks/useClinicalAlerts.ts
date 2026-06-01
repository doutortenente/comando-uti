// ============================================================================
// src/hooks/useClinicalAlerts.ts
// ----------------------------------------------------------------------------
// Hook complementar ao useSupabasePatients: consome a view vw_alertas_abertos,
// escuta realtime de alerts_log, expõe count crítico/warning pro badge do header.
//
// Por que separado: alertas têm cadência distinta de pacientes. Acoplar no
// useSupabasePatients obrigaria re-renderizar a lista inteira quando só um
// badge mudou. Atomicidade > acoplamento.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface AlertaAberto {
  paciente_id: string;
  uti: string;
  leito: string;
  nome: string;
  criticos: number;
  warnings: number;
  infos: number;
  total: number;
}

export interface AlertLogRow {
  id: string;
  paciente_id: string;
  evento_id: string | null;
  tipo: string;
  severidade: 'info' | 'warning' | 'critical';
  mensagem: string;
  payload: Record<string, unknown> | null;
  hash_key: string;
  acked: boolean;
  created_at: string;
}

export interface UseClinicalAlertsReturn {
  alertas: AlertaAberto[];
  loading: boolean;
  error: string | null;
  totalCriticos: number;
  totalWarnings: number;

  getAlertsByPatient: (pacienteId: string) => Promise<AlertLogRow[]>;
  ackAlert: (alertId: string) => Promise<void>;
  ackAllByPatient: (pacienteId: string) => Promise<void>;
}

export function useClinicalAlerts(): UseClinicalAlertsReturn {
  const [alertas, setAlertas] = useState<AlertaAberto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ─── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('vw_alertas_abertos')
      .select('*');
    setLoading(false);
    if (err) {
      console.error('[SASI alerts] load:', err);
      setError(err.message);
      return;
    }
    setAlertas(data ?? []);
  }, []);

  // ─── Realtime ────────────────────────────────────────────────────────────
  const setupRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    // Nome único por inscrição (ver useSupabasePatients): evita reusar canal
    // já inscrito sob StrictMode e o erro "add callbacks after subscribe()".
    const channel = supabase
      .channel(`sasi-alerts-realtime-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts_log' }, () => {
        void load();
      })
      .subscribe();
    channelRef.current = channel;
  }, [load]);

  useEffect(() => {
    void load();
    setupRealtime();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [load, setupRealtime]);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const getAlertsByPatient = useCallback(async (pacienteId: string): Promise<AlertLogRow[]> => {
    const { data, error: err } = await supabase
      .from('alerts_log')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('acked', false)
      .order('created_at', { ascending: false });
    if (err) {
      console.error('[SASI alerts] getAlertsByPatient:', err);
      return [];
    }
    return (data ?? []) as AlertLogRow[];
  }, []);

  const ackAlert = useCallback(async (alertId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('alerts_log')
      .update({
        acked: true,
        acked_at: new Date().toISOString(),
        acked_by: user?.id ?? null,
      })
      .eq('id', alertId);
    if (err) setError(err.message);
  }, []);

  const ackAllByPatient = useCallback(async (pacienteId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('alerts_log')
      .update({
        acked: true,
        acked_at: new Date().toISOString(),
        acked_by: user?.id ?? null,
      })
      .eq('paciente_id', pacienteId)
      .eq('acked', false);
    if (err) setError(err.message);
  }, []);

  // ─── Agregados ───────────────────────────────────────────────────────────
  const totalCriticos = alertas.reduce((sum, a) => sum + a.criticos, 0);
  const totalWarnings = alertas.reduce((sum, a) => sum + a.warnings, 0);

  return {
    alertas,
    loading,
    error,
    totalCriticos,
    totalWarnings,
    getAlertsByPatient,
    ackAlert,
    ackAllByPatient,
  };
}
