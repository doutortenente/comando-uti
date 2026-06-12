// ============================================================================
// SASI · JanelaNav — navegação entre as 5 janelas (atalhos 1-5)
// ============================================================================
import { BedDouble, Clock, Activity, Target, ClipboardList } from 'lucide-react';
import { useUI, JANELAS, type Janela } from '../lib/theme';

const ICONS: Record<Janela, React.ReactNode> = {
  leitos: <BedDouble className="w-3.5 h-3.5" />,
  tempo: <Clock className="w-3.5 h-3.5" />,
  estado: <Activity className="w-3.5 h-3.5" />,
  problema: <Target className="w-3.5 h-3.5" />,
  passagem: <ClipboardList className="w-3.5 h-3.5" />,
};

export default function JanelaNav() {
  const { janela, setJanela } = useUI();

  return (
    <nav className="flex items-center gap-1 bg-app-tertiary/60 rounded-xl p-1 border border-app-border">
      {JANELAS.map(j => {
        const active = janela === j.id;
        return (
          <button
            key={j.id}
            onClick={() => setJanela(j.id)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${
              active
                ? 'bg-app-accent text-white shadow-sm'
                : 'text-app-text-muted hover:text-app-text-2 hover:bg-app-tertiary'
            }`}
            title={`${j.label} (tecla ${j.shortcut})`}
          >
            {ICONS[j.id]}
            <span className="hidden sm:inline">{j.label}</span>
            <kbd className={`hidden md:inline text-[9px] font-mono px-1 rounded ${
              active ? 'bg-white/20' : 'bg-app-card border border-app-border'
            }`}>
              {j.shortcut}
            </kbd>
          </button>
        );
      })}
    </nav>
  );
}