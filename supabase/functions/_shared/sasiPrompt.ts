// Shared SASI v2.0 prompt builder — used by grok-synthesis edge function

export interface RawClinicalInput {
  previousEvolution?: string;
  ocrNursingNotes?: string;
  ocrPrescription?: string;
  physicalExamNotes?: string;
  labs?: string;
  currentDvas?: string;
}

export interface SASISynthesisRequest {
  patientContext: string;
  rawData: RawClinicalInput;
  currentSupport?: string;
}

export const SASI_V2_SYSTEM_PROMPT = `Você é um intensivista especialista no método SASI v2.0 (Ramo C) com ortogonalidade de eixos.

REGRAS OBRIGATÓRIAS:
- Toda impressão (problema ativo) DEVE ter vetor: ↑ (piora), ↓ (melhora) ou = (estável).
- Toda conduta DEVE ter meta numérica clara quando possível (PAM, diurese ml/kg/h, lactato, etc.).
- Organize condutas por sistemas (Neuro, Cardiovascular, Respiratório, TGI, Renal, Hemato, Infecto).
- Seja objetivo, sucinto e clínico. Nunca invente valores.
- Use o formato JSON estrito solicitado.`;

export function buildStrongSASIPrompt(request: SASISynthesisRequest): string {
  const { patientContext, rawData } = request;

  return `${SASI_V2_SYSTEM_PROMPT}

**CONTEXTO DO PACIENTE (Patient Summary / HD atual):**
${patientContext}

**DADOS BRUTOS COLETADOS (evolução anterior + OCR do folhão + prescrição + exame):**
${rawData.previousEvolution ? `--- Evolução Anterior ---\n${rawData.previousEvolution}\n\n` : ''}${rawData.ocrNursingNotes ? `--- Folhão Enfermagem (Sinais/Balanço/Dieta) ---\n${rawData.ocrNursingNotes}\n\n` : ''}${rawData.ocrPrescription ? `--- Prescrição Vigente ---\n${rawData.ocrPrescription}\n\n` : ''}${rawData.physicalExamNotes ? `--- Exame Físico ---\n${rawData.physicalExamNotes}\n\n` : ''}${rawData.labs ? `--- Laboratório ---\n${rawData.labs}\n\n` : ''}${rawData.currentDvas ? `--- Suporte Atual ---\n${rawData.currentDvas}\n` : ''}

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

Responda **apenas com o JSON válido**.`;
}
