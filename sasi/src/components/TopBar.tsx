// ============================================================================
// SASI · TopBar — linha 1 do antigo header, agora barra superior do shell
// Branding + badges de alerta + ações (Novo Leito / Copiar / PDF) +
// ViewSwitcher + toggle tático⇄clínico + reload.
// ============================================================================
import {
  Bell, ClipboardCopy, FileDown, Plus, RefreshCw, ShieldCheck,
} from 'lucide-react';
import ViewSwitcher from './ViewSwitcher';
import ThemeToggleSimple from './ThemeToggleSimple';

interface Props {
  sessionEmail: string | undefined;
  totalCriticos: number;
  totalWarnings: number;
  hasPatients: boolean;
  onNovoLeito: () => void;
  onCopiar: () => void;
  onExportPDF: () => void;
}

export default function TopBar({
  sessionEmail, totalCriticos, totalWarnings, hasPatients,
  onNovoLeito, onCopiar, onExportPDF,
}: Props) {
  return (
    <header className="shrink-0 z-20 bg-app-card/95 backdrop-blur border-b border-app-border">
      <div className="px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-app-accent p-1.5 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold">SASI · Comando UTI Alpha</div>
            <div className="text-[11px] text-app-text-muted">
              {sessionEmail === 'dev@sasi-uti.local' ? 'Modo dev · sem auth' : sessionEmail}
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
            onClick={onNovoLeito}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
            title="Admitir paciente"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Leito
          </button>
          {hasPatients && (
            <>
              <button
                onClick={onCopiar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2 text-xs font-medium rounded-lg border border-app-border transition"
                title="Copiar passagem de turno"
              >
                <ClipboardCopy className="w-3.5 h-3.5" />
                Copiar
              </button>
              <button
                onClick={onExportPDF}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app-tertiary hover:bg-app-tertiary/70 text-app-text-2 text-xs font-medium rounded-lg border border-app-border transition"
                title="Exportar PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </button>
            </>
          )}
          <ViewSwitcher />
          <ThemeToggleSimple />
          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-app-tertiary rounded text-app-text-muted hover:text-app-text transition"
            title="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
