// ============================================================================
// Tabelão de Exames Laboratoriais — formato SASI Excel
// Colunas: Exame | Val 1 | Val 2 (→) | Unidade | Ref. | Tend. | Alerta
// ============================================================================
import type { TabelaoRow } from '../../lib/clinicalExtract';

interface Props {
  rows: TabelaoRow[];
  compact?: boolean;
}

export default function TabelaoLabs({ rows, compact = false }: Props) {
  const hasData = rows.some(r => r.val1 || r.val2 || r.tendencia);
  if (!hasData) {
    return (
      <p className="text-sm text-app-text-muted py-2">
        Sem valores laboratoriais registrados. Preencha na Ficha de Evolução ou via ingest SASI.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-app-border">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-900 text-slate-200">
            <th className="text-left px-2 py-1.5 font-bold border-r border-slate-700 sticky left-0 bg-slate-900 z-10">Exame</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 min-w-[52px]">Val 1</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 min-w-[52px]">Val 2 →</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700">Unid</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700">Ref.</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700">Tend.</th>
            <th className="text-center px-2 py-1.5 font-bold">Alerta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const filled = row.val1 || row.val2;
            return (
              <tr
                key={row.exame}
                className={`border-b border-app-border/60 ${
                  filled ? 'bg-app-card' : 'bg-app-tertiary/20 opacity-60'
                } ${i % 2 === 0 ? '' : 'bg-app-tertiary/10'}`}
              >
                <td className="px-2 py-1 font-bold text-app-text border-r border-app-border/40 sticky left-0 bg-inherit z-10">
                  {row.exame}
                </td>
                <td className={`px-2 py-1 text-center tabular-nums font-semibold border-r border-app-border/30 ${
                  row.val1 ? 'text-app-text' : 'text-app-text-muted'
                }`}>
                  {row.val1 || '—'}
                </td>
                <td className="px-2 py-1 text-center tabular-nums text-app-text-muted border-r border-app-border/30">
                  {row.val2 || '—'}
                </td>
                <td className="px-2 py-1 text-center text-app-text-muted border-r border-app-border/30">
                  {row.unidade || '—'}
                </td>
                <td className="px-2 py-1 text-center text-app-text-muted border-r border-app-border/30">
                  {row.ref || '—'}
                </td>
                <td className={`px-2 py-1 text-center border-r border-app-border/30 ${
                  row.tendencia.includes('→') ? 'text-amber-400 font-medium' : 'text-app-text-muted'
                }`}>
                  {row.tendencia || '—'}
                </td>
                <td className={`px-2 py-1 text-center ${row.alerta ? 'text-red-400 font-bold' : 'text-app-text-muted'}`}>
                  {row.alerta || (compact ? '' : '—')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}