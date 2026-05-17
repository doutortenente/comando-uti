// ============================================================================
// SASI · WarRoom — Onda 1 (Sala de Guerra)
// Modal full-screen 2×2 com quadrantes drag-and-drop:
//   Q1 Ficha Clínica | Q2 Tendências 72h
//   Q3 Ferramentas Táticas | Q4 Bagunçograma
//
// DnD: HTML5 nativo (zero deps). Layout persiste em localStorage.uti_warroom_layout.
// Faixa de status colorida por gravidade do paciente.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, X, Edit3, GripVertical, Clipboard, LineChart,
  Wrench, Notebook,
} from 'lucide-react';
import type { Paciente, Evolucao, Pendencia } from '../lib/supabaseClient';
import { deriveSeverityVisual, STATUS_LABELS } from '../lib/clinical-config';
import FichaCompleta from './FichaCompleta';
import TrendsSparkline from './clinical/TrendsSparkline';
import WarRoomTools from './clinical/WarRoomTools';
import WarRoomScratchpad from './clinical/WarRoomScratchpad';

// ── Types & constants ────────────────────────────────────────────────────────
export type QuadrantId = 'ficha' | 'trends' | 'tools' | 'bagunco';

const DEFAULT_LAYOUT: readonly QuadrantId[] = ['ficha', 'trends', 'tools', 'bagunco'];
const STORAGE_KEY = 'uti_warroom_layout';

interface QuadrantMeta {
  id: QuadrantId;
  title: string;
  icon: typeof Clipboard;
}

const QUADRANT_META: Record<QuadrantId, QuadrantMeta> = {
  ficha:   { id: 'ficha',   title: 'Ficha Clínica',       icon: Clipboard },
  trends:  { id: 'trends',  title: 'Tendências 72h',      icon: LineChart },
  tools:   { id: 'tools',   title: 'Ferramentas Táticas', icon: Wrench },
  bagunco: { id: 'bagunco', title: 'Bagunçograma',        icon: Notebook },
};

const VALID_IDS: ReadonlySet<QuadrantId> = new Set(DEFAULT_LAYOUT);

function isQuadrantId(v: unknown): v is QuadrantId {
  return typeof v === 'string' && VALID_IDS.has(v as QuadrantId);
}

function loadLayoutFromStorage(): QuadrantId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_LAYOUT];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 4) return [...DEFAULT_LAYOUT];
    const ids: QuadrantId[] = [];
    const seen = new Set<QuadrantId>();
    for (const item of parsed) {
      if (!isQuadrantId(item) || seen.has(item)) return [...DEFAULT_LAYOUT];
      ids.push(item);
      seen.add(item);
    }
    return ids.length === 4 ? ids : [...DEFAULT_LAYOUT];
  } catch {
    return [...DEFAULT_LAYOUT];
  }
}

// ── Status banner color mapping ──────────────────────────────────────────────
const STATUS_BORDER_CLASS: Record<'red' | 'yellow' | 'green' | 'gray', string> = {
  red:    'border-red-500',
  yellow: 'border-amber-400',
  green:  'border-emerald-500',
  gray:   'border-app-border',
};

const STATUS_BANNER_CLASS: Record<'red' | 'yellow' | 'green' | 'gray', string> = {
  red:    'bg-red-500/15 text-red-300 border-red-500/40',
  yellow: 'bg-amber-400/15 text-amber-300 border-amber-400/40',
  green:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  gray:   'bg-app-tertiary text-app-text-muted border-app-border',
};

// ── Quadrant shell ───────────────────────────────────────────────────────────
interface QuadrantProps {
  id: QuadrantId;
  isEditMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (id: QuadrantId) => void;
  onDragEnd: () => void;
  onDragOver: (id: QuadrantId) => void;
  onDragLeave: () => void;
  onDrop: (id: QuadrantId) => void;
  children: React.ReactNode;
}

