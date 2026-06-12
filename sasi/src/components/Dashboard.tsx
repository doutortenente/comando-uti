// ============================================================================
// SASI · Dashboard — sala de guerra das 3 UTIs (33 leitos) · Plantão Board
// Shell: Sidebar (rail navy) + TopBar + FiltersBar + conteúdo rolável
// 3 view modes: plantao (Cards) / round (Split) / editor (Tabela)
// 3 themes (via UIProvider): dark / clinical / light
// Smart filters: Críticos | ↑SOFA | DVA | VM | Sem evolução | Busca
// ============================================================================
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabasePatients } from '../hooks/useSupabasePatients';
import { useClinicalAlerts } from '../hooks/useClinicalAlerts';
import { useUI } from '../lib/theme';
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts';
import {
  SMART_FILTERS, rowHasDVA, rowHasVM, rowSemEvolucao,
  type SmartFilter, type UtiFilter,
} from '../lib/dashboardFilters';
import LeitoCard from './LeitoCard';
import PatientModal from './PatientModal';
import CriticalAlerts from './CriticalAlerts';
import SplitView from './SplitView';
import TableView from './TableView';
import Sidebar, { type SasiView } from './Sidebar';
import PacientesIndex from './PacientesIndex';
import PacientePage from './PacientePage';
import TopBar from './TopBar';
import FiltersBar from './FiltersBar';
import { BedDouble } from 'lucide-react';
import { LeitoCardSkeleton, SplitSkeleton, EmptyState } from './Skeletons';
import NovoLeitoModal from './NovoLeitoModal';
import { gerarTextoPlantao } from '../lib/drugs';
import { useToasts } from '../lib/useToasts';

const lazyExportPDF = () => import('../lib/exportPDF');

interface Props {
  session: Session;
}

export default function Dashboard({ session }: Props) {
  const { dashboard, loading, error } = useSupabasePatients();
  const { totalCriticos, totalWarnings } = useClinicalAlerts();
  const { addToast } = useToasts();
  const { viewMode, setViewMode, cycleTheme } = useUI();
  const [activeView, setActiveView] = useState<SasiView>('overview');
  const [pacientePageId, setPacientePageId] = useState<string | null>(null);
  const [utiFilter, setUtiFilter] = useState<UtiFilter>('TODAS');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('todos');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNovoLeito, setShowNovoLeito] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  const noModal = !selectedId && !showNovoLeito;
  const shortcuts = useCallback(() => ({
    'j': () => {},
    'k': () => {},
    't': cycleTheme,
    'n': () => setShowNovoLeito(true),
    '?': () => setShowShortcuts(v => !v),
    'Escape': () => { setShowShortcuts(false); setSelectedId(null); setSearch(''); setPacientePageId(null); },
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

  const handleCopiar = useCallback(async () => {
    const texto = gerarTextoPlantao(visible, utiFilter);
    await navigator.clipboard.writeText(texto);
    addToast('success', `Plantão copiado (${visible.length} pacientes)`);
  }, [visible, utiFilter, addToast]);

  const handleExportPDF = useCallback(async () => {
    const { exportPassagemTurno } = await lazyExportPDF();
    exportPassagemTurno(visible, session.user.email ?? undefined);
  }, [visible, session.user.email]);

  // Alertas vivem na Visão Geral: navega pra ela antes de rolar ao banner.
  const scrollToAlertas = useCallback(() => {
    setActiveView('overview');
    setPacientePageId(null);
    requestAnimationFrame(() => {
      alertsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleNavigate = useCallback((view: SasiView) => {
    setActiveView(view);
    setPacientePageId(null);
  }, []);

  const openProntuario = useCallback((id: string) => {
    setSelectedId(null);
    setActiveView('pacientes');
    setPacientePageId(id);
  }, []);

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
    <div className="flex h-screen overflow-hidden bg-app text-app-text">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onPassagemClick={handleExportPDF}
        onAlertasClick={scrollToAlertas}
        alertasCriticos={totalCriticos}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          sessionEmail={session.user.email}
          totalCriticos={totalCriticos}
          totalWarnings={totalWarnings}
          hasPatients={dashboard.length > 0}
          onNovoLeito={() => setShowNovoLeito(true)}
          onCopiar={handleCopiar}
          onExportPDF={handleExportPDF}
        />

        <div className="flex-1 overflow-y-auto">
          {activeView === 'pacientes' && (
            <main className="px-5 py-4">
              {pacientePageId ? (
                <PacientePage
                  pacienteId={pacientePageId}
                  onBack={() => setPacientePageId(null)}
                />
              ) : (
                <PacientesIndex
                  patients={dashboard}
                  loading={loading}
                  onOpen={setPacientePageId}
                />
              )}
            </main>
          )}

          {activeView === 'overview' && (
          <>
          <FiltersBar
            search={search}
            setSearch={setSearch}
            utiFilter={utiFilter}
            setUtiFilter={setUtiFilter}
            smartFilter={smartFilter}
            setSmartFilter={setSmartFilter}
            smartCounts={smartCounts}
            stats={stats}
          />

          <main className="px-5 py-4">
            <div ref={alertsRef} className="scroll-mt-2">
              <CriticalAlerts patients={visible} onSelect={setSelectedId} />
            </div>

            {loading && viewMode === 'plantao' && (
              <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
          </>
          )}

          <footer className="px-5 py-6 text-[11px] text-app-text-muted text-center flex items-center justify-center gap-3">
            <span>SASI v1.0 · Supabase realtime · LGPD-RLS · {new Date().toLocaleString('pt-BR')}</span>
            <button
              onClick={() => setShowShortcuts(true)}
              className="px-1.5 py-0.5 rounded border border-app-border bg-app-tertiary hover:text-app-text-2 transition text-[10px] font-mono"
            >
              ? atalhos
            </button>
          </footer>
        </div>
      </div>

      {selectedId && (
        <PatientModal
          pacienteId={selectedId}
          onClose={() => setSelectedId(null)}
          onOpenProntuario={openProntuario}
        />
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
