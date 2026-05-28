// ============================================================================
// SASI · ClinicalExtras — referências clínicas rápidas
// Escalas neuro, ausculta pulmonar, profilaxias, dieta, ATBs preset.
// Portado do app Gemini — info de referência (read-only).
// ============================================================================
import { useState } from 'react';
import {
  Brain, Stethoscope, ShieldCheck, Utensils, Pill,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import {
  ESCALAS_NEURO,
  ATB_PRESETS,
  PROFILAXIA_TVP,
  PROFILAXIA_ULCERA,
  AUSCULTA_PULMONAR,
  DIETA_TIPOS,
  DIETA_ACEITACAO,
} from '../lib/drugs';

// ── Accordion section ────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-app-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-app-text-muted hover:bg-app-tertiary/50 transition"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="px-3 pb-3 sasi-fade-in">{children}</div>}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded bg-app-tertiary text-[11px] text-app-text-2 border border-app-border">
      {children}
    </span>
  );
}

// ── Main export ──────────────────────────────────────────────────────────
export default function ClinicalExtras() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-app-text-muted mb-1">
        <Info className="w-3.5 h-3.5" />
        Referências Clínicas Rápidas
      </div>

      {/* ESCALAS NEURO */}
      <Section icon={Brain} title="Escalas Neurológicas">
        <div className="space-y-1.5">
          {Object.entries(ESCALAS_NEURO).map(([name, def]) => (
            <div key={name} className="flex items-start gap-2">
              <span className="text-[11px] font-semibold text-app-text shrink-0 min-w-[90px]">{name}</span>
              <span className="text-[11px] text-app-text-muted">{def.desc} <b>({def.range})</b></span>
            </div>
          ))}
        </div>
      </Section>

      {/* AUSCULTA PULMONAR */}
      <Section icon={Stethoscope} title="Ausculta Pulmonar (presets)">
        <div className="flex flex-wrap gap-1">
          {AUSCULTA_PULMONAR.map((a) => <Tag key={a}>{a}</Tag>)}
        </div>
      </Section>

      {/* PROFILAXIAS */}
      <Section icon={ShieldCheck} title="Profilaxias">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-app-text-muted mb-1">TVP</div>
            <div className="flex flex-wrap gap-1">
              {PROFILAXIA_TVP.map((p) => <Tag key={p}>{p}</Tag>)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-app-text-muted mb-1">Úlcera de estresse</div>
            <div className="flex flex-wrap gap-1">
              {PROFILAXIA_ULCERA.map((p) => <Tag key={p}>{p}</Tag>)}
            </div>
          </div>
        </div>
      </Section>

      {/* DIETA */}
      <Section icon={Utensils} title="Dieta">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-app-text-muted mb-1">Tipos</div>
            <div className="flex flex-wrap gap-1">
              {DIETA_TIPOS.map((d) => <Tag key={d}>{d}</Tag>)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-app-text-muted mb-1">Aceitação</div>
            <div className="flex flex-wrap gap-1">
              {DIETA_ACEITACAO.map((a) => <Tag key={a}>{a}</Tag>)}
            </div>
          </div>
        </div>
      </Section>

      {/* ATBs PRESET */}
      <Section icon={Pill} title="Antibióticos (presets)">
        <div className="flex flex-wrap gap-1">
          {ATB_PRESETS.map((atb) => <Tag key={atb}>{atb}</Tag>)}
        </div>
      </Section>
    </div>
  );
}
