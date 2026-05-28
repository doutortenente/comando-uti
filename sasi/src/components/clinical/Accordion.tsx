// ============================================================================
// SASI · Accordion — colapsável com badge de count, espelha Gemini
// ============================================================================
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  icon: React.ElementType;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  /** purple | rose | teal | sky | amber | lime | pink */
  color: 'purple' | 'rose' | 'teal' | 'sky' | 'amber' | 'lime' | 'pink';
  children: ReactNode;
}

const COLORS = {
  purple: { iconBg: 'bg-purple-500/15', iconText: 'text-purple-400', text: 'text-purple-300', badge: 'bg-purple-600', border: 'border-purple-500/20', hover: 'hover:bg-purple-500/5', ring: 'focus:ring-purple-500/50' },
  rose:   { iconBg: 'bg-rose-500/15',   iconText: 'text-rose-400',   text: 'text-rose-300',   badge: 'bg-rose-600',   border: 'border-rose-500/20',   hover: 'hover:bg-rose-500/5',   ring: 'focus:ring-rose-500/50' },
  teal:   { iconBg: 'bg-teal-500/15',   iconText: 'text-teal-400',   text: 'text-teal-300',   badge: 'bg-teal-600',   border: 'border-teal-500/20',   hover: 'hover:bg-teal-500/5',   ring: 'focus:ring-teal-500/50' },
  sky:    { iconBg: 'bg-sky-500/15',    iconText: 'text-sky-400',    text: 'text-sky-300',    badge: 'bg-sky-600',    border: 'border-sky-500/20',    hover: 'hover:bg-sky-500/5',    ring: 'focus:ring-sky-500/50' },
  amber:  { iconBg: 'bg-amber-500/15',  iconText: 'text-amber-400',  text: 'text-amber-300',  badge: 'bg-amber-600',  border: 'border-amber-500/20',  hover: 'hover:bg-amber-500/5',  ring: 'focus:ring-amber-500/50' },
  lime:   { iconBg: 'bg-lime-500/15',   iconText: 'text-lime-400',   text: 'text-lime-300',   badge: 'bg-lime-600',   border: 'border-lime-500/20',   hover: 'hover:bg-lime-500/5',   ring: 'focus:ring-lime-500/50' },
  pink:   { iconBg: 'bg-pink-500/15',   iconText: 'text-pink-400',   text: 'text-pink-300',   badge: 'bg-pink-600',   border: 'border-pink-500/20',   hover: 'hover:bg-pink-500/5',   ring: 'focus:ring-pink-500/50' },
};

export default function Accordion({ title, icon: Icon, count = 0, isOpen, onToggle, color, children }: Props) {
  const c = COLORS[color];
  return (
    <div className="flex flex-col gap-2 mt-2 mb-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between bg-app-card p-3 rounded-xl border ${c.border} shadow-sm hover:shadow-md transition-all group focus:outline-none focus:ring-2 ${c.ring} no-print`}
      >
        <div className="flex items-center gap-3">
          <div className={`${c.iconBg} ${c.iconText} p-1.5 rounded-lg group-hover:scale-110 transition-transform`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={`font-bold ${c.text} text-sm uppercase tracking-wide`}>{title}</span>
          {count > 0 && (
            <span className={`${c.badge} text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm`}>
              {count}
            </span>
          )}
        </div>
        <div className={`${c.hover} p-1 rounded-md ${c.iconText} transition-colors`}>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      <div className={`${isOpen ? 'block sasi-fade-in' : 'hidden'} print-block ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 ${c.border} space-y-3`}>
        {children}
      </div>
    </div>
  );
}
