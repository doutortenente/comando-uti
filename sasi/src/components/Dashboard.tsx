// ============================================================================
// SASI · Dashboard — 5 Janelas (redesign Jun 2026)
// 1 Leitos | 2 Eixo Tempo | 3 Eixo Estado | 4 Problema→Ação | 5 Passagem
// ============================================================================
import { useCallback, useMemo, useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabasePatients } from '../hooks/useSupabasePatients';
import { usePatientDetail } from '../hooks/usePatientDetail';
import { useClinicalAlerts } from '../hooks/useClinicalAlerts';
import { useUI, type Janela } from '../lib/theme';
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts';
import type { DashboardRow } from '../lib/supabaseClient';
import ThemeToggle from './ThemeToggle';
import JanelaNav from './JanelaNav';
import PatientStrip from './PatientStrip';
import CriticalAlerts from './CriticalAlerts';
import PatientModal from './PatientModal';
import NovoLeitoModal from './NovoLeitoModal';
import JanelaLeitos from './janelas/JanelaLeitos';
import EixoTempo from './janelas/EixoTempo';
import EixoEstado from './janelas/EixoEstado';
import FichaEvolucao from './janelas/FichaEvolucao';
import PassagemTurno from './janelas/PassagemTurno';
import {
  Bell, Filter, Heart, Plus, RefreshCw, Search, ShieldCheck, Users, Wind, X,
} from 'lucide-react';
import { useToasts } from '../lib/useToasts';

const SELECTED_KEY = 'sasi.selectedPatientId';

interface Props {
  session: Session;
}

const UTIS = ['UTI2', 'UTI3', 'UTI4'] as const;
type UtiFilter = (typeof UTIS)[number] | 'TODAS';
type SmartFilter = 'todos' | 'critico' | 'watcher' | 'instavel' | 'sofa_up' | 'dva' | 'vm' | 'sem_evolucao';

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
  { id: 'todos', label: 'Todos', count: rows => rows.length, activeClass: 'bg-app-accent text-white' },
  { id: 'critico', label: 'Críticos', count: rows => rows.filter(r => r.gravidade === 'critico').length, activeClass: 'bg-red-700 text-red-100' },
  { id: 'watcher', label: 'Watcher', count: rows => rows.filter(r => r.gravidade === 'moderado').length, activeClass: 'bg-amber-700 text-amber-100' },
  { id: 'instavel', label: 'Instável', count: rows => rows.filter(r => r.gravidade === 'grave').length, activeClass: 'bg-orange-800 text-orange-100' },
  { id: 'sofa_up', label: '↑SOFA', count: rows => rows.filter(r => (r.delta_sofa_24h ?? 0) > 0).length, activeClass: 'bg-red-900 text-red-200' },
  { id: 'dva', label: 'DVA', count: rows => rows.filter(rowHasDVA).length, activeClass: 'bg-rose-900 text-rose-200', icon: <Heart className="w-3 h-3" /> },
  { id: 'vm', label: 'VM', count: rows => rows.filter(rowHasVM).length, activeClass: 'bg-sky-900 text-sky-200', icon: <Wind className="w-3 h-3" /> },
  { id: 'sem_evolucao', label: 'Sem evol.', count: rows => rows.filter(rowSemEvolucao).length, activeClass: 'bg-amber-900 text-amber-200' },
];

