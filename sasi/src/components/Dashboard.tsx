// ============================================================================
// SASI · Dashboard — sala de guerra das 3 UTIs (33 leitos)
// 3 view modes: plantao (Cards) / round (Split) / editor (Tabela)
// 3 themes (via UIProvider): dark / clinical / light
// Smart filters: Críticos | ↑SOFA | DVA | VM | Sem evolução | Busca
// ============================================================================
import { useCallback, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabasePatients } from '../hooks/useSupabasePatients';
import { useClinicalAlerts } from '../hooks/useClinicalAlerts';
import { useUI } from '../lib/theme';
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts';
import type { DashboardRow } from '../lib/supabaseClient';
import LeitoCard from './LeitoCard';
import PatientModal from './PatientModal';
import ThemeToggle from './ThemeToggle';
import ViewSwitcher from './ViewSwitcher';
import CriticalAlerts from './CriticalAlerts';
import SplitView from './SplitView';
import TableView from './TableView';
import {
  Bell, BedDouble, ClipboardCopy, FileDown, Filter,
  Heart, Plus, RefreshCw, Search, ShieldCheck, Users, Wind, X,
} from 'lucide-react';
import { LeitoCardSkeleton, SplitSkeleton, EmptyState } from './Skeletons';
import NovoLeitoModal from './NovoLeitoModal';
import { gerarTextoPlantao } from '../lib/drugs';
import { useToasts } from '../lib/useToasts';

const lazyExportPDF = () => import('../lib/exportPDF');

interface Props {
  session: Session;
}

const UTIS = ['UTI2', 'UTI3', 'UTI4'] as const;
type UtiFilter = (typeof UTIS)[number] | 'TODAS';
type SmartFilter = 'todos' | 'critico' | 'sofa_up' | 'dva' | 'vm' | 'sem_evolucao';

function rowHasVM(row: DashboardRow): boolean {
  const snapshot = row.sofa_snapshot as Record<string, unknown> | undefined;
  const resp = snapshot?.resp as Record<string, unknown> | undefined;
  if (!resp) return false;
  const suporte = String(resp.suporte ?? resp.modo_ventilatorio ?? resp.via_aerea ?? '');
  return /IOT|TOT|TQT|VMI|ventila/i.test(suporte);
}

function rowHasDVA(row: DashboardRow): boolean {
  return Array.isArray(row.dvas) && row.dvas.length > 0;
}

function rowSemEvolucao(row: DashboardRow): boolean {
  return !row.ultima_evolucao;
}

const SMART_FILTERS: Array<{
  id: SmartFilter;
  label: string;
  count: (rows: DashboardRow[]) => number;
  activeClass: string;
  icon?: React.ReactNode;
}> = [
  {
    id: 'todos',
    label: 'Todos',
    count: rows => rows.length,
    activeClass: 'bg-app-accent text-white',
  },
  {
    id: 'critico',
    label: 'Críticos',
    count: rows => rows.filter(r => r.gravidade === 'critico').length,
    activeClass: 'bg-red-700 text-red-100',
  },
  {
    id: 'sofa_up',
    label: 'Piora SOFA 24h',
    count: rows => rows.filter(r => (r.delta_sofa_24h ?? 0) > 0).length,
    activeClass: 'bg-red-900 text-red-200',
  },
  {
    id: 'dva',
    label: 'Em DVA',
    count: rows => rows.filter(rowHasDVA).length,
    activeClass: 'bg-rose-900 text-rose-200',
    icon: <Heart className="w-3 h-3" />,
  },
  {
    id: 'vm',
    label: 'VM',
    count: rows => rows.filter(rowHasVM).length,
    activeClass: 'bg-sky-900 text-sky-200',
    icon: <Wind className="w-3 h-3" />,
  },
  {
    id: 'sem_evolucao',
    label: 'Sem evolução',
    count: rows => rows.filter(rowSemEvolucao).length,
    activeClass: 'bg-amber-900 text-amber-200',
  },
];

