// ============================================================================
// SASI · DispositivosChips — Onda 5
// 6 ícones toggláveis: MV / DVA / SED / ATB / CVC / TRR
// Cada toggle atualiza pacientes.dispositivos via onUpdate.
// Cores ativas por dispositivo (briefing seção 5).
// ============================================================================
import { DEVICES_CONFIG, type DeviceId } from '../../lib/clinical-config';

interface Dispositivos {
  mv?: boolean;
  dva?: boolean;
  sed?: boolean;
  atb?: boolean;
  cvc?: boolean;
  trr?: boolean;
}

interface Props {
  dispositivos: Dispositivos;
  onUpdate: (patch: Dispositivos) => void;
  /** Quando true, desabilita interação (ex.: modo read-only). */
  readOnly?: boolean;
}

const ACTIVE_BG: Record<string, string> = {
  blue:   'bg-blue-500/20 text-blue-300 border-blue-600/60',
  red:    'bg-red-500/20 text-red-300 border-red-600/60',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-600/60',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-600/60',
  indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-600/60',
  cyan:   'bg-cyan-500/20 text-cyan-300 border-cyan-600/60',
};

export default function DispositivosChips({ dispositivos, onUpdate, readOnly = false }: Props) {
  function toggle(id: DeviceId) {
    if (readOnly) return;
    const curr = dispositivos[id] ?? false;
    onUpdate({ ...dispositivos, [id]: !curr });
  }

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Dispositivos em uso">
      {DEVICES_CONFIG.map(({ id, icon: Icon, label, title, color }) => {
        const active = dispositivos[id] ?? false;
        return (
          <button
            key={id}
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle(id); }}
            title={title}
            aria-pressed={active}
            disabled={readOnly}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase transition ${
              active
                ? ACTIVE_BG[color]
                : 'bg-app-tertiary/40 text-app-text-muted/50 border-app-border/30 hover:text-app-text-muted hover:border-app-border/60'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
