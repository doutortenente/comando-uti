// ============================================================================
// SASI · InfusionEditor — calculadora de DVA/Sedação (read-only por enquanto)
// Mostra dose calculada com validação de faixa terapêutica.
// ============================================================================
import { calculateDose, DVA_DICT, SEDACAO_DICT, type DrugDef } from '../lib/drugs';
import { Heart, Droplets } from 'lucide-react';

export interface Infusion {
  droga: string;
  diluicao: number;
  vazao: string;
}

interface Props {
  infusions: Infusion[];
  isDVA: boolean;
  peso?: number | string;
}

export default function InfusionEditor({ infusions, isDVA, peso }: Props) {
  const dict = isDVA ? DVA_DICT : SEDACAO_DICT;
  const Icon = isDVA ? Heart : Droplets;
  const titleColor = isDVA ? 'text-red-300' : 'text-purple-300';

  if (!infusions || infusions.length === 0) {
    return (
      <div className="text-xs italic text-app-text-muted py-2">
        {isDVA ? 'Sem DVAs ativas' : 'Sem sedação/analgesia ativa'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {infusions.map((inf, idx) => {
        const drugDef: DrugDef | undefined = dict[inf.droga];
        const doseResult =
          inf.droga && inf.vazao ? calculateDose(inf.droga, inf.diluicao, inf.vazao, peso, isDVA) : null;
        const diluicaoLabel = drugDef?.diluicoes[inf.diluicao]?.label;

        return (
          <div
            key={idx}
            className="p-3 rounded-lg border border-app-border bg-app-tertiary/40"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className={`text-sm font-semibold flex items-center gap-1.5 ${titleColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {inf.droga || 'Sem nome'}
                </div>
                <div className="text-xs text-app-text-muted mt-0.5">
                  Vazão: <span className="text-app-text-2 tabular-nums">{inf.vazao || '—'}</span> ml/h
                  {diluicaoLabel && <span> · {diluicaoLabel}</span>}
                </div>
              </div>
              {doseResult && !doseResult.error && (
                <div
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                    doseResult.isOk ? 'dose-ok' : 'dose-warning'
                  }`}
                >
                  <div className="tabular-nums">
                    {doseResult.value} <span className="opacity-80">{doseResult.unit}</span>
                  </div>
                  {!doseResult.isOk && (
                    <div className="text-[10px] opacity-80 mt-0.5">
                      Faixa: {doseResult.min}–{doseResult.max}
                    </div>
                  )}
                </div>
              )}
              {doseResult?.error && (
                <div className="px-3 py-1.5 rounded-md text-xs font-semibold dose-warning">
                  {doseResult.error}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
