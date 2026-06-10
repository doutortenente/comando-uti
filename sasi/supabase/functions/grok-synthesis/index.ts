// SASI Edge Function — grok-synthesis
// Schema: sasi-grok-synthesis/v1
// Calls xAI Grok API server-side (XAI_API_KEY never exposed to browser).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildStrongSASIPrompt, type SASISynthesisRequest } from "../_shared/sasiPrompt.ts";

interface PayloadV1 extends SASISynthesisRequest {
  $schema: string;
}

interface GrokSynthesisOutput {
  problemasAtivos: Array<{ texto: string; vetor: string; sistema?: string }>;
  condutasSistemas: Array<{ sistema: string; texto: string; meta?: string; prazo?: string }>;
  riscos: string[];
  observacoes?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1].trim());

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));

  throw new Error("no_json_in_response");
}

function validateOutput(raw: unknown): GrokSynthesisOutput {
  if (!raw || typeof raw !== "object") throw new Error("invalid_output_shape");

  const obj = raw as Record<string, unknown>;
  const problemasAtivos = Array.isArray(obj.problemasAtivos) ? obj.problemasAtivos : [];
  const condutasSistemas = Array.isArray(obj.condutasSistemas) ? obj.condutasSistemas : [];
  const riscos = Array.isArray(obj.riscos) ? obj.riscos.filter((r) => typeof r === "string") : [];

  if (problemasAtivos.length === 0 && condutasSistemas.length === 0) {
    throw new Error("empty_synthesis");
  }

  return {
    problemasAtivos: problemasAtivos.map((p) => {
      const item = p as Record<string, unknown>;
      return {
        texto: String(item.texto ?? ""),
        vetor: String(item.vetor ?? "="),
        sistema: item.sistema ? String(item.sistema) : undefined,
      };
    }),
    condutasSistemas: condutasSistemas.map((c) => {
      const item = c as Record<string, unknown>;
      return {
        sistema: String(item.sistema ?? "geral"),
        texto: String(item.texto ?? ""),
        meta: item.meta ? String(item.meta) : undefined,
        prazo: item.prazo ? String(item.prazo) : undefined,
      };
    }),
    riscos,
    observacoes: obj.observacoes ? String(obj.observacoes) : undefined,
  };
}

async function callGrok(userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("XAI_API_KEY");
  if (!apiKey) throw new Error("xai_api_key_missing");

  const model = Deno.env.get("XAI_MODEL") ?? "grok-3-mini";
  const timeoutMs = Number(Deno.env.get("XAI_TIMEOUT_MS") ?? "120000");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você gera sínteses clínicas SASI v2.0 em JSON estrito. Nunca invente dados clínicos. Responda somente com JSON válido.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`xai_http_${res.status}: ${detail.slice(0, 500)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") throw new Error("xai_empty_content");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j(405, { ok: false, error: "method_not_allowed" });

  let payload: PayloadV1;
  try {
    payload = (await req.json()) as PayloadV1;
  } catch {
    return j(400, { ok: false, error: "invalid_json" });
  }

  if (payload?.$schema !== "sasi-grok-synthesis/v1") {
    return j(400, { ok: false, error: "schema_mismatch", expected: "sasi-grok-synthesis/v1" });
  }

  if (!payload.patientContext?.trim()) {
    return j(400, { ok: false, error: "patient_context_required" });
  }

  const raw = payload.rawData ?? {};
  const hasInput = [
    raw.previousEvolution,
    raw.ocrNursingNotes,
    raw.ocrPrescription,
    raw.physicalExamNotes,
    raw.labs,
    raw.currentDvas,
  ].some((v) => typeof v === "string" && v.trim().length > 0);

  if (!hasInput) {
    return j(400, { ok: false, error: "raw_data_required" });
  }

  try {
    const prompt = buildStrongSASIPrompt(payload);
    const content = await callGrok(prompt);
    const parsed = extractJson(content);
    const result = validateOutput(parsed);

    return j(200, {
      ok: true,
      source: "grok",
      model: Deno.env.get("XAI_MODEL") ?? "grok-3-mini",
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[grok-synthesis]", message);
    return j(502, { ok: false, error: "grok_synthesis_failed", detail: message });
  }
});
