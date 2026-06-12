// ============================================================================
// sasiAI.ts — Integração com IA para Síntese SASI v2.0
// Grok via Edge Function (XAI_API_KEY server-side) + simulação local fallback
// Otimizado para o fluxo real do usuário:
// - Cola evolução anterior + OCR do folhão + prescrição
// - Gera Problemas Ativos com vetor + Conduta por sistemas com metas
// ============================================================================

import { supabase } from './supabaseClient';

export interface RawClinicalInput {
  previousEvolution?: string;
  ocrNursingNotes?: string;     // Sinais vitais, balanço, dieta
  ocrPrescription?: string;
  physicalExamNotes?: string;
  labs?: string;
  currentDvas?: string;
}

export interface SASISynthesisRequest {
  patientContext: string;       // HD + Patient Summary resumido
  rawData: RawClinicalInput;
  currentSupport?: string;
}

export interface SASIProblema {
  texto: string;
  vetor: '↑' | '↓' | '=';
  sistema?: string;
}

export interface SASIConduta {
  sistema: string;
  texto: string;
  meta?: string;
  prazo?: string;
}

export interface SASISynthesisOutput {
  problemasAtivos: SASIProblema[];
  condutasSistemas: SASIConduta[];
  riscos: string[];
  observacoes?: string;
}

export interface GrokSynthesisResponse {
  ok: boolean;
  source?: string;
  model?: string;
  result?: SASISynthesisOutput;
  error?: string;
  detail?: string;
}

export interface PatientContextInput {
  nome?: string;
  idade?: number;
  leito?: string;
  uti?: string;
  hd?: string;
  peso?: number;
  motivoAdmissao?: string;
  antecedentes?: string;
  planoTerapeutico?: string;
  suporteAtual?: string;
}

// ====================== PROMPTS DE ALTA QUALIDADE ======================

export const SASI_V2_SYSTEM_PROMPT = `Você é um intensivista especialista no método SASI v2.0 (Ramo C) com ortogonalidade de eixos.

REGRAS OBRIGATÓRIAS:
- Toda impressão (problema ativo) DEVE ter vetor: ↑ (piora), ↓ (melhora) ou = (estável).
- Toda conduta DEVE ter meta numérica clara quando possível (PAM, diurese ml/kg/h, lactato, etc.).
- Organize condutas por sistemas (Neuro, Cardiovascular, Respiratório, TGI, Renal, Hemato, Infecto).
- Seja objetivo, sucinto e clínico. Nunca invente valores.
- Use o formato JSON estrito solicitado.`;

// Prompt principal para Grok / Claude / Gemini
export function buildStrongSASIPrompt(request: SASISynthesisRequest): string {
  const { patientContext, rawData } = request;

  return `
${SASI_V2_SYSTEM_PROMPT}

**CONTEXTO DO PACIENTE (Patient Summary / HD atual):**
${patientContext}

**DADOS BRUTOS COLETADOS (evolução anterior + OCR do folhão + prescrição + exame):**
${rawData.previousEvolution ? `--- Evolução Anterior ---\n${rawData.previousEvolution}\n\n` : ''}
${rawData.ocrNursingNotes ? `--- Folhão Enfermagem (Sinais/Balanço/Dieta) ---\n${rawData.ocrNursingNotes}\n\n` : ''}
${rawData.ocrPrescription ? `--- Prescrição Vigente ---\n${rawData.ocrPrescription}\n\n` : ''}
${rawData.physicalExamNotes ? `--- Exame Físico ---\n${rawData.physicalExamNotes}\n\n` : ''}
${rawData.labs ? `--- Laboratório ---\n${rawData.labs}\n\n` : ''}
${rawData.currentDvas ? `--- Suporte Atual ---\n${rawData.currentDvas}\n` : ''}

**TAREFA:**
Gere uma síntese clínica SASI v2.0 de alta qualidade no seguinte formato JSON:

{
  "problemasAtivos": [
    { "texto": "...", "vetor": "↑|↓|=", "sistema": "hemo|renal|..." }
  ],
  "condutasSistemas": [
    { "sistema": "Cardiovascular", "texto": "...", "meta": "PAM ≥ 65 mmHg", "prazo": "próximas 6h" }
  ],
  "riscos": ["...", "..."],
  "observacoes": "Observações importantes ou atualizações sugeridas para o Patient Summary"
}

Responda **apenas com o JSON válido**.
`;
}

// ====================== SIMULAÇÃO LOCAL (bem treinada no seu estilo) ======================