function readSelectedId(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export default function Dashboard({ session }: Props) {
  const { dashboard, loading, error } = useSupabasePatients();
  const { totalCriticos, totalWarnings } = useClinicalAlerts();
  const { addToast } = useToasts();
  const { janela, setJanela, cycleTheme } = useUI();

  const [utiFilter, setUtiFilter] = useState<UtiFilter>('TODAS');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('todos');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedIdState] = useState<string | null>(readSelectedId);
  const [modalId, setModalId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'detalhes' | 'evolucao'>('detalhes');
  const [showNovoLeito, setShowNovoLeito] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    try {
      if (id) window.localStorage.setItem(SELECTED_KEY, id);
      else window.localStorage.removeItem(SELECTED_KEY);
    } catch { /* no-op */ }
  }, []);

  const detail = usePatientDetail(selectedId);

  const base = useMemo(
    () => utiFilter === 'TODAS' ? dashboard : dashboard.filter(r => r.uti === utiFilter),
    [dashboard, utiFilter]
  );

  const smartCounts = useMemo(() => ({
    todos: base.length,
    critico: base.filter(r => r.gravidade === 'critico').length,
    watcher: base.filter(r => r.gravidade === 'moderado').length,
    instavel: base.filter(r => r.gravidade === 'grave').length,
    sofa_up: base.filter(r => (r.delta_sofa_24h ?? 0) > 0).length,
    dva: base.filter(rowHasDVA).length,
    vm: base.filter(rowHasVM).length,
    sem_evolucao: base.filter(rowSemEvolucao).length,
  }), [base]);

  const visible = useMemo(() => {
    let result = base;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        r.nome.toLowerCase().includes(q) || r.leito.toLowerCase().includes(q)
      );
    }
    switch (smartFilter) {
      case 'critico': return result.filter(r => r.gravidade === 'critico');
      case 'watcher': return result.filter(r => r.gravidade === 'moderado');
      case 'instavel': return result.filter(r => r.gravidade === 'grave');
      case 'sofa_up': return result.filter(r => (r.delta_sofa_24h ?? 0) > 0);
      case 'dva': return result.filter(rowHasDVA);
      case 'vm': return result.filter(rowHasVM);
      case 'sem_evolucao': return result.filter(rowSemEvolucao);
      default: return result;
    }
  }, [base, smartFilter, search]);

  const selectedRow = useMemo(
    () => visible.find(r => r.paciente_id === selectedId) ?? dashboard.find(r => r.paciente_id === selectedId) ?? null,
    [visible, dashboard, selectedId]
  );

  const navigatePatient = useCallback((dir: 1 | -1) => {
    if (visible.length === 0) return;
    const idx = selectedId ? visible.findIndex(r => r.paciente_id === selectedId) : -1;
    const next = idx < 0
      ? (dir === 1 ? 0 : visible.length - 1)
      : (idx + dir + visible.length) % visible.length;
    setSelectedId(visible[next].paciente_id);
  }, [visible, selectedId, setSelectedId]);

  const handleSelectPatient = useCallback((id: string) => {
    setSelectedId(id);
    if (janela === 'leitos') setJanela('estado');
  }, [setSelectedId, janela, setJanela]);

  // Auto-seleciona primeiro paciente se ID persistido não existe mais
  useEffect(() => {
    if (selectedId && !dashboard.some(r => r.paciente_id === selectedId) && visible.length > 0) {
      setSelectedId(visible[0].paciente_id);
    }
  }, [selectedId, dashboard, visible, setSelectedId]);

  const noModal = !modalId && !showNovoLeito;

  const shortcuts = useCallback(() => {
    const janelaMap: Record<string, Janela> = { '1': 'leitos', '2': 'tempo', '3': 'estado', '4': 'problema', '5': 'passagem' };
    const map: Record<string, () => void> = {
      'j': () => navigatePatient(1),
      'k': () => navigatePatient(-1),
      't': cycleTheme,
      'n': () => setShowNovoLeito(true),
      '?': () => setShowShortcuts(v => !v),
      'Escape': () => { setShowShortcuts(false); setModalId(null); setSearch(''); },
    };
    for (const [key, j] of Object.entries(janelaMap)) {
      map[key] = () => setJanela(j);
    }
    return map;
  }, [cycleTheme, navigatePatient, setJanela]);

  useKeyboardShortcuts(shortcuts(), noModal);

  const stats = useMemo(() => ({
    total: base.length,
    criticos: base.filter(r => r.gravidade === 'critico').length,
    watchers: base.filter(r => r.gravidade === 'moderado').length,
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

  const needsPatient = janela === 'tempo' || janela === 'estado' || janela === 'problema';

  return (
    <div className="min-h-screen bg-app text-app-text">
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

          <div className="flex items-center gap-2 flex-wrap justify-end">
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
            >
              <Plus className="w-3.5 h-3.5" /> Novo Leito
            </button>
            <JanelaNav />
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

        <div className="max-w-7xl mx-auto px-4 pb-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-app-text-muted flex-1 min-w-0 flex-wrap">
            <span className="flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5" />
              <b className="text-app-text">{stats.total}</b> ativos
            </span>
            {stats.criticos > 0 && (
              <button
                onClick={() => setSmartFilter(smartFilter === 'critico' ? 'todos' : 'critico')}
                className={`transition rounded px-1 font-semibold ${
                  smartFilter === 'critico' ? 'text-red-300 underline' : 'text-red-400'
                }`}
              >
                <b>{stats.criticos}</b> crítico{stats.criticos > 1 ? 's' : ''}
              </button>
            )}
            {stats.watchers > 0 && (
              <button
                onClick={() => setSmartFilter(smartFilter === 'watcher' ? 'todos' : 'watcher')}
                className={`transition rounded px-1 ${
                  smartFilter === 'watcher' ? 'text-amber-200 underline' : 'text-amber-400'
                }`}
              >
                <b>{stats.watchers}</b> watcher{stats.watchers > 1 ? 's' : ''}
              </button>
            )}
            {stats.piorando > 0 && (
              <button
                onClick={() => setSmartFilter(smartFilter === 'sofa_up' ? 'todos' : 'sofa_up')}
                className={`transition rounded px-1 ${
                  smartFilter === 'sofa_up' ? 'text-red-200 underline' : 'text-red-300'
                }`}
              >
                ↑SOFA: <b>{stats.piorando}</b>
              </button>
            )}
          </div>

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
              <button onClick={() => setSearch('')} className="absolute right-1.5 text-app-text-muted hover:text-app-text">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-app-text-muted" />
            {(['TODAS', ...UTIS] as UtiFilter[]).map(u => (
              <button
                key={u}
                onClick={() => setUtiFilter(u)}
                className={`text-xs px-2.5 py-1 rounded transition ${
                  utiFilter === u ? 'bg-app-accent text-white' : 'bg-app-tertiary text-app-text-muted hover:text-app-text-2'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {janela === 'leitos' && (
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
                      ? 'bg-app-tertiary text-app-text-muted border-app-border hover:text-app-text-2'
                      : 'bg-app-tertiary/40 text-app-text-muted/40 border-app-border/40 cursor-not-allowed'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                  {f.id !== 'todos' && <span className="font-bold tabular-nums">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <CriticalAlerts patients={visible} onSelect={id => { setSelectedId(id); setModalTab('detalhes'); setModalId(id); }} />

        {needsPatient && (
          <PatientStrip
            row={selectedRow}
            onPrev={() => navigatePatient(-1)}
            onNext={() => navigatePatient(1)}
            onEdit={() => {
              if (selectedId) {
                setModalTab('evolucao');
                setModalId(selectedId);
              }
            }}
            onSelectFromLeitos={() => setJanela('leitos')}
          />
        )}

        {error && (
          <div className="bg-red-950 border border-red-900 rounded-lg p-4 text-red-300 text-sm">
            Erro: {error}
          </div>
        )}

        {janela === 'leitos' && (
          <JanelaLeitos
            rows={visible}
            loading={loading}
            emptyTitle={emptyTitle}
            emptyDesc={emptyDesc}
            onSelect={handleSelectPatient}
            selectedId={selectedId}
          />
        )}

        {janela === 'tempo' && (
          <EixoTempo
            pacienteId={selectedId}
            summary={detail.summary}
            evolucoes={detail.evolucoes}
            pendencias={detail.pendencias}
            loading={detail.loading}
          />
        )}

        {janela === 'estado' && (
          <EixoEstado
            paciente={detail.paciente}
            evolucao={detail.evolucao}
            loading={detail.loading}
            onSaved={detail.refresh}
          />
        )}

        {janela === 'problema' && (
          <FichaEvolucao
            paciente={detail.paciente}
            evolucao={detail.evolucao}
            pendencias={detail.pendencias}
            loading={detail.loading}
            onSaved={detail.refresh}
          />
        )}

        {janela === 'passagem' && (
          <PassagemTurno rows={visible} loading={loading} userEmail={session.user.email ?? undefined} />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-[11px] text-app-text-muted text-center flex items-center justify-center gap-3">
        <span>SASI v2.0 · 5 Janelas · {new Date().toLocaleString('pt-BR')}</span>
        <button
          onClick={() => setShowShortcuts(true)}
          className="px-1.5 py-0.5 rounded border border-app-border bg-app-tertiary hover:text-app-text-2 transition text-[10px] font-mono"
        >
          ? atalhos
        </button>
      </footer>

      {modalId && (
        <PatientModal
          pacienteId={modalId}
          initialTab={modalTab}
          onClose={() => setModalId(null)}
        />
      )}

      {showNovoLeito && (
        <NovoLeitoModal
          userId={session.user.id}
          onClose={() => setShowNovoLeito(false)}
          onSuccess={() => addToast('success', 'Paciente admitido')}
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
                ['1', 'Janela Leitos'],
                ['2', 'Eixo Tempo'],
                ['3', 'Planilhão Geral'],
                ['4', 'Ficha de Evolução'],
                ['5', 'Passagem de Turno'],
                ['j / k', 'Próximo / anterior paciente'],
                ['t', 'Ciclar tema'],
                ['n', 'Novo leito'],
                ['Esc', 'Fechar modal / limpar busca'],
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