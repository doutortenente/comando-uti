// ============================================================================
// SASI · FiltersBar — stats clicáveis + busca + filtro UTI + smart filter pills
// Extraído do header do Dashboard (linhas 2 e 3) para o shell Plantão Board.
// Mesmo comportamento; estado vive no Dashboard e chega via props.
// ============================================================================
import { Filter, Search, Users, X } from 'lucide-react';
import {
  SMART_FILTERS, UTIS,
  type SmartFilter, type UtiFilter,
} from '../lib/dashboardFilters';

interface Stats {
  total: number;
  criticos: number;
  graves: number;
  piorando: number;
}

interface Props {
  search: string;
  setSearch: (v: string) => void;
  utiFilter: UtiFilter;
  setUtiFilter: (v: UtiFilter) => void;
  smartFilter: SmartFilter;
  setSmartFilter: (v: SmartFilter) => void;
  smartCounts: Record<SmartFilter, number>;
  stats: Stats;
}

export default function FiltersBar({
  search, setSearch, utiFilter, setUtiFilter,
  smartFilter, setSmartFilter, smartCounts, stats,
}: Props) {
  return (
    <div className="bg-app-card/95 backdrop-blur border-b border-app-border">
      {/* Linha 1: stats clicáveis + busca + filtro UTI */}
      <div className="px-5 pt-2 pb-2 flex flex-wrap items-center gap-2">
        {/* Stats — números de críticos e ↑SOFA ativam o smart filter */}
        <div className="flex items-center gap-2 text-xs text-app-text-muted flex-1 min-w-0 flex-wrap">
          <span className="flex items-center gap-1 shrink-0">
            <Users className="w-3.5 h-3.5" />
            <b className="text-app-text">{stats.total}</b> ativos
          </span>
          {stats.criticos > 0 && (
            <button
              onClick={() => setSmartFilter(smartFilter === 'critico' ? 'todos' : 'critico')}
              className={`transition hover:opacity-80 rounded px-1 font-semibold ${
                smartFilter === 'critico' ? 'text-red-300 underline underline-offset-2' : 'text-red-400'
              }`}
              title="Filtrar críticos"
            >
              <b>{stats.criticos}</b> crítico{stats.criticos > 1 ? 's' : ''}
            </button>
          )}
          {stats.graves > 0 && (
            <span className="text-orange-400">
              <b>{stats.graves}</b> grave{stats.graves > 1 ? 's' : ''}
            </span>
          )}
          {stats.piorando > 0 && (
            <button
              onClick={() => setSmartFilter(smartFilter === 'sofa_up' ? 'todos' : 'sofa_up')}
              className={`transition hover:opacity-80 rounded px-1 ${
                smartFilter === 'sofa_up' ? 'text-red-200 underline underline-offset-2' : 'text-red-300'
              }`}
              title="Filtrar ↑SOFA"
            >
              ↑SOFA: <b>{stats.piorando}</b>
            </button>
          )}
        </div>

        {/* Busca por nome ou leito */}
        <div className="relative flex items-center shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2 text-app-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nome ou leito…"
            className="pl-7 pr-6 py-1 text-xs bg-app-tertiary border border-app-border rounded-lg text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-accent w-36 focus:w-48 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-1.5 text-app-text-muted hover:text-app-text"
              aria-label="Limpar busca"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filtro por UTI */}
        <div className="flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5 text-app-text-muted" />
          {(['TODAS', ...UTIS] as UtiFilter[]).map(u => (
            <button
              key={u}
              onClick={() => setUtiFilter(u)}
              className={`text-xs px-2.5 py-1 rounded transition ${
                utiFilter === u
                  ? 'bg-app-accent text-white'
                  : 'bg-app-tertiary text-app-text-muted hover:bg-app-tertiary/70 hover:text-app-text-2'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Linha 2: smart filter pills */}
      <div className="px-5 pb-2.5 flex items-center gap-1.5 overflow-x-auto">
        {SMART_FILTERS.map(f => {
          const count = smartCounts[f.id];
          const isActive = smartFilter === f.id;
          const hasResults = f.id === 'todos' || count > 0;
          return (
            <button
              key={f.id}
              onClick={() => setSmartFilter(f.id)}
              disabled={!hasResults}
              className={`shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition ${
                isActive
                  ? `${f.activeClass} border-transparent font-semibold`
                  : hasResults
                  ? 'bg-app-tertiary text-app-text-muted border-app-border hover:text-app-text-2 hover:bg-app-tertiary/70'
                  : 'bg-app-tertiary/40 text-app-text-muted/40 border-app-border/40 cursor-not-allowed'
              }`}
              title={`${f.label}: ${count} paciente${count !== 1 ? 's' : ''}`}
            >
              {f.icon}
              <span>{f.label}</span>
              {f.id !== 'todos' && (
                <span className="font-bold tabular-nums">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
