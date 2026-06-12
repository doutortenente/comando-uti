// ============================================================================
// Patient Summary — base tabular editável (espelho Excel FASE 3)
// ============================================================================
import { useState, useEffect } from 'react';
import { Save, Loader2, Database } from 'lucide-react';
import type { PatientSummary, ResumoSistemaRow } from '../lib/supabaseClient';
import { PATIENT_SUMMARY_ROWS } from '../lib/sasiSchema';

interface Props {
  summary: PatientSummary | null;
  pacienteId: string;
  loading?: boolean;
  onSave: (updated: PatientSummary) => Promise<void>;
}

function mergeRows(stored?: ResumoSistemaRow[]): ResumoSistemaRow[] {
  return PATIENT_SUMMARY_ROWS.map(def => {
    const found = stored?.find(r => r.id === def.id);
    return { ...def, texto: found?.texto ?? '' };
  });
}

export default function PatientSummaryTable({ summary, pacienteId, loading, onSave }: Props) {
  const [rows, setRows] = useState<ResumoSistemaRow[]>(mergeRows(summary?.resumo_sistemas));
  const [meta, setMeta] = useState({
    motivo_admissao: summary?.motivo_admissao ?? '',
    hpma: summary?.hpma ?? '',
    antecedentes: summary?.antecedentes ?? '',
    alergias: summary?.alergias ?? '',
    iatrogenias: summary?.iatrogenias ?? '',
    sutilezas: summary?.sutilezas ?? '',
    dva_fluidos: summary?.dva_fluidos ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(mergeRows(summary?.resumo_sistemas));
    setMeta({
      motivo_admissao: summary?.motivo_admissao ?? '',
      hpma: summary?.hpma ?? '',
      antecedentes: summary?.antecedentes ?? '',
      alergias: summary?.alergias ?? '',
      iatrogenias: summary?.iatrogenias ?? '',
      sutilezas: summary?.sutilezas ?? '',
      dva_fluidos: summary?.dva_fluidos ?? '',
    });
  }, [summary]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: PatientSummary = {
        id: summary?.id ?? `ps_${pacienteId}`,
        paciente_id: pacienteId,
        data_admissao: summary?.data_admissao ?? new Date().toISOString(),
        motivo_admissao: meta.motivo_admissao,
        hpma: meta.hpma,
        antecedentes: meta.antecedentes,
        alergias: meta.alergias,
        iatrogenias: meta.iatrogenias,
        sutilezas: meta.sutilezas,
        dva_fluidos: meta.dva_fluidos,
        resumo_sistemas: rows,
        dispositivos: summary?.dispositivos ?? [],
        suporte_atual: summary?.suporte_atual ?? {},
        interconsultas: summary?.interconsultas ?? [],
        programacao: summary?.programacao ?? [],
        ultima_atualizacao: new Date().toISOString(),
        created_at: summary?.created_at ?? new Date().toISOString(),
      };
      await onSave(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-sm text-app-text-muted py-8">Carregando Patient Summary…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-app-text">
          <Database className="w-4 h-4" /> Patient Summary — Base Tabular
        </h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg font-semibold"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>

      {/* Identificação — linhas fixas */}
      <div className="overflow-x-auto rounded-lg border border-app-border">
        <table className="w-full text-[11px]">
          <tbody>
            {[
              { label: 'Motivo Admissão / Dx', key: 'motivo_admissao' as const, rows: 2 },
              { label: 'HPMA', key: 'hpma' as const, rows: 3 },
              { label: 'Antecedentes', key: 'antecedentes' as const, rows: 2 },
              { label: 'Alergias', key: 'alergias' as const, rows: 1 },
              { label: '🛑 Iatrogenias / Interações', key: 'iatrogenias' as const, rows: 2 },
              { label: 'Sutilezas / Monitoramento', key: 'sutilezas' as const, rows: 2 },
              { label: 'DVA / Fluidos', key: 'dva_fluidos' as const, rows: 2 },
            ].map(row => (
              <tr key={row.key} className="border-b border-app-border/50">
                <td className="w-44 px-2 py-1.5 font-bold text-app-text-muted bg-app-tertiary/40 align-top">
                  {row.label}
                </td>
                <td className="px-2 py-1">
                  <textarea
                    value={meta[row.key]}
                    onChange={e => setMeta(m => ({ ...m, [row.key]: e.target.value }))}
                    rows={row.rows}
                    className="w-full bg-app-tertiary/30 border border-app-border/40 rounded px-2 py-1 text-xs text-app-text resize-y focus:outline-none focus:border-app-accent"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo por sistema */}
      <div className="overflow-x-auto rounded-lg border border-app-border">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-200">
              <th className="text-left px-2 py-1.5 font-bold w-52 border-r border-slate-700">Sistema</th>
              <th className="text-left px-2 py-1.5 font-bold">Resumo / Status Atual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`border-b border-app-border/50 ${i % 2 ? 'bg-app-tertiary/10' : 'bg-app-card'}`}>
                <td className="px-2 py-1.5 font-semibold text-app-text border-r border-app-border/30 whitespace-nowrap">
                  {row.emoji} {row.label}
                </td>
                <td className="px-2 py-1">
                  <textarea
                    value={row.texto}
                    onChange={e => {
                      const next = [...rows];
                      next[i] = { ...next[i], texto: e.target.value };
                      setRows(next);
                    }}
                    rows={2}
                    className="w-full bg-app-tertiary/30 border border-app-border/40 rounded px-2 py-1 text-xs text-app-text resize-y focus:outline-none focus:border-app-accent"
                    placeholder={`Resumo ${row.label}…`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}