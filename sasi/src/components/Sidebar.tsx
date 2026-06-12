// ============================================================================
// SASI · Sidebar — rail de comando navy, Plantão Board
// Views reais: "Visão Geral" (dashboard) e "Pacientes" (índice → prontuário).
// Os demais itens disparam ações existentes (Passagem de Turno → PDF,
// Alertas → scroll) ou ficam inertes ("Em breve") quando ainda não há view.
// ============================================================================
import {
  Activity, LayoutGrid, Users, ClipboardList, FlaskConical, Bell,
} from 'lucide-react';

export type SasiView = 'overview' | 'pacientes';

interface Props {
  activeView: SasiView;
  onNavigate: (view: SasiView) => void;
  onPassagemClick: () => void;
  onAlertasClick: () => void;
  alertasCriticos?: number;
}

export default function Sidebar({
  activeView, onNavigate, onPassagemClick, onAlertasClick, alertasCriticos = 0,
}: Props) {
  return (
    <aside className="sasi-rail">
      <div className="sasi-rail__brand">
        <div className="sasi-rail__mark">
          <Activity className="w-5 h-5 text-white" />
        </div>
      </div>

      <button
        className={`sasi-rail__item${activeView === 'overview' ? ' on' : ''}`}
        type="button"
        onClick={() => onNavigate('overview')}
      >
        <LayoutGrid className="w-[17px] h-[17px]" />
        <span>Visão Geral</span>
      </button>

      <button
        className={`sasi-rail__item${activeView === 'pacientes' ? ' on' : ''}`}
        type="button"
        onClick={() => onNavigate('pacientes')}
      >
        <Users className="w-[17px] h-[17px]" />
        <span>Pacientes</span>
      </button>

      <button className="sasi-rail__item" type="button" onClick={onPassagemClick}>
        <ClipboardList className="w-[17px] h-[17px]" />
        <span>Passagem de Turno</span>
      </button>

      <button className="sasi-rail__item" type="button" disabled title="Em breve">
        <FlaskConical className="w-[17px] h-[17px]" />
        <span>Exames</span>
      </button>

      <button className="sasi-rail__item" type="button" onClick={onAlertasClick}>
        <Bell className="w-[17px] h-[17px]" />
        <span>Alertas</span>
        {alertasCriticos > 0 && <span className="sasi-rail__badge">{alertasCriticos}</span>}
      </button>
    </aside>
  );
}
