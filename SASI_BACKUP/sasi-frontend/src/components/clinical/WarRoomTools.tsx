// ============================================================================
// SASI · WarRoomTools — Quadrante 3 da Sala de Guerra
// 1) DVA Dose Calculator: reusa calculateDose + DVA_DICT de drugs.ts
// 2) SOFA-live: somador de 6 componentes (0-4 cada), total 0-24, cor por
//    sofaColorClass. Sem regras de suppression (essas vivem no DB).
// ============================================================================
import { useMemo, useState } from 'react';
import { Calculator, Activity } from 'lucide-react';
import { DVA_DICT, calculateDose, isHigh, isLow, sofaColorClass } from '../../lib/drugs';
import { parseFloatBR } from '../../lib/clinical-config';
import type { Paciente, Evolucao } from '../../lib/supabaseClient';

interface Props {
  paciente: Paciente;
  evolucao: Evolucao | null;
}

// ── DVA Calc ─────────────────────────────────────────────────────────────────
function DvaCalculator({ paciente }: { paciente: Paciente }) {
  const drugs = useMemo(() => Object.keys(DVA_DICT), []);
  const [drug, setDrug] = useState<string>(drugs[0] ?? 'Noradrenalina');
  const [diluicaoIdx, setDiluicaoIdx] = useState(0);
  const [vazaoStr, setVazaoStr] = useState('5');
  const [pesoStr, setPesoStr] = useState(paciente.peso != null ? String(paciente.peso) : '');

  const drugDef = DVA_DICT[drug];
  const vazao = parseFloatBR(vazaoStr);
  const peso = parseFloatBR(pesoStr);

  const dose = useMemo(() => {
    if (!drugDef || vazao == null) return null;
    return calculateDose(drug, diluicaoIdx, vazao, peso ?? undefined, true);
  }, [drug, diluicaoIdx, vazao, peso, drugDef]);

  const doseNum = dose != null ? parseFloatBR(String(dose.value)) : null;
  const high = drugDef && doseNum != null ? isHigh(doseNum, undefined, drugDef.max) : false;
  const low = drugDef && doseNum != null ? isLow(doseNum, undefined, drugDef.min) : false;
  const flagColor = high ? 'text-red-400' : low ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="rounded-lg border border-app-border bg-app-card/60 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-app-text-muted">
        <Calculator className="w-3.5 h-3.5" />
        Calculadora DVA
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-app-text-muted uppercase">Droga</span>
          <select
            value={drug}
            onChange={(e) => { setDrug(e.target.value); setDiluicaoIdx(0); }}
            className="w-full mt-0.5 px-2 py-1 rounded bg-app-tertiary border border-app-border/50 text-xs text-app-text-2 focus:outline-none focus:ring-1 focus:ring-app-accent"
          >
            {drugs.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] text-app-text-muted uppercase">Diluição</span>
          <select
            value={diluicaoIdx}
            onChange={(e) => setDiluicaoIdx(Number(e.target.value))}
            className="w-full mt-0.5 px-2 py-1 rounded bg-app-tertiary border border-app-border/50 text-xs text-app-text-2 focus:outline-none focus:ring-1 focus:ring-app-accent"
          >
            {(drugDef?.diluicoes ?? []).map((d, i) => (
              <option key={i} value={i}>{d.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] text-app-text-muted uppercase">Vazão (ml/h)</span>
          <input
            type="text"
            inputMode="decimal"
            value={vazaoStr}
            onChange={(e) => setVazaoStr(e.target.value)}
            className="w-full mt-0.5 px-2 py-1 rounded bg-app-tertiary border border-app-border/50 text-xs text-app-text-2 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-app-accent"
            placeholder="5,0"
          />
        </label>

        <label className="block">
          <span className="text-[10px] text-app-text-muted uppercase">Peso (kg)</span>
          <input
            type="text"
            inputMode="decimal"
            value={pesoStr}
            onChange={(e) => setPesoStr(e.target.value)}
            className="w-full mt-0.5 px-2 py-1 rounded bg-app-tertiary border border-app-border/50 text-xs text-app-text-2 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-app-accent"
            placeholder="70"
          />
        </label>
      </div>

      <div className="flex items-baseline justify-between rounded bg-app-tertiary/50 px-2 py-1.5 border border-app-border/30">
        <span className="text-[10px] uppercase text-app-text-muted">Dose</span>
        {dose ? (
          <span className={`text-sm font-bold font-mono tabular-nums ${flagColor}`}>
            {dose.value} <span className="text-[10px] font-normal opacity-70">{dose.unit}</span>
          </span>
        ) : (
          <span className="text-sm font-bold text-app-text-muted">—</span>
        )}
      </div>

      {drugDef && (
        <p className="text-[9px] text-app-text-muted/70 leading-tight">
          Faixa: {drugDef.min}–{drugDef.max} {drugDef.unit}
          {high && <span className="ml-1 text-red-400 font-bold">↑ ALTA</span>}
          {low && <span className="ml-1 text-amber-400 font-bold">↓ BAIXA</span>}
        </p>
      )}
    </div>
  );
}

// ── SOFA Live ────────────────────────────────────────────────────────────────
type SofaKey = 'resp' | 'coag' | 'liver' | 'cardio' | 'cns' | 'renal';

const SOFA_COMPONENTS: ReadonlyArray<{ key: SofaKey; label: string; hint: string }> = [
  { key: 'resp',   label: 'Respiratório',  hint: 'PaO₂/FiO₂' },
  { key: 'coag',   label: 'Coagulação',    hint: 'Plaquetas' },
  { key: 'liver',  label: 'Hepático',      hint: 'Bilirrubina' },
  { key: 'cardio', label: 'Cardiovascular', hint: 'PAM / DVA' },
  { key: 'cns',    label: 'SNC',            hint: 'Glasgow' },
  { key: 'renal',  label: 'Renal',          hint: 'Creatinina / diurese' },
];

function readSofaComponent(snapshot: unknown, key: SofaKey): number {
  if (!snapshot || typeof snapshot !== 'object') return 0;
  const components = (snapshot as { components?: Record<string, unknown> }).components;
  if (!components) return 0;
  const raw = components[key];
  const n = typeof raw === 'number' ? raw : parseFloatBR(String(raw ?? ''));
  if (n == null || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(4, Math.round(n)));
}

function SofaLive({ evolucao }: { evolucao: Evolucao | null }) {
  const [scores, setScores] = useState<Record<SofaKey, number>>(() => ({
    resp:   readSofaComponent(evolucao?.sofa_snapshot, 'resp'),
    coag:   readSofaComponent(evolucao?.sofa_snapshot, 'coag'),
    liver:  readSofaComponent(evolucao?.sofa_snapshot, 'liver'),
    cardio: readSofaComponent(evolucao?.sofa_snapshot, 'cardio'),
    cns:    readSofaComponent(evolucao?.sofa_snapshot, 'cns'),
    renal:  readSofaComponent(evolucao?.sofa_snapshot, 'renal'),
  }));

  const total = scores.resp + scores.coag + scores.liver + scores.cardio + scores.cns + scores.renal;

  function setScore(key: SofaKey, value: number) {
    setScores((prev) => ({ ...prev, [key]: Math.max(0, Math.min(4, Math.round(value))) }));
  }

  return (
    <div className="rounded-lg border border-app-border bg-app-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-app-text-muted">
          <Activity className="w-3.5 h-3.5" />
          SOFA · ao vivo
        </div>
        <span className={`text-xl font-black tabular-nums ${sofaColorClass(total)}`}>
          {total}
          <span className="text-[10px] font-normal text-app-text-muted ml-0.5">/24</span>
        </span>
      </div>

      <div className="space-y-1">
        {SOFA_COMPONENTS.map(({ key, label, hint }) => (
          <div key={key} className="flex items-center gap-2 text-[11px]">
            <div className="flex-1 min-w-0">
              <div className="text-app-text-2 font-medium truncate">{label}</div>
              <div className="text-[9px] text-app-text-muted/70">{hint}</div>
            </div>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setScore(key, v)}
                  className={`w-6 h-6 rounded text-[10px] font-bold tabular-nums transition ${
                    scores[key] === v
                      ? 'bg-app-accent text-white'
                      : 'bg-app-tertiary/50 text-app-text-muted hover:bg-app-tertiary'
                  }`}
                  aria-label={`${label} score ${v}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-app-text-muted/60 leading-tight">
        Calculadora bedside — regras de suppression e snapshot oficial seguem no DB.
      </p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function WarRoomTools({ paciente, evolucao }: Props) {
  return (
    <div className="space-y-3">
      <DvaCalculator paciente={paciente} />
      <SofaLive evolucao={evolucao} />
    </div>
  );
}
