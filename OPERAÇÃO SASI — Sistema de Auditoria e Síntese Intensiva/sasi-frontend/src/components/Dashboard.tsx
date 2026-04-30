// ============================================================================
// SASI · Dashboard.tsx — sala de guerra das 3 UTIs (33 leitos)
// ============================================================================
import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useSupabasePatients } from '../hooks/useSupabasePatients';
import { useClinicalAlerts } from '../hooks/useClinicalAlerts';
import LeitoCard from './LeitoCard';
import PatientModal from './PatientModal';
import { Bell, Filter, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';

interface Props { session: Session }

const UTIS = ['UTI2', 'UTI3', 'UTI4'] as const;
type UtiFilter = (typeof UTIS)[number] | 'TODAS';

export default function Dashboard({ session }: Props) {
  const { dashboard, loading, error } = useSupabasePatients();
  const { alertas, totalCriticos, totalWarnings } = useClinicalAlerts();
  const [filter, setFilter] = useState<UtiFilter>('TODAS');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-1.5 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="text-base font-bold">SASI · Comando UTI Alpha</div>
              <div className="text-[11px] text-slate-400">{session.user.email}</div>
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
            <button onClick={() => window.location.reload()} className="p-2 hover:bg-slate-800 rounded" title="Recarregar">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={logout} className="p-2 hover:bg-slate-800 rounded" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            <span><b className="text-white">{stats.total}</b> ativos</span>
            {stats.criticos > 0 && <span className="text-red-400 ml-2"><b>{stats.criticos}</b> crítico{stats.criticos > 1 ? 's' : ''}</span>}
            {stats.graves > 0 && <span className="text-orange-400 ml-2"><b>{stats.graves}</b> grave{stats.graves > 1 ? 's' : ''}</span>}
            {stats.piorando > 0 && <span className="text-red-300 ml-2">↑SOFA: <b>{stats.piorando}</b></span>}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {(['TODAS', ...UTIS] as UtiFilter[]).map((u) => (
              <button
                key={u}
                onClick={() => setFilter(u)}
                className={`text-xs px-2.5 py-1 rounded transition ${
                  filter === u ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* GRID */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && <div className="text-center text-slate-400 py-12">Carregando trincheira…</div>}

        {error && (
          <div className="bg-red-950 border border-red-900 rounded-lg p-4 text-red-300 text-sm">
            Erro: {error}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-center text-slate-500 py-16">
            <p className="text-lg mb-1">Nenhum leito ativo {filter !== 'TODAS' && `em ${filter}`}.</p>
            <p className="text-sm">Use a skill <code className="bg-slate-800 px-1.5 py-0.5 rounded">sasi-ingest-export</code> pra admitir um paciente.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visible.map((row) => (
            <LeitoCard key={row.paciente_id} row={row} onSelect={setSelectedId} />
          ))}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-[11px] text-slate-600 text-center">
        SASI v1.0 · Supabase realtime · LGPD-RLS · {new Date().toLocaleString('pt-BR')}
      </footer>

      {selectedId && (
        <PatientModal pacienteId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
