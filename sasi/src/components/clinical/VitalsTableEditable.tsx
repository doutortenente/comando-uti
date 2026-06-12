// ============================================================================
// Planilhão FASE 1 — Sinais Vitais editáveis (espelho Excel SASI_UTI_20Leitos)
// Colunas: Parâmetro | Máximo | Mínimo | Unidade | Limite HITL | Obs/Tag
// ============================================================================
import type { PlanilhaoVitalRow } from '../../lib/sasiSchema';

interface Props {
  rows: PlanilhaoVitalRow[];
  onChange: (rows: PlanilhaoVitalRow[]) => void;
}

export default function VitalsTableEditable({ rows, onChange }: Props) {
  const update = (idx: number, field: keyof PlanilhaoVitalRow, value: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-app-border">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-900 text-slate-200">
            <th className="text-left px-2 py-1.5 font-bold border-r border-slate-700 w-36 sticky left-0 bg-slate-900 z-10">Parâmetro</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 min-w-[56px]">Máximo</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 min-w-[56px]">Mínimo</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 w-16">Unidade</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 w-20">Limite HITL</th>
            <th className="text-left px-2 py-1.5 font-bold">Obs/Tag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              className={`border-b border-app-border/50 ${i % 2 ? 'bg-app-tertiary/10' : 'bg-app-card'}`}
            >
              <td className="px-2 py-1 font-bold text-app-text border-r border-app-border/30 sticky left-0 bg-inherit z-10">
                {row.label}
              </td>
              {(['max', 'min'] as const).map(field => (
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
                {row.limite || '—'}
              </td>
              <td className="px-1 py-0.5">
                <input
                  type="text"
                  value={row.obs}
                  onChange={e => update(i, 'obs', e.target.value)}
                  className="w-full bg-app-tertiary/50 border border-app-border/40 rounded px-1 py-0.5 text-[11px] text-app-text focus:outline-none focus:border-app-accent"
                  placeholder="—"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}