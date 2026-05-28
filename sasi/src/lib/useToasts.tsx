// ============================================================================
// SASI · Toast system — provider + hook + render container.
// 4 níveis (info, success, warning, danger), auto-dismiss 5s, max 3 stack.
// ============================================================================
import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

export type ToastLevel = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  id: string;
  level: ToastLevel;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (
    level: ToastLevel,
    message: string,
    action?: { label: string; onClick: () => void }
  ) => void;
  removeToast: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be inside ToastProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────

let _nextId = 0;
const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (
      level: ToastLevel,
      message: string,
      action?: { label: string; onClick: () => void }
    ) => {
      const id = `toast-${++_nextId}`;
      setToasts((prev) => {
        const next = [...prev, { id, level, message, action }];
        // Mantém max 3 — remove o mais antigo
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      // Auto-dismiss
      setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// ── Render container ──────────────────────────────────────────────────────

const LEVEL_STYLES: Record<
  ToastLevel,
  { bg: string; border: string; text: string; Icon: typeof Info }
> = {
  info: {
    bg: 'bg-blue-950',
    border: 'border-blue-800',
    text: 'text-blue-200',
    Icon: Info,
  },
  success: {
    bg: 'bg-emerald-950',
    border: 'border-emerald-800',
    text: 'text-emerald-200',
    Icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-amber-950',
    border: 'border-amber-800',
    text: 'text-amber-200',
    Icon: AlertTriangle,
  },
  danger: {
    bg: 'bg-red-950',
    border: 'border-red-800',
    text: 'text-red-200',
    Icon: AlertCircle,
  },
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const s = LEVEL_STYLES[t.level];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-lg sasi-fade-in ${s.bg} ${s.border} ${s.text}`}
          >
            <s.Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm leading-snug">
              {t.message}
              {t.action && (
                <button
                  onClick={t.action.onClick}
                  className="ml-2 underline underline-offset-2 font-semibold hover:opacity-80 transition"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 p-0.5 hover:opacity-70 transition"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
