// ============================================================================
// SASI · Janela 5 — Passagem de Turno (tabela densa 3-linhas, design original)
// ============================================================================
import { useEffect, useState } from 'react';
import { ClipboardList, Copy, FileDown } from 'lucide-react';
import type { DashboardRow } from '../../lib/supabaseClient';
import { supabase } from '../../lib/supabaseClient';
import { buildPassagem3Linhas, buildPassagemTexto } from '../../lib/clinicalExtract';
import { getSeverity } from '../../lib/severity';
import { sofaColorClass } from '../../lib/drugs';
import { useToasts } from '../../lib/useToasts';

interface Props {
  rows: DashboardRow[];
  loading: boolean;
  userEmail?: string;
}

type Block = ReturnType<typeof buildPassagem3Linhas>;

export default function PassagemTurno({ rows, loading, userEmail }: Props) {
  const { addToast } = useToasts();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (rows.length === 0) { setBlocks([]); return; }

    let cancelled = false;
    setFetching(true);

    (async () => {
      const evolMap = new Map<string, Awaited<ReturnType<typeof fetchEvol>>>();
      const pendMap = new Map<string, Awaited<ReturnType<typeof fetchPends>>>();

      await Promise.all(rows.map(async row => {
        const [evol, pends] = await Promise.all([
          fetchEvol(row.paciente_id),
          fetchPends(row.paciente_id),
        ]);
        evolMap.set(row.paciente_id, evol);
        pendMap.set(row.paciente_id, pends);
      }));

      if (cancelled) return;
      setBlocks(rows.map(row =>
        buildPassagem3Linhas(row, evolMap.get(row.paciente_id) ?? null, pendMap.get(row.paciente_id) ?? [])
      ));
      setFetching(false);
    })();

    return () => { cancelled = true; };
  }, [rows]);

  const handleCopy = async () => {
    const evolMap = new Map<string, Awaited<ReturnType<typeof fetchEvol>>>();
    const pendMap = new Map<string, Awaited<ReturnType<typeof fetchPends>>>();
    await Promise.all(rows.map(async row => {
      evolMap.set(row.paciente_id, await fetchEvol(row.paciente_id));
      pendMap.set(row.paciente_id, await fetchPends(row.paciente_id));
    }));
    await navigator.clipboard.writeText(buildPassagemTexto(rows, evolMap, pendMap));
    addToast('success', `Passagem copiada (${rows.length} pacientes)`);
  };

  const handlePDF = async () => {
    const { exportPassagemTurno3Linhas } = await import('../../lib/exportPDF');
    exportPassagemTurno3Linhas(rows, blocks, userEmail);
  };

  if (loading || fetching) {
    return <div className="text-center text-app-text-muted py-12 animate-pulse">Montando passagem de turno…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="bg-app-card border border-app-border rounded-xl p-8 text-center text-app-text-muted text-sm">
        Nenhum paciente ativo para passagem.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-app-text">
          <ClipboardList className="w-4 h-4" />
          Passagem de Turno — {rows.length} pacientes
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-app-tertiary border border-app-border rounded-lg hover:bg-app-tertiary/70"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar
          </button>
          <button
            onClick={handlePDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-app-accent hover:bg-app-accent-hover text-white rounded-lg"
          >
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Tabela densa — design original restaurado */}
      <div className="overflow-x-auto rounded-xl border border-app-border shadow-sm">
        <table className="w-full text-[11px] border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-900 text-slate-200 sticky top-0 z-10">
              <th className="px-2 py-2 text-left font-bold border-r border-slate-700 w-12">UTI</th>
              <th className="px-2 py-2 text-center font-bold border-r border-slate-700 w-10">Lt</th>
              <th className="px-2 py-2 text-left font-bold border-r border-slate-700 w-36">Nome</th>
              <th className="px-2 py-2 text-center font-bold border-r border-slate-700 w-14">SOFA</th>
              <th className="px-2 py-2 text-center font-bold border-r border-slate-700 w-16">Grav.</th>
              <th className="px-2 py-2 text-center font-bold border-r border-slate-700 w-10">D</th>
              <th className="px-2 py-2 text-left font-bold border-r border-slate-700">Muda-conduta (L2)</th>
              <th className="px-2 py-2 text-left font-bold">Pendências / Riscos (L3)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const sev = getSeverity(row.gravidade);
              const block = blocks[i];
              if (!block) return null;
              const delta = row.delta_sofa_24h;

              return (
                <tr
                  key={row.paciente_id}
                  className={`border-b border-app-border/60 hover:bg-app-tertiary/30 ${sev.cardClass}`}
                >
                  <td className="px-2 py-2 font-mono text-app-text-muted border-r border-app-border/30">{row.uti}</td>
                  <td className="px-2 py-2 text-center font-black text-base tabular-nums border-r border-app-border/30">{row.leito}</td>
                  <td className="px-2 py-2 font-semibold text-app-text border-r border-app-border/30 truncate max-w-[140px]" title={row.nome}>
                    {row.nome}
                  </td>
                  <td className={`px-2 py-2 text-center font-bold tabular-nums border-r border-app-border/30 ${sofaColorClass(row.sofa_total)}`}>
                    {row.sofa_total ?? '—'}
                    {delta != null && delta !== 0 && (
                      <span className={`block text-[9px] ${delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-app-border/30">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.badgeClass}`}>
                      {sev.label}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center text-app-text-muted tabular-nums border-r border-app-border/30">
                    {row.dias_internacao}
                  </td>
                  <td className="px-2 py-2 text-app-text-2 leading-snug border-r border-app-border/30 align-top">
                    {block.linha2}
                  </td>
                  <td className="px-2 py-2 text-app-text-muted leading-snug align-top">
                    {block.linha3}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-app-text-muted text-center">
        Linha 1 (identidade) implícita nas colunas UTI/Leito/Nome/SOFA · PDF exporta as 3 linhas completas com paginação automática
      </p>
    </div>
  );
}

async function fetchEvol(pacienteId: string) {
  const { data } = await supabase.from('evolucoes').select('*')
    .eq('paciente_id', pacienteId).order('data_evolucao', { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function fetchPends(pacienteId: string) {
  const { data } = await supabase.from('pendencias').select('*').eq('paciente_id', pacienteId);
  return data ?? [];
}