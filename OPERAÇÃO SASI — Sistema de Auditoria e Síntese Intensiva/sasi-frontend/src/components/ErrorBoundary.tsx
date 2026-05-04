// ============================================================================
// SASI · ErrorBoundary — captura crashes de render e exibe fallback amigável.
// Previne white-screen-of-death em produção.
// ============================================================================
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error('[SASI] ErrorBoundary capturou crash:', error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-app px-4">
        <div className="w-full max-w-lg bg-app-card border border-app-border rounded-2xl p-8 shadow-2xl sasi-fade-in">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-950/50 border border-red-900">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-app-text text-center mb-1">
            Algo quebrou na trincheira
          </h1>
          <p className="text-sm text-app-text-muted text-center mb-6">
            {error.message || 'Erro inesperado no SASI.'}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-center mb-6">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-hover text-white text-sm font-semibold transition"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar página
            </button>
            <button
              onClick={this.reset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-app-tertiary hover:bg-app-tertiary/70 border border-app-border text-app-text-2 text-sm font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>

          {/* Stack trace (colapsado) */}
          <details className="text-xs">
            <summary className="cursor-pointer text-app-text-muted hover:text-app-text-2 transition select-none">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-app-tertiary text-app-text-muted font-mono overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed border border-app-border">
              {error.stack}
              {info?.componentStack && (
                `\n\nComponent stack:${info.componentStack}`
              )}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
