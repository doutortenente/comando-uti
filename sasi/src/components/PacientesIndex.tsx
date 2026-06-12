// ============================================================================
// SASI · PacientesIndex — view "Pacientes" do Plantão Board (índice)
// Tabela dos leitos ativos usando as rows de vw_dashboard_uti já em memória
// (realtime via useSupabasePatients — zero query nova). Clique → prontuário.
// ============================================================================
import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import type { DashboardRow } from '../lib/supabaseClient';
import { sofaColorClass } from '../lib/drugs';
import { TableRowSkeleton, EmptyState } from './Skeletons';

interface Props {
  patients: DashboardRow[];
  loading: boolean;
  onOpen: (id: string) => void;
}

const COLUNAS = ['Leito', 'UTI', 'Paciente', 'Idade', 'D', 'Grav', 'SOFA', 'Pend', 'HD'];

export default function PacientesIndex({ patients, loading, onOpen }: Props) {
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const sorted = [...patients].sort((a, b) =>
      a.leito.localeCompare(b.leito, undefined, { numeric: true })
    );
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) => r.nome.toLowerCase().includes(q) || r.leito.toLowerCase().includes(q)
    );
  }, [patients, search]);

  return (
    <div className="max-w-[1100px] mx-auto space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-app-text-muted" />
          <h2 className="text-sm font-bold text-app-text uppercase tracking-wider">
            Pacientes
          </h2>
          <span className="text-xs text-app-text-muted tabular-nums">
            {visible.length} ativo{visible.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome ou leito…"
            className="pl-8 pr-3 py-1.5 rounded-lg bg-app-tertiary border border-app-border text-xs text-app-text-2 w-52 focus:outline-none focus:ring-1 focus:ring-app-accent focus:border-app-accent transition"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-card">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-app-tertiary text-app-text-2">
              {COLUNAS.map((c) => (
                <th
                  key={c}
                  className="text-left font-semibold uppercase tracking-wider text-[9px] px-2 py-2 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={COLUNAS.length} />
              ))}

            {!loading &&
              visible.map((p) => {
                const delta = p.delta_sofa_24h ?? 0;
                const deltaClass =
                  delta > 0 ? 'text-red-400' : delta < 0 ? 'text-emerald-400' : '';
                return (
                  <tr
                    key={p.paciente_id}
                    onClick={() => onOpen(p.paciente_id)}
                    className="cursor-pointer border-t border-app-border hover:bg-app-tertiary/50 transition"
                  >
                    <td className="px-2 py-2 font-black tabular-nums text-app-text">{p.leito}</td>
                    <td className="px-2 py-2 text-[10px] text-app-text-muted">{p.uti}</td>
                    <td className="px-2 py-2 font-semibold text-app-text max-w-[220px] truncate">
                      {p.nome}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-app-text-muted">
                      {p.idade != null ? `${p.idade}a` : '—'}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-app-text-muted">
                      D{p.dias_internacao}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`gravidade-${p.gravidade} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                        {p.gravidade}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`font-bold tabular-nums ${sofaColorClass(p.sofa_total)}`}>
                        {p.sofa_total ?? '—'}
                      </span>
                      {delta !== 0 && (
                        <span className={`ml-1 text-[9px] ${deltaClass}`}>
                          {delta > 0 ? '+' : ''}
                          {delta}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {p.pendencias_abertas > 0 ? (
                        <span className="text-amber-400 font-bold">{p.pendencias_abertas}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td
                      className="px-2 py-2 text-app-text-muted max-w-[280px] truncate"
                      title={p.hd ?? undefined}
                    >
                      {p.hd ?? '—'}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {!loading && visible.length === 0 && (
          <EmptyState
            icon={Users}
            title={search ? `Nenhum resultado para "${search}"` : 'Nenhum leito ativo'}
            description={
              search
                ? 'Tente outro nome ou leito.'
                : 'Admita um paciente usando a skill sasi-ingest-export ou o botão Novo Leito.'
            }
          />
        )}
      </div>
    </div>
  );
}
