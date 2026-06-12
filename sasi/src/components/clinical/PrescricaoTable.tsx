// ============================================================================
// Prescrição / Terapias Vigentes — formato SASI Excel FASE 2
// Colunas: Sistema | Medicamento | Dose | Via | Frequência | Horários | Obs
// ============================================================================
import type { PrescricaoItem } from '../../lib/supabaseClient';

interface Props {
  items: PrescricaoItem[];
  editable?: boolean;
  onChange?: (items: PrescricaoItem[]) => void;
}

export default function PrescricaoTable({ items, editable = false, onChange }: Props) {
  const filled = items.filter(it => it.medicamento.trim());
  const showAll = editable;

  const rows = showAll ? items : filled;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-app-text-muted py-2">
        Nenhuma prescrição vigente. Edite na Ficha de Evolução ou preencha abaixo.
      </p>
    );
  }

  const update = (idx: number, field: keyof PrescricaoItem, value: string) => {
    if (!onChange) return;
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-app-border">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-900 text-slate-200">
            <th className="text-left px-2 py-1.5 font-bold border-r border-slate-700 w-28">Sistema</th>
            <th className="text-left px-2 py-1.5 font-bold border-r border-slate-700">Medicamento</th>
            <th className="text-left px-2 py-1.5 font-bold border-r border-slate-700 w-20">Dose</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 w-14">Via</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 w-20">Freq</th>
            <th className="text-center px-2 py-1.5 font-bold border-r border-slate-700 w-20">Horários</th>
            <th className="text-left px-2 py-1.5 font-bold">Obs/Alertas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => {
            const realIdx = items.indexOf(item);
            const isNewSistema = i === 0 || rows[i - 1].sistema !== item.sistema;
            return (
              <tr
                key={`${item.sistema}-${i}`}
                className={`border-b border-app-border/50 ${
                  item.medicamento ? 'bg-app-card' : 'bg-app-tertiary/15 opacity-70'
                } ${isNewSistema && i > 0 ? 'border-t-2 border-app-border' : ''}`}
              >
                <td className="px-2 py-1 font-semibold text-app-text-2 border-r border-app-border/30 whitespace-nowrap">
                  {item.sistemaLabel}
                </td>
                {(['medicamento', 'dose', 'via', 'frequencia', 'horarios', 'obs'] as const).map(field => (
                  <td
                    key={field}
                    className={`px-1 py-0.5 border-r border-app-border/20 ${
                      field === 'via' || field === 'frequencia' || field === 'horarios' ? 'text-center' : ''
                    }`}
                  >
                    {editable ? (
                      <input
                        type="text"
                        value={item[field]}
                        onChange={e => update(realIdx, field, e.target.value)}
                        className="w-full bg-app-tertiary/50 border border-app-border/40 rounded px-1 py-0.5 text-[11px] text-app-text focus:outline-none focus:border-app-accent"
                        placeholder="—"
                      />
                    ) : (
                      <span className={`px-1 ${item[field] ? 'text-app-text' : 'text-app-text-muted'}`}>
                        {item[field] || '—'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}