export function simulateSASISynthesis(request: SASISynthesisRequest): SASISynthesisOutput {
  const fullText = [
    request.patientContext,
    request.rawData.previousEvolution,
    request.rawData.ocrNursingNotes,
    request.rawData.physicalExamNotes,
    request.rawData.labs,
  ].filter(Boolean).join('\n').toLowerCase();

  const problemas: SASIProblema[] = [];
  const condutas: SASIConduta[] = [];
  const riscos: string[] = [];

  // Choque / Baixo Débito
  if (fullText.includes('choque') || fullText.includes('noradrenalina') || fullText.includes('baixo débito') || fullText.includes('inotrópico') || fullText.includes('dobutamina')) {
    problemas.push({ texto: 'Choque cardiogênico / baixo débito', vetor: '↑', sistema: 'hemo' });
    condutas.push({ 
      sistema: 'Cardiovascular', 
      texto: 'Titular Noradrenalina + Dobutamina conforme perfusão e PAM', 
      meta: 'PAM ≥ 65 mmHg + Lactato em queda', 
      prazo: 'contínuo' 
    });
  }

  // IRA / Cardiorrenal
  if (fullText.includes('ira') || fullText.includes('creatinina') || fullText.includes('cardiorrenal') || (fullText.includes('cr ') && (fullText.includes('↑') || fullText.includes('piora')))) {
    problemas.push({ texto: 'IRA aguda / Síndrome cardiorrenal', vetor: '↑', sistema: 'renal' });
    condutas.push({ 
      sistema: 'Renal', 
      texto: 'Balanço hídrico negativo agressivo + diurético', 
      meta: 'Diurese ≥ 0.5 ml/kg/h + BH negativo', 
      prazo: '24h' 
    });
  }

  // Congestão
  if (fullText.includes('congestão') || fullText.includes('crepitações') || fullText.includes('taquipneia') || fullText.includes('edema pulmonar')) {
    problemas.push({ texto: 'Congestão pulmonar / sobrecarga volêmica', vetor: '↑', sistema: 'resp' });
    condutas.push({ 
      sistema: 'Renal/Cardiovascular', 
      texto: 'Furosemida + restrição hídrica', 
      meta: 'BH < -500 mL/24h', 
      prazo: 'próximas 24h' 
    });
  }

  // Leucocitose / Risco infeccioso
  if (fullText.includes('leucocitose') || fullText.includes('leuco') || fullText.includes('bast') || fullText.includes('pcr')) {
    problemas.push({ texto: 'Leucocitose ascendente - investigar infecção', vetor: '↑', sistema: 'infecto' });
    riscos.push('Sepse sobreposta');
  }

  // Taquicardia / Arritmia
  if (fullText.includes('taquicardia') || (fullText.includes('fc') && fullText.includes('↑'))) {
    problemas.push({ texto: 'Taquicardia sustentada', vetor: '↑', sistema: 'hemo' });
  }

  if (problemas.length === 0) {
    problemas.push({ texto: 'Instabilidade hemodinâmica em avaliação', vetor: '=', sistema: 'hemo' });
  }

  if (condutas.length === 0) {
    condutas.push({ 
      sistema: 'Cardiovascular', 
      texto: 'Manter suporte atual e reavaliar', 
      meta: 'PAM e perfusão adequadas', 
      prazo: 'reavaliação 4-6h' 
    });
  }

  if (riscos.length === 0) {
    riscos.push('Piora hemodinâmica', 'Piora renal');
  }

  return {
    problemasAtivos: problemas,
    condutasSistemas: condutas,
    riscos,
    observacoes: 'Gerado por simulação local. Revise com atenção.',
  };
}

export function buildPatientContext(input: PatientContextInput): string {
  const lines = [
    input.nome ? `Paciente: ${input.nome}${input.idade != null ? `, ${input.idade}a` : ''}` : '',
    input.leito && input.uti ? `Leito: ${input.leito} · ${input.uti}` : '',
    input.hd ? `HD: ${input.hd}` : '',
    input.peso != null ? `Peso: ${input.peso} kg` : '',
    input.motivoAdmissao ? `Motivo admissão: ${input.motivoAdmissao}` : '',
    input.antecedentes ? `Antecedentes: ${input.antecedentes}` : '',
    input.planoTerapeutico ? `Plano terapêutico atual: ${input.planoTerapeutico}` : '',
    input.suporteAtual ? `Suporte atual: ${input.suporteAtual}` : '',
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n') : 'Paciente em evolução pontual — contexto clínico limitado.';
}

export async function generateStructuredSynthesisViaGrok(
  request: SASISynthesisRequest,
): Promise<SASISynthesisOutput> {
  const { data, error } = await supabase.functions.invoke<GrokSynthesisResponse>('grok-synthesis', {
    body: {
      $schema: 'sasi-grok-synthesis/v1',
      ...request,
    },
  });

  if (error) {
    throw new Error(error.message || 'edge_function_invoke_failed');
  }

  if (!data?.ok || !data.result) {
    throw new Error(data?.detail || data?.error || 'grok_synthesis_failed');
  }

  return {
    problemasAtivos: data.result.problemasAtivos.map((p) => ({
      texto: p.texto,
      vetor: (['↑', '↓', '='].includes(p.vetor) ? p.vetor : '=') as SASIProblema['vetor'],
      sistema: p.sistema,
    })),
    condutasSistemas: data.result.condutasSistemas,
    riscos: data.result.riscos ?? [],
    observacoes: data.result.observacoes,
  };
}

export async function generateStructuredSynthesis(
  request: SASISynthesisRequest,
  options?: { preferGrok?: boolean },
): Promise<{ output: SASISynthesisOutput; source: 'grok' | 'local' }> {
  if (options?.preferGrok !== false) {
    try {
      const output = await generateStructuredSynthesisViaGrok(request);
      return { output, source: 'grok' };
    } catch (err) {
      console.warn('[SASI] Grok indisponível, usando simulação local:', err);
    }
  }

  return { output: simulateSASISynthesis(request), source: 'local' };
}

// Gera o prompt perfeito para colar no Grok, Claude ou Gemini
export function getReadyToPastePrompt(request: SASISynthesisRequest): string {
  return buildStrongSASIPrompt(request);
}

