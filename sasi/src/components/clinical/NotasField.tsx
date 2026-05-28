// ============================================================================
// SASI · NotasField — toggle de notas por sistema (espelha Gemini)
// ============================================================================
import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';

interface Props {
  sistemaNome: string;
  value: string;
  onChange: (v: string) => void;
}

export default function NotasField({ sistemaNome, value, onChange }: Props) {
  const [open, setOpen] = useState(!!value);
  const visible = open || !!value;

  return (
    <div className="mt-3 no-print">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={visible}
        aria-label={`${visible ? 'Ocultar' : 'Adicionar'} Notas para ${sistemaNome}`}
        className={`flex items-center gap-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-app-accent/50 rounded px-1 ${
          visible ? 'text-app-accent' : 'text-app-text-muted hover:text-app-accent'
        }`}
      >
        <MessageSquareText className="w-3.5 h-3.5" />
        {visible ? 'Ocultar Notas' : 'Adicionar Notas'}
      </button>
      {visible && (
        <textarea
          aria-label={`Notas adicionais para ${sistemaNome}`}
          className="w-full mt-2 bg-yellow-50/10 border border-yellow-500/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 rounded-lg p-2 text-sm text-app-text-2 placeholder:text-app-text-muted/40"
          placeholder={`Notas adicionais para ${sistemaNome}...`}
          rows={2}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