export default function Dashboard({ session }: Props) {
  const { dashboard, loading, error } = useSupabasePatients();
  const { totalCriticos, totalWarnings } = useClinicalAlerts();
  const { addToast } = useToasts();
  const { viewMode, setViewMode, cycleTheme } = useUI();
  const [utiFilter, setUtiFilter] = useState<UtiFilter>('TODAS');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('todos');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNovoLeito, setShowNovoLeito] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const noModal = !selectedId && !showNovoLeito;
  const shortcuts = useCallback(() => ({
    'j': () => {},
    'k': () => {},
    't': cycleTheme,
    'n': () => setShowNovoLeito(true),
    '?': () => setShowShortcuts(v => !v),
    'Escape': () => { setShowShortcuts(false); setSelectedId(null); setSearch(''); },
    'g p': () => setViewMode('plantao'),
    'g r': () => setViewMode('round'),
    'g e': () => setViewMode('editor'),
  }), [cycleTheme, setViewMode]);
  useKeyboardShortcuts(shortcuts(), noModal);

  // Base: filtrado por UTI — base para contar os smart filter pills
  const base = useMemo(
    () => utiFilter === 'TODAS' ? dashboard : dashboard.filter(r => r.uti === utiFilter),
    [dashboard, utiFilter]
  );

  // Contagens dos smart filters (sempre da base UTI, independente de smart/search)
  const smartCounts = useMemo(() => ({
    todos: base.length,
    critico: base.filter(r => r.gravidade === 'critico').length,
    sofa_up: base.filter(r => (r.delta_sofa_24h ?? 0) > 0).length,
    dva: base.filter(rowHasDVA).length,
    vm: base.filter(rowHasVM).length,
    sem_evolucao: base.filter(rowSemEvolucao).length,
  }), [base]);

  // Visible: base + smart filter + busca
  const visible = useMemo(() => {
    let result = base;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        r.nome.toLowerCase().includes(q) || r.leito.toLowerCase().includes(q)
      );
    }

    switch (smartFilter) {
      case 'critico':      return result.filter(r => r.gravidade === 'critico');
      case 'sofa_up':      return result.filter(r => (r.delta_sofa_24h ?? 0) > 0);
      case 'dva':          return result.filter(rowHasDVA);
      case 'vm':           return result.filter(rowHasVM);
      case 'sem_evolucao': return result.filter(rowSemEvolucao);
      default:             return result;
    }
  }, [base, smartFilter, search]);

  const stats = useMemo(() => ({
    total: base.length,
    criticos: base.filter(r => r.gravidade === 'critico').length,
    graves: base.filter(r => r.gravidade === 'grave').length,
    piorando: base.filter(r => (r.delta_sofa_24h ?? 0) > 0).length,
  }), [base]);

  const emptyTitle = (() => {
    if (smartFilter !== 'todos') {
      const label = SMART_FILTERS.find(f => f.id === smartFilter)?.label ?? smartFilter;
      return `Nenhum paciente com filtro "${label}"`;
    }
    if (search) return `Nenhum resultado para "${search}"`;
    if (utiFilter !== 'TODAS') return `Nenhum leito ativo em ${utiFilter}`;
    return 'Nenhum leito ativo';
  })();

  const emptyDesc = smartFilter !== 'todos' || search
    ? 'Tente remover o filtro ou a busca para ver todos.'
    : 'Admita um paciente usando a skill sasi-ingest-export ou o botão Novo Leito.';

  return (
    <div className="min-h-screen bg-app text-app-text">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-app-card/95 backdrop-blur border-b border-app-border">
        {/* Linha 1: logo + ações */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-app-accent p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold">SASI · Comando UTI Alpha</div>
              <div className="text-[11px] text-app-text-muted">
                {session.user.email === 'dev@sasi-uti.local' ? 'Modo dev · sem auth' : session.user.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalCriticos > 0 && (
              <div className="flex items-center gap-1.5 bg-red-950 text-red-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                <Bell className="w-3.5 h-3.5" /> {totalCriticos} CRÍTICOS
              </div>
            )}
            {totalWarnings > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-950 text-amber-300 px-2.5 py-1 rounded-lg text-xs">
                {totalWarnings} warnings
              </div>
            )}
            <button
              onClick={() => setShowNovoLeito(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
              title="Admitir paciente"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Leito
            </button>
            {dashboard.length > 0 && (
              <>
                <button
                  onClick={async () => {
                    const texto = gerarTextoPlantao(visible, utiFilter);
                    await navigator.clipboard.writeText(texto);
                    addToast('success', `Plantão copiado (${visible.length} pacientes)`);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2 text-xs font-medium rounded-lg border border-app-border transition"
                  title="Copiar passagem de turno"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  Copiar
                </button>
                <button
                  onClick={async () => {
                    const { exportPassagemTurno } = await lazyExportPDF();
                    exportPassagemTurno(visible, session.user.email ?? undefined);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2 text-xs font-medium rounded-lg border border-app-border transition"
                  title="Exportar PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  PDF
                </button>
              </>
            )}
            <ViewSwitcher />
            <ThemeToggle />
            <button
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-app-tertiary rounded text-app-text-muted hover:text-app-text transition"
              title="Recarregar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Linha 2: stats clicáveis + busca + filtro UTI */}
        <div className="max-w-7xl mx-auto px-4 pb-2 flex flex-wrap items-center gap-2">
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

        {/* Linha 3: smart filter pills */}
        <div className="max-w-7xl mx-auto px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto">
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
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <CriticalAlerts patients={visible} onSelect={setSelectedId} />

        {loading && viewMode === 'plantao' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <LeitoCardSkeleton key={i} />)}
          </div>
        )}
        {loading && viewMode === 'round' && <SplitSkeleton />}
        {loading && viewMode === 'editor' && (
          <div className="text-center text-app-text-muted py-12 text-sm animate-pulse">
            Carregando trincheira…
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-900 rounded-lg p-4 text-red-300 text-sm">
            Erro: {error}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <EmptyState icon={BedDouble} title={emptyTitle} description={emptyDesc} />
        )}

        {!loading && visible.length > 0 && (
          <>
            {viewMode === 'plantao' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {visible.map(row => (
                  <LeitoCard key={row.paciente_id} row={row} onSelect={setSelectedId} />
                ))}
              </div>
            )}
            {viewMode === 'round' && (
              <SplitView patients={visible} onOpenFull={setSelectedId} />
            )}
            {viewMode === 'editor' && <TableView patients={visible} onSelect={setSelectedId} />}
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-[11px] text-app-text-muted text-center flex items-center justify-center gap-3">
        <span>SASI v1.0 · Supabase realtime · LGPD-RLS · {new Date().toLocaleString('pt-BR')}</span>
        <button
          onClick={() => setShowShortcuts(true)}
          className="px-1.5 py-0.5 rounded border border-app-border bg-app-tertiary hover:text-app-text-2 transition text-[10px] font-mono"
        >
          ? atalhos
        </button>
      </footer>

      {selectedId && (
        <PatientModal pacienteId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {showNovoLeito && (
        <NovoLeitoModal
          userId={session.user.id}
          onClose={() => setShowNovoLeito(false)}
          onSuccess={() => {}}
        />
      )}

      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-app-card border border-app-border rounded-2xl shadow-2xl p-6 w-full max-w-sm sasi-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-app-text mb-4">Atalhos de teclado</h3>
            <div className="space-y-1.5 text-xs">
              {[
                ['?', 'Abrir/fechar este painel'],
                ['t', 'Ciclar tema (dark → clinical → light)'],
                ['n', 'Novo leito'],
                ['Esc', 'Fechar modal / limpar busca'],
                ['g p', 'Modo Plantão (Cards)'],
                ['g r', 'Modo Round (Split)'],
                ['g e', 'Modo Editor (Tabela)'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="shrink-0 min-w-[40px] text-center px-1.5 py-0.5 rounded border border-app-border bg-app-tertiary font-mono text-[11px] text-app-text-2">
                    {key}
                  </kbd>
                  <span className="text-app-text-muted">{desc}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-5 w-full py-2 text-sm font-medium rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
