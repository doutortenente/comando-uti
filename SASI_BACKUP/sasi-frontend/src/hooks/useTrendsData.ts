// ============================================================================
// SASI · useTrendsData
// Busca eventos_clinicos das últimas 72h e particiona em FC/PAM/SpO2/Lactato.
// FC e SpO2 não são tipos nativos do enum — vivem em tipo='custom' com
// valor_json.metric ∈ {'fc','spo2'}.
// Onda 1.5 — sem realtime (one-shot + refresh manual).
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface TrendPoint {
  ts: string;
  value: number;
}

export interface TrendsData {
  fc: TrendPoint[];
  pam: TrendPoint[];
  spo2: TrendPoint[];
  lactato: TrendPoint[];
}

export interface UseTrendsDataReturn extends TrendsData {
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: TrendsData = { fc: [], pam: [], spo2: [], lactato: [] };

interface EventoRow {
  ts: string;
  tipo: string;
  valor_num: number | null;
  valor_json: Record<string, unknown> | null;
}

function extractCustomMetric(json: Record<string, unknown> | null): string | null {
  if (!json) return null;
  const m = json.metric;
  return typeof m === 'string' ? m : null;
}

export function useTrendsData(pacienteId: string | null | undefined): UseTrendsDataReturn {
  const [data, setData] = useState<TrendsData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const aliveRef = useRef(true);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    aliveRef.current = true;
    if (!pacienteId) {
      setData(EMPTY);
      return () => { aliveRef.current = false; };
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    supabase
      .from('eventos_clinicos')
      .select('ts, tipo, valor_num, valor_json')
      .eq('paciente_id', pacienteId)
      .gte('ts', since)
      .order('ts', { ascending: true })
      .then(({ data: rows, error: err }) => {
        if (cancelled || !aliveRef.current) return;
        if (err) {
          setError(err.message);
          setData(EMPTY);
          setLoading(false);
          return;
        }
        const next: TrendsData = { fc: [], pam: [], spo2: [], lactato: [] };
        for (const raw of (rows ?? []) as EventoRow[]) {
          if (raw.valor_num == null || !Number.isFinite(raw.valor_num)) continue;
          const point: TrendPoint = { ts: raw.ts, value: raw.valor_num };
          if (raw.tipo === 'pam') {
            next.pam.push(point);
          } else if (raw.tipo === 'lactato') {
            next.lactato.push(point);
          } else if (raw.tipo === 'custom') {
            const metric = extractCustomMetric(raw.valor_json);
            if (metric === 'fc') next.fc.push(point);
            else if (metric === 'spo2') next.spo2.push(point);
          }
        }
        setData(next);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pacienteId, tick]);

  useEffect(() => () => { aliveRef.current = false; }, []);

  return { ...data, loading, error, refresh };
}
