// ============================================================================
// SASI · InlineInput — input inline pequeno, espelha o Gemini
// ============================================================================

interface Props {
  val: string | number | undefined | null;
  onChange: (v: string) => void;
  ph?: string;
  w?: string;
  type?: 'text' | 'number' | 'date';
  ariaLabel?: string;
  className?: string;
}

export default function InlineInput({
  val, onChange, ph, w = 'w-12', type = 'text', ariaLabel, className = '',
}: Props) {
  return (
    <input
      type={type}
      inputMode={type === 'number' ? 'numeric' : 'text'}
      aria-label={ariaLabel || ph || 'Campo'}
      placeholder={ph}
      value={val == null ? '' : String(val)}
      onChange={(e) => onChange(e.target.value)}
      className={`border-b-2 border-app-border focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30 text-center bg-app-card/60 rounded-t px-1 font-medium text-app-text ${w} transition-colors print:border-none print:bg-transparent print:p-0 ${className}`}
    />
  );
}
