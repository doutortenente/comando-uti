// ============================================================================
// SASI · DiureseCalc — calculadora de diurese efetiva inline
// Portado do app Gemini: calcula ml/kg/h a partir de volume, peso e horas.
// ============================================================================
import { useState } from 'react';
import { Droplets, Calculator } from 'lucide-react';
import { calcDiureseEfetiva } from '../lib/drugs';

interface Props {
  /** Peso do paciente em kg (pré-preenchido se disponível) */
  pesoInicial?: number;
}

export default function DiureseCalc({ pesoInicial }: Props) {
  const [volume, setVolume] = useState('');
  const [peso, setPeso] = useState(pesoInicial ? String(pesoInicial) : '');
  const [horas, setHoras] = useState('24');
  const [open, setOpen] = useState(false);

  const result = calcDiureseEfetiva(volume, peso, horas);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] text-app-text-muted hover:text-app-accent transition mt-2"
      >
        <Calculator className="w-3 h-3" />
        Calcular diurese efetiva
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-lg border border-app-border bg-app-tertiary/50 sasi-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-app-text-muted">
          <Droplets className="w-3.5 h-3.5" />
          Diurese Efetiva
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] text-app-text-muted hover:text-app-text transition"
        >
          fechar
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] text-app-text-muted">Volume (ml)</span>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="1200"
            className="w-full mt-0.5 px-2 py-1 rounded bg-app-tertiary border border-app-border text-xs text-app-text focus:border-app-accent outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-app-text-muted">Peso (kg)</span>
          <input
            type="number"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="70"
            className="w-full mt-0.5 px-2 py-1 rounded bg-app-tertiary border border-app-border text-xs text-app-text focus:border-app-accent outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-app-text-muted">Horas</span>
          <input
            type="number"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="24"
            className="w-full mt-0.5 px-2 py-1 rounded bg-app-tertiary border border-app-border text-xs text-app-text focus:border-app-accent outline-none"
          />
        </label>
      </div>
      {result && (
        <div className={`mt-2 text-center py-1.5 rounded-lg text-xs font-bold ${
          result.isOliguria
            ? 'bg-red-950 text-red-300'
            : result.isPoliuria
            ? 'bg-amber-950 text-amber-300'
            : 'bg-emerald-950 text-emerald-300'
        }`}>
          {result.mlKgH.toFixed(2)} ml/kg/h — {result.label}
        </div>
      )}
    </div>
  );
}
