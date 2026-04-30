// ============================================================================
// SASI · TableView — modo "Editor" (tabela densa estilo Excel)
// ============================================================================
import type { DashboardRow } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';

interface Props {
  patients: DashboardRow[];
  onSelect: (id: string) => void;
}

export default function TableView({ patients, onSelect }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-card">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-app-tertiary text-app-text-2">
            <Th>UTI</Th>
            <Th>Leito</Th>
            <Th>Nome</Th>
            <Th>Gravidade</Th>
            <Th>SOFA</Th>
            <Th>Δ24h</Th>
            <Th>Idade</Th>
            <Th>Peso</Th>
            <Th>DVA</Th>
            <Th>Sedação</Th>
            <Th>Pendências</Th>
            <Th>HD</Th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => {
            const delta = p.delta_sofa_24h ?? 0;
            const deltaClass =
              delta > 0 ? 'text-red-400' : delta < 0 ? 'text-emerald-400' : 'text-app-text-muted';
            const dvaCount = Array.isArray(p.dvas) ? p.dvas.length : 0;
            const sedCount = Array.isArray(p.sedativos) ? p.sedativos.length : 0;
            return (
              <tr
                key={p.paciente_id}
                onClick={() => onSelect(p.paciente_id)}
                className="cursor-pointer border-t border-app-border hover:bg-app-tertiary/50 transition"
              >
                <Td>{p.uti}</Td>
                <Td className="font-bold tabular-nums">{p.leito}</Td>
                <Td className="font-semibold text-app-text">{p.nome}</Td>
                <Td>
                  <span className={`badge gravidade-${p.gravidade} text-[10px] px-1.5 py-0.5 rounded`}>
                    {p.gravidade}
                  </span>
                </Td>
                <Td className={`font-bold tabular-nums ${sofaColorClass(p.sofa_total)}`}>
                  {p.sofa_total ?? '—'}
                </Td>
                <Td className={`tabular-nums ${deltaClass}`}>
                  {delta > 0 ? '+' : ''}
                  {delta}
                </Td>
                <Td className="tabular-nums">{p.idade ?? '—'}a</Td>
                <Td className="tabular-nums">{p.peso ?? '—'}kg</Td>
                <Td className={dvaCount > 0 ? 'text-red-400 font-semibold' : 'text-app-text-muted'}>
                  {dvaCount > 0 ? `✓ (${dvaCount})` : '—'}
                </Td>
                <Td
                  className={
                    sedCount > 0 ? 'text-purple-400 font-semibold' : 'text-app-text-muted'
                  }
                >
                  {sedCount > 0 ? `✓ (${sedCount})` : '—'}
                </Td>
                <Td className="tabular-nums">
                  {p.pendencias_abertas > 0 ? p.pendencias_abertas : '—'}
                </Td>
                <Td className="text-app-text-muted max-w-xs truncate" title={p.hd ?? undefined}>
                  {p.hd ?? '—'}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2 sticky top-0">
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-2 py-1.5 ${className}`} title={title}>
      {children}
    </td>
  );
}
