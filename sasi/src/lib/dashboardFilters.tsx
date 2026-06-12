// ============================================================================
// SASI · dashboardFilters — filtros de UTI / smart filters do Plantão Board
// Extraído de Dashboard.tsx para ser compartilhado com FiltersBar.
// ============================================================================
import { Heart, Wind } from 'lucide-react';
import type { DashboardRow } from './supabaseClient';

export const UTIS = ['UTI2', 'UTI3', 'UTI4'] as const;
export type UtiFilter = (typeof UTIS)[number] | 'TODAS';
export type SmartFilter = 'todos' | 'critico' | 'sofa_up' | 'dva' | 'vm' | 'sem_evolucao';

export function rowHasVM(row: DashboardRow): boolean {
  const snapshot = row.sofa_snapshot as Record<string, unknown> | undefined;
  const resp = snapshot?.resp as Record<string, unknown> | undefined;
  if (!resp) return false;
  const suporte = String(resp.suporte ?? resp.modo_ventilatorio ?? resp.via_aerea ?? '');
  return /IOT|TOT|TQT|VMI|ventila/i.test(suporte);
}

export function rowHasDVA(row: DashboardRow): boolean {
  return Array.isArray(row.dvas) && row.dvas.length > 0;
}

export function rowSemEvolucao(row: DashboardRow): boolean {
  return !row.ultima_evolucao;
}

export const SMART_FILTERS: Array<{
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
