// ============================================================================
// SASI · Skeletons + EmptyState — loading placeholders e zero-data states.
// Usam tokens app-* pra funcionar nos 3 temas (dark/clinical/light).
// ============================================================================
import type { ElementType } from 'react';
import { Inbox } from 'lucide-react';

// ── Primitivas ────────────────────────────────────────────────────────────

function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-app-tertiary ${className}`}
    />
  );
}

// ── LeitoCardSkeleton ─────────────────────────────────────────────────────

export function LeitoCardSkeleton() {
  return (
    <div className="rounded-xl border border-app-border bg-app-card p-4 space-y-3">
      {/* header: UTI badge + leito */}
      <div className="flex items-center gap-2">
        <Bone className="h-5 w-12" />
        <Bone className="h-5 w-16" />
        <Bone className="h-5 w-5 ml-auto rounded-full" />
      </div>
      {/* nome */}
      <Bone className="h-4 w-3/4" />
      {/* gravidade + sofa */}
      <div className="flex gap-2">
        <Bone className="h-5 w-16 rounded-full" />
        <Bone className="h-5 w-12 rounded-full" />
      </div>
      {/* meta: idade, peso, dias */}
      <div className="flex gap-3">
        <Bone className="h-3 w-10" />
        <Bone className="h-3 w-10" />
        <Bone className="h-3 w-14" />
      </div>
      {/* badges: dva, sedacao */}
      <div className="flex gap-2">
        <Bone className="h-4 w-20 rounded" />
        <Bone className="h-4 w-20 rounded" />
      </div>
    </div>
  );
}

// ── TableRowSkeleton ──────────────────────────────────────────────────────

export function TableRowSkeleton({ columns = 12 }: { columns?: number }) {
  return (
    <tr className="border-t border-app-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-2 py-2">
          <Bone
            className={`h-3 ${
              i === 2 ? 'w-28' : i === 11 ? 'w-32' : 'w-12'
            }`}
          />
        </td>
      ))}
    </tr>
  );
}

// ── SplitSkeleton ─────────────────────────────────────────────────────────

export function SplitSkeleton() {
  return (
    <div
      className="grid gap-3 h-[calc(100vh-220px)]"
      style={{ gridTemplateColumns: '320px 1fr' }}
    >
      {/* sidebar */}
      <div className="space-y-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-app-border bg-app-card p-3 space-y-2"
          >
            <div className="flex gap-2">
              <Bone className="h-4 w-10" />
              <Bone className="h-4 w-14" />
            </div>
            <Bone className="h-3 w-2/3" />
            <div className="flex gap-2">
              <Bone className="h-4 w-14 rounded-full" />
              <Bone className="h-4 w-10 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      {/* detail */}
      <div className="rounded-xl border border-app-border bg-app-card p-5 space-y-4">
        <Bone className="h-3 w-24" />
        <Bone className="h-6 w-48" />
        <div className="flex gap-2">
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="h-5 w-14 rounded-full" />
          <Bone className="h-5 w-24" />
        </div>
        <Bone className="h-16 w-full rounded-lg" />
        <Bone className="h-8 w-40 rounded-lg" />
      </div>
    </div>
  );
}

// ── ModalSkeleton ─────────────────────────────────────────────────────────

export function ModalSkeleton() {
  return (
    <div className="space-y-4 p-5">
      {/* header */}
      <div className="space-y-2 pb-4 border-b border-app-border">
        <Bone className="h-3 w-24" />
        <Bone className="h-6 w-56" />
        <div className="flex gap-2">
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="h-5 w-14" />
          <Bone className="h-5 w-28" />
        </div>
      </div>
      {/* tabs */}
      <div className="flex gap-3 pb-3">
        <Bone className="h-4 w-16" />
        <Bone className="h-4 w-14" />
        <Bone className="h-4 w-18" />
      </div>
      {/* content blocks */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-app-border bg-app-card p-3 space-y-2"
          >
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  cta?: { label: string; onClick: () => void };
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  cta,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sasi-fade-in">
      <div className="p-4 rounded-full bg-app-tertiary mb-4">
        <Icon className="w-8 h-8 text-app-text-muted" />
      </div>
      <h3 className="text-base font-semibold text-app-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-app-text-muted text-center max-w-sm">
          {description}
        </p>
      )}
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover text-white text-sm font-semibold transition"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
