// ============================================================================
// Tabelão Laboratorial editável — Exame | Val1 | Val2 | Unid | Ref | Tend | Alerta
// ============================================================================
import type { TabelaoRow } from '../../lib/clinicalExtract';

export type EditableTabelaoRow = TabelaoRow & { key: string };

interface Props {
  rows: EditableTabelaoRow[];
  onChange: (rows: EditableTabelaoRow[]) => void;
}

export default function TabelaoLabsEditable({ rows, onChange }: Props) {
  const update = (idx: number, field: keyof EditableTabelaoRow, value: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'val1' || field === 'val2') {
      const v1 = field === 'val1' ? value : next[idx].val1;
      const v2 = field === 'val2' ? value : next[idx].val2;
      if (v1 && v2 && v1 !== v2) {
        next[idx].tendencia = `${v2} → ${v1}`;
      } else if (!v1 || !v2) {
        next[idx].tendencia = '';
      }
    }
    onChange(next);
  };

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
          {rows.map((row, i) => (
            <tr
              key={row.key}
              className={`border-b border-app-border/60 ${i % 2 ? 'bg-app-tertiary/10' : 'bg-app-card'}`}
            >
              <td className="px-2 py-1 font-bold text-app-text border-r border-app-border/40 sticky left-0 bg-inherit z-10">
                {row.exame}
              </td>
              {(['val1', 'val2', 'alerta'] as const).map(field => (
                <td key={field} className="px-1 py-0.5 border-r border-app-border/20">
                  <input
                    type="text"
                    value={row[field]}
                    onChange={e => update(i, field, e.target.value)}
                    className="w-full bg-app-tertiary/50 border border-app-border/40 rounded px-1 py-0.5 text-[11px] text-app-text text-center focus:outline-none focus:border-app-accent tabular-nums"
                    placeholder="—"
                  />
                </td>
              ))}
              <td className="px-2 py-1 text-center text-app-text-muted border-r border-app-border/30">
                {row.unidade || '—'}
              </td>
              <td className="px-2 py-1 text-center text-app-text-muted border-r border-app-border/30 text-[10px]">
                {row.ref || '—'}
              </td>
              <td className={`px-2 py-1 text-center border-r border-app-border/30 ${
                row.tendencia.includes('→') ? 'text-amber-400' : 'text-app-text-muted'
              }`}>
                {row.tendencia || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}