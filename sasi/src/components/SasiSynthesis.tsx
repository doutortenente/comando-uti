// ============================================================================
// SasiSynthesis — Componente dedicado à Síntese Clínica de alta qualidade
// Foco: Impressão com vetor + Conduta por sistemas com metas (SASI v2.0)
// ============================================================================

import { useState } from 'react';
import { SasiProblemaAtivo, SasiCondutaSistema, Vetor, SystemKey } from '../lib/supabaseClient';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { generateStructuredSynthesis, getReadyToPastePrompt, SASISynthesisRequest } from '../lib/sasiAI';

const SISTEMAS: SystemKey[] = ['neuro', 'resp', 'hemo', 'tgi', 'renal', 'hemato', 'infecto'];
const VETORES: Vetor[] = ['↑', '↓', '='];

interface Props {
  problemasAtivos: SasiProblemaAtivo[];
  condutasSistemas: SasiCondutaSistema[];
  onChange: (problemas: SasiProblemaAtivo[], condutas: SasiCondutaSistema[]) => void;
}

export default function SasiSynthesis({ problemasAtivos, condutasSistemas, onChange }: Props) {
  const [problemas, setProblemas] = useState<SasiProblemaAtivo[]>(problemasAtivos);
  const [condutas, setCondutas] = useState<SasiCondutaSistema[]>(condutasSistemas);
  const [rawText, setRawText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const updateProblemas = (newProblemas: SasiProblemaAtivo[]) => {
    setProblemas(newProblemas);
    onChange(newProblemas, condutas);
  };

  const updateCondutas = (newCondutas: SasiCondutaSistema[]) => {
    setCondutas(newCondutas);
    onChange(problemas, newCondutas);
  };

  // ====================== INTEGRAÇÃO DE IA ======================
  const handleGenerateWithAI = async () => {
    if (!rawText.trim()) {
      alert('Cole o texto bruto (evolução anterior + OCR do folhão/prescrição) no campo acima.');
      return;
    }

    setIsGenerating(true);

    try {
      const request: SASISynthesisRequest = {
        patientContext: 'Paciente em evolução pontual - contexto a ser preenchido pelo Patient Summary',
        rawData: {
          previousEvolution: rawText,
          ocrNursingNotes: rawText,
        },
      };

      // Usa simulação local inteligente (já bastante boa)
      const result = await generateStructuredSynthesis(request);

      // Converte para o formato do componente
      const newProblemas: SasiProblemaAtivo[] = result.problemasAtivos.map(p => ({
        texto: p.texto,
        vetor: p.vetor as Vetor,
        sistema: p.sistema as SystemKey | undefined,
      }));

      const newCondutas: SasiCondutaSistema[] = result.condutasSistemas.map(c => ({
        sistema: c.sistema as SystemKey | 'geral',
        texto: c.texto,
        meta: c.meta,
        prazo: c.prazo,
      }));

      updateProblemas(newProblemas);
      updateCondutas(newCondutas);

      alert('Síntese gerada com sucesso! Revise e ajuste conforme necessário.');
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar síntese. Tente novamente ou use o prompt manual.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPromptForExternalAI = () => {
    const request: SASISynthesisRequest = {
      patientContext: 'Paciente em evolução pontual',
      rawData: { previousEvolution: rawText },
    };
    const prompt = getReadyToPastePrompt(request);
    navigator.clipboard.writeText(prompt);
    alert('Prompt SASI v2.0 copiado! Cole no Grok (recomendado), Claude ou Gemini.');
  };

  // Nota: integração direta com API Grok/Claude (sem copiar) virá via Edge Function (LGPD). Motor local + prompt já excelente.

  // Sugestões comuns de metas (baseado em exemplos reais do usuário)
  const metaSuggestions = [
    "PAM ≥ 65 mmHg",
    "Diurese > 0.5 ml/kg/h",
    "BH negativo nas próximas 24h",
    "Lactato em queda",
    "SvO2 venosa ≥ 65%",
    "SpO2 ≥ 94%",
  ];

  // === Problemas Ativos ===
  const addProblema = () => {
    const novo: SasiProblemaAtivo = { texto: '', vetor: null };
    updateProblemas([...problemas, novo]);
  };

  const updateProblema = (index: number, field: keyof SasiProblemaAtivo, value: any) => {
    const copy = [...problemas];
    copy[index] = { ...copy[index], [field]: value };
    updateProblemas(copy);
  };

  const removeProblema = (index: number) => {
    updateProblemas(problemas.filter((_, i) => i !== index));
  };

  // Auto-sugestão de vetor baseada em palavras (rápida)
  const suggestVetor = (texto: string): Vetor | null => {
    const t = texto.toLowerCase();
    if (t.includes('piora') || t.includes('descompens') || t.includes('choque') || t.includes('crítica')) return '↑';
    if (t.includes('melhora') || t.includes('estável') || t.includes('resolução')) return '↓';
    return '=';
  };

  // === Condutas por Sistema ===
  const addConduta = () => {
    const novo: SasiCondutaSistema = { sistema: 'geral', texto: '', meta: '' };
    updateCondutas([...condutas, novo]);
  };

  const updateConduta = (index: number, field: keyof SasiCondutaSistema, value: any) => {
    const copy = [...condutas];
    copy[index] = { ...copy[index], [field]: value };
    updateCondutas(copy);
  };

  const removeConduta = (index: number) => {
    updateCondutas(condutas.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {/* ====================== ÁREA DE IA ====================== */}
      <div className="border border-app-border bg-app-tertiary/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-sm">Gerar Síntese com IA</span>
          <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">Grok • Claude • Gemini</span>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Cole aqui o texto bruto: evolução do dia anterior + OCR do folhão de enfermagem + prescrição..."
          className="w-full h-24 bg-app-card border border-app-border rounded-xl p-3 text-sm resize-y"
        />

        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={handleGenerateWithAI}
            disabled={isGenerating || !rawText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"
          >
            {isGenerating ? 'Gerando...' : 'Gerar com IA (Simulação Local)'}
          </button>

          <button
            onClick={copyPromptForExternalAI}
            disabled={!rawText.trim()}
            className="flex items-center gap-2 px-4 py-2 border border-app-border hover:bg-app-card text-sm font-medium rounded-xl transition"
          >
            Copiar Prompt para Grok / Claude / Gemini
          </button>
        </div>

        <p className="text-[10px] text-app-text-muted mt-2">
          Cole evolução anterior + OCR do folhão + prescrição. A simulação local já está bem treinada no seu estilo.
        </p>

        <p className="text-[10px] text-app-text-muted mt-1.5">
          A simulação local já é bem inteligente. Para melhor qualidade, copie o prompt e cole no modelo que preferir.
        </p>
      </div>
      {/* === PROBLEMAS ATIVOS COM VETOR === */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-bold text-red-400 text-sm tracking-widest">PROBLEMAS ATIVOS</h4>
            <p className="text-[10px] text-app-text-muted">Com vetor (↑ piora / ↓ melhora / = estável)</p>
          </div>
          <button 
            onClick={addProblema}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Problema
          </button>
        </div>

        <div className="space-y-2">
          {problemas.map((p, i) => (
            <div key={i} className="flex gap-2 items-center bg-app-card border border-app-border hover:border-red-500/30 rounded-xl p-2 transition">
              <select
                value={p.vetor ?? ''}
                onChange={(e) => {
                  const newV = e.target.value as Vetor || null;
                  updateProblema(i, 'vetor', newV);
                }}
                className="w-11 h-9 text-center text-xl font-black bg-app-tertiary border border-app-border rounded-lg focus:outline-none"
              >
                <option value="">·</option>
                {VETORES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              <input
                type="text"
                value={p.texto}
                onChange={(e) => {
                  const newText = e.target.value;
                  updateProblema(i, 'texto', newText);
                  // Sugestão automática de vetor
                  if (!p.vetor && newText.length > 8) {
                    const suggested = suggestVetor(newText);
                    if (suggested) updateProblema(i, 'vetor', suggested);
                  }
                }}
                placeholder="Ex: Choque cardiogênico SCAI C em piora"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />

              <select
                value={p.sistema ?? ''}
                onChange={(e) => updateProblema(i, 'sistema', e.target.value || undefined)}
                className="text-[10px] bg-app-tertiary border border-app-border rounded px-2 py-1"
              >
                <option value="">Sistema</option>
                {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button onClick={() => removeProblema(i)} className="text-red-400/70 hover:text-red-500 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {problemas.length === 0 && <div className="text-xs text-app-text-muted italic pl-1">Nenhum problema ativo ainda.</div>}
      </div>

      {/* === CONDUTAS POR SISTEMA COM METAS === */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-bold text-emerald-400 text-sm tracking-widest">CONDUTA POR SISTEMAS</h4>
            <p className="text-[10px] text-app-text-muted">Com meta numérica clara + prazo</p>
          </div>
          <button 
            onClick={addConduta}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Conduta
          </button>
        </div>

        <div className="space-y-3">
          {condutas.map((c, i) => (
            <div key={i} className="bg-app-card border border-app-border rounded-xl p-3 space-y-2.5">
              <div className="flex gap-2 items-center">
                <select
                  value={c.sistema}
                  onChange={(e) => updateConduta(i, 'sistema', e.target.value)}
                  className="text-xs font-medium bg-app-tertiary border border-app-border rounded-lg px-2.5 py-1 min-w-[92px]"
                >
                  <option value="geral">GERAL</option>
                  {SISTEMAS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>

                <input
                  type="text"
                  value={c.texto}
                  onChange={(e) => updateConduta(i, 'texto', e.target.value)}
                  placeholder="Ação principal (ex: Titular noradrenalina para PAM alvo)"
                  className="flex-1 bg-transparent text-sm focus:outline-none border-b border-app-border pb-0.5"
                />

                <button onClick={() => removeConduta(i)} className="text-red-400/70 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-app-text-muted mb-0.5">META</div>
                  <input
                    type="text"
                    list={`meta-suggestions-${i}`}
                    value={c.meta || ''}
                    onChange={(e) => updateConduta(i, 'meta', e.target.value)}
                    placeholder="Ex: PAM ≥ 65 mmHg ou Diurese > 0.5 ml/kg/h"
                    className="w-full text-sm bg-app-tertiary/60 border border-app-border rounded-lg px-3 py-1.5"
                  />
                  <datalist id={`meta-suggestions-${i}`}>
                    {metaSuggestions.map((m, idx) => <option key={idx} value={m} />)}
                  </datalist>
                </div>
                <div>
                  <div className="text-[10px] text-app-text-muted mb-0.5">PRAZO</div>
                  <input
                    type="text"
                    value={c.prazo || ''}
                    onChange={(e) => updateConduta(i, 'prazo', e.target.value)}
                    placeholder="Ex: próximas 6h / até amanhã 08h"
                    className="w-full text-sm bg-app-tertiary/60 border border-app-border rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {condutas.length === 0 && <div className="text-xs text-app-text-muted italic pl-1">Nenhuma conduta estruturada ainda.</div>}
      </div>
    </div>
  );
}
