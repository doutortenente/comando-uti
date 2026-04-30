// ============================================================================
// SASI · MiniChart — bar chart minimalista pra tendências (SOFA, creatinina)
// ============================================================================

interface Props {
  values: number[];
  label?: string;
  current?: number | string;
  unit?: string;
  ariaLabel?: string;
}

export default function MiniChart({ values, label, current, unit, ariaLabel }: Props) {
  const max = values.length > 0 ? Math.max(...values, 1) : 1;
  return (
    <div aria-label={ariaLabel ?? label}>
      {label && (
        <div className="text-xs text-app-text-muted mb-1.5">{label}</div>
      )}
      <div className="flex items-end gap-0.5 h-10">
        {values.length === 0 ? (
          <div className="text-[10px] italic text-app-text-muted/70 self-end">sem dados</div>
        ) : (
          values.map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-app-accent/60 hover:bg-app-accent rounded-t transition"
              style={{ height: `${(v / max) * 100}%` }}
              title={unit ? `${v} ${unit}` : String(v)}
            />
          ))
        )}
      </div>
      {current != null && (
        <div className="text-xs text-center text-app-text-muted mt-1">
          Atual: <span className="text-app-text-2 font-semibold tabular-nums">{current}</span>
          {unit && <span className="text-app-text-muted"> {unit}</span>}
        </div>
      )}
    </div>
  );
}
