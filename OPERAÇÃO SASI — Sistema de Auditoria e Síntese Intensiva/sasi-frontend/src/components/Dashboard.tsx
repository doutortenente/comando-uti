// ============================================================================
// SASI · Dashboard — sala de guerra das 3 UTIs (33 leitos)
// 3 view modes: plantao (Cards) / round (Split) / editor (Tabela)
// 3 themes (via UIProvider): dark / clinical / light
// ============================================================================
import { useCallback, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
// AUTH BYPASS: supabase import removido (era usado só pelo logout)
// import { supabase } from '../lib/supabaseClient';
import { useSupabasePatients } from '../hooks/useSupabasePatients';
import { useClinicalAlerts } from '../hooks/useClinicalAlerts';
import { useUI } from '../lib/theme';
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts';
import LeitoCard from './LeitoCard';
import PatientModal from './PatientModal';
import ThemeToggle from './ThemeToggle';
import ViewSwitcher from './ViewSwitcher';
import CriticalAlerts from './CriticalAlerts';
import SplitView from './SplitView';
import TableView from './TableView';
import { Bell, BedDouble, ClipboardCopy, FileDown, Filter, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { LeitoCardSkeleton, SplitSkeleton, EmptyState } from './Skeletons';
import NovoLeitoModal from './NovoLeitoModal';
import { gerarTextoPlantao } from '../lib/drugs';
import { useToasts } from '../lib/useToasts';
// Lazy import pra não incluir jspdf (200KB+) no bundle inicial
const lazyExportPDF = () => import('../lib/exportPDF');

interface Props {
  session: Session;
}

const UTIS = ['UTI2', 'UTI3', 'UTI4'] as const;
type UtiFilter = (typeof UTIS)[number] | 'TODAS';

export default function Dashboard({ session }: Props) {
  const { dashboard, loading, error } = useSupabasePatients();
  const { totalCriticos, totalWarnings } = useClinicalAlerts();
  const { addToast } = useToasts();
  const { viewMode, setViewMode, cycleTheme } = useUI();
  const [filter, setFilter] = useState<UtiFilter>('TODAS');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNovoLeito, setShowNovoLeito] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Atalhos de teclado globais — ativos quando nenhum modal está aberto
  const noModal = !selectedId && !showNovoLeito;
  const shortcuts = useCallback(() => ({
    'j': () => {/* next patient — futuramente com selectedIndex */},
    'k': () => {/* prev patient */},
    't': cycleTheme,
    'n': () => setShowNovoLeito(true),
    '?': () => setShowShortcuts((v) => !v),
    'Escape': () => { setShowShortcuts(false); setSelectedId(null); },
    'g p': () => setViewMode('plantao'),
    'g r': () => setViewMode('round'),
    'g e': () => setViewMode('editor'),
  }), [cycleTheme, setViewMode]);
  useKeyboardShortcuts(shortcuts(), noModal);

  const visible = useMemo(
    () => (filter === 'TODAS' ? dashboard : dashboard.filter((r) => r.uti === filter)),
    [dashboard, filter]
  );

  const stats = useMemo(() => {
    const total = dashboard.length;
    const criticos = dashboard.filter((r) => r.gravidade === 'critico').length;
    const graves = dashboard.filter((r) => r.gravidade === 'grave').length;
    const piorando = dashboard.filter((r) => (r.delta_sofa_24h ?? 0) > 0).length;
    return { total, criticos, graves, piorando };
  }, [dashboard]);

  // AUTH BYPASS: logout desabilitado temporariamente. Reativar com auth.
  // async function logout() { await supabase.auth.signOut(); }

  return (
    <div className="min-h-screen bg-app text-app-text">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-app-card/95 backdrop-blur border-b border-app-border">
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
                    const texto = gerarTextoPlantao(visible, filter);
                    await navigator.clipboard.writeText(texto);
                    addToast('success', `Plantão copiado (${visible.length} pacientes)`);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2 text-xs font-medium rounded-lg border border-app-border transition"
                  title="Copiar passagem de turno (texto pra WhatsApp)"
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
                  title="Exportar passagem de turno (PDF)"
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
            {/* AUTH BYPASS: botão logout oculto. Reativar com auth.
            <button
              onClick={logout}
              className="p-2 hover:bg-app-tertiary rounded text-app-text-muted hover:text-app-text transition"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
            */}
          </div>
        </div>

        {/* STATS BAR */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-app-text-muted">
            <Users className="w-3.5 h-3.5" />
            <span>
              <b className="text-app-text">{stats.total}</b> ativos
            </span>
            {stats.criticos > 0 && (
              <span className="text-red-400 ml-2">
                <b>{stats.criticos}</b> crítico{stats.criticos > 1 ? 's' : ''}
              </span>
            )}
            {stats.graves > 0 && (
              <span className="text-orange-400 ml-2">
                <b>{stats.graves}</b> grave{stats.graves > 1 ? 's' : ''}
              </span>
            )}
            {stats.piorando > 0 && (
              <span className="text-red-300 ml-2">
                ↑SOFA: <b>{stats.piorando}</b>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Filter className="w-3.5 h-3.5 text-app-text-muted" />
            {(['TODAS', ...UTIS] as UtiFilter[]).map((u) => (
              <button
                key={u}
                onClick={() => setFilter(u)}
                className={`text-xs px-2.5 py-1 rounded transition ${
                  filter === u
                    ? 'bg-app-accent text-white'
                    : 'bg-app-tertiary text-app-text-muted hover:bg-app-tertiary/70 hover:text-app-text-2'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Critical alerts banner — sempre visível pra trazer críticos pra cima */}
        <CriticalAlerts patients={visible} onSelect={setSelectedId} />

        {loading && viewMode === 'plantao' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <LeitoCardSkeleton key={i} />
            ))}
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
          <EmptyState
            icon={BedDouble}
            title={filter !== 'TODAS' ? `Nenhum leito ativo em ${filter}` : 'Nenhum leito ativo'}
            description="Admita um paciente usando a skill sasi-ingest-export ou o botão Novo Leito (em breve)."
          />
        )}

        {/* VIEW MODES */}
        {!loading && visible.length > 0 && (
          <>
            {viewMode === 'plantao' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {visible.map((row) => (
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
          onSuccess={() => {
            // Realtime já recarrega automaticamente via channel listener.
          }}
        />
      )}

      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-app-card border border-app-border rounded-2xl shadow-2xl p-6 w-full max-w-sm sasi-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-app-text mb-4">Atalhos de teclado</h3>
            <div className="space-y-1.5 text-xs">
              {[
                ['?', 'Abrir/fechar este painel'],
                ['t', 'Ciclar tema (dark → clinical → light)'],
                ['n', 'Novo leito'],
                ['Esc', 'Fechar modal / painel'],
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