function Quadrant({
  id, isEditMode, isDragging, isDragOver,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  children,
}: QuadrantProps) {
  const meta = QUADRANT_META[id];
  const Icon = meta.icon;

  return (
    <section
      draggable={isEditMode}
      onDragStart={(e) => {
        if (!isEditMode) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        onDragStart(id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(id);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        onDrop(id);
      }}
      className={`flex flex-col rounded-xl border bg-app-card overflow-hidden transition shadow-sm
        ${isEditMode ? 'cursor-grab ring-2 ring-dashed ring-app-accent/60' : 'border-app-border'}
        ${isDragging ? 'opacity-50 scale-[0.99]' : ''}
        ${isDragOver && !isDragging ? 'ring-2 ring-app-accent bg-app-accent/5' : ''}
      `}
      aria-label={`Quadrante ${meta.title}`}
    >
      <header className={`flex items-center gap-2 px-3 py-1.5 border-b border-app-border/50 bg-app-tertiary/40 ${isEditMode ? 'cursor-grab' : ''}`}>
        {isEditMode && <GripVertical className="w-3.5 h-3.5 text-app-text-muted" aria-hidden="true" />}
        <Icon className="w-3.5 h-3.5 text-app-text-muted" />
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-app-text-2">
          {meta.title}
        </h3>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {children}
      </div>
    </section>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
interface Props {
  paciente: Paciente;
  evolucao: Evolucao | null;
  pendencias: Pendencia[];
  onClose: () => void;
  onDataChanged: () => void;
}

export default function WarRoom({
  paciente, evolucao, pendencias, onClose, onDataChanged,
}: Props) {
  const [layout, setLayout] = useState<QuadrantId[]>(loadLayoutFromStorage);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<QuadrantId | null>(null);
  const [dragOverId, setDragOverId] = useState<QuadrantId | null>(null);

  // Persist layout
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Quota or disabled storage — silently ignore
    }
  }, [layout]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditMode) setIsEditMode(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isEditMode]);

  const handleDragStart = useCallback((id: QuadrantId) => {
    setDraggedId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback((id: QuadrantId) => {
    setDragOverId(id);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((target: QuadrantId) => {
    setDragOverId(null);
    setDraggedId((current) => {
      if (!current || current === target) return null;
      setLayout((prev) => {
        const next = [...prev];
        const fromIdx = next.indexOf(current);
        const toIdx = next.indexOf(target);
        if (fromIdx < 0 || toIdx < 0) return prev;
        next[fromIdx] = target;
        next[toIdx] = current;
        return next;
      });
      return null;
    });
  }, []);

  const status = deriveSeverityVisual(paciente.gravidade);
  const borderClass = STATUS_BORDER_CLASS[status];
  const bannerClass = STATUS_BANNER_CLASS[status];
  const statusLabel = status === 'gray'
    ? (paciente.gravidade === 'obito' ? 'ÓBITO' : '—')
    : STATUS_LABELS[status];

  const diasInternacao = Math.floor(
    (Date.now() - new Date(paciente.data_adm).getTime()) / 86400000,
  );

  function renderQuadrant(id: QuadrantId): React.ReactNode {
    switch (id) {
      case 'ficha':
        return (
          <FichaCompleta
            paciente={paciente}
            evolucao={evolucao}
            pendencias={pendencias}
            onSaved={onDataChanged}
          />
        );
      case 'trends':
        return <TrendsSparkline pacienteId={paciente.id} />;
      case 'tools':
        return <WarRoomTools paciente={paciente} evolucao={evolucao} />;
      case 'bagunco':
        return <WarRoomScratchpad pacienteId={paciente.id} />;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex flex-col sasi-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Sala de Guerra — leito ${paciente.leito}`}
    >
      <div className={`flex-1 flex flex-col m-2 md:m-3 rounded-2xl border-4 ${borderClass} bg-app overflow-hidden`}>
        {/* HEADER */}
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-app-border bg-app-card">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2 text-xs font-semibold transition"
            title="Voltar pro Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>

          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-2xl font-black text-app-text tabular-nums">{paciente.leito}</span>
            <span className="text-[10px] font-mono text-app-text-muted">{paciente.uti}</span>
            <span className="text-sm font-bold text-app-text-2 truncate">{paciente.nome}</span>
            <span className="text-[10px] text-app-text-muted whitespace-nowrap">
              · D{diasInternacao}
              {paciente.idade != null && ` · ${paciente.idade}a`}
              {paciente.peso != null && ` · ${paciente.peso}kg`}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditMode((v) => !v)}
              aria-pressed={isEditMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                isEditMode
                  ? 'bg-app-accent text-white shadow-md'
                  : 'bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2'
              }`}
              title="Modo edição de layout — arraste os quadrantes pra reordenar"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditMode ? 'Concluir edição' : 'Editar layout'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-app-tertiary text-app-text-muted hover:text-app-text transition"
              aria-label="Fechar Sala de Guerra"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* STATUS BANNER */}
        <div className={`flex items-center justify-center gap-2 py-1 text-[10px] font-black uppercase tracking-widest border-b ${bannerClass}`}>
          Status do paciente: {statusLabel}
        </div>

        {/* GRID 2x2 */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-4 md:grid-rows-2 gap-3 p-3 overflow-hidden">
          {layout.map((id) => (
            <Quadrant
              key={id}
              id={id}
              isEditMode={isEditMode}
              isDragging={draggedId === id}
              isDragOver={dragOverId === id}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {renderQuadrant(id)}
            </Quadrant>
          ))}
        </div>
      </div>
    </div>
  );
}
