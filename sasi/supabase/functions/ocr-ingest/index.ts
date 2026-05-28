// SASI Edge Function — ocr-ingest
// Schema: sasi-ocr-ingest/v1
// Status: ATIVO em produção (project idswehsvvqczzkiatuzu)
// Recebe payload da skill sasi-ingest-export, valida, persiste em Supabase.
// ZERO ALUCINAÇÃO: warnings nunca apagados, requires_review honrado, audit trail obrigatório.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface PayloadV1 {
  $schema: string;
  extracted_at: string;
  source: { type?: string; fonte: string; confidence_overall?: number; warnings?: string[] };
  target: { uti: "UTI2" | "UTI3" | "UTI4"; leito: string; paciente_id?: string | null };
  paciente_upsert?: Record<string, unknown> | null;
  evolucao_snapshot?: Record<string, unknown> | null;
  eventos_clinicos?: Array<{
    ts: string; tipo: string; valor_num?: number | null; valor_json?: Json;
    unidade?: string | null; confidence?: number | null; source_text?: string | null;
    requires_review?: boolean;
  }>;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function audit(
  admin: SupabaseClient, user_id: string | null, paciente_id: string | null,
  payload: PayloadV1, response: unknown, eventos_ids: string[],
  warnings: string[], ok: boolean, error_msg: string | null,
) {
  await admin.from("ingest_audit_log").insert({
    user_id, paciente_id,
    source_type: payload?.source?.type ?? null,
    fonte: payload?.source?.fonte ?? null,
    payload_raw: payload as unknown as Json,
    response: response as Json,
    eventos_ids, warnings, ok, error_msg,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j(405, { ok: false, error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return j(401, { ok: false, error: "unauthenticated" });
  const user_id = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let payload: PayloadV1;
  try { payload = (await req.json()) as PayloadV1; }
  catch { return j(400, { ok: false, error: "invalid_json" }); }

  const warnings: string[] = Array.isArray(payload?.source?.warnings) ? [...payload.source.warnings] : [];
  const eventos_ids: string[] = [];

  if (payload?.$schema !== "sasi-ocr-ingest/v1") {
    await audit(admin, user_id, null, payload, null, [], warnings, false, "schema_mismatch");
    return j(400, { ok: false, error: "schema_mismatch", expected: "sasi-ocr-ingest/v1" });
  }
  if (!payload?.target?.uti || !payload?.target?.leito) {
    await audit(admin, user_id, null, payload, null, [], warnings, false, "target_missing");
    return j(400, { ok: false, error: "target_missing" });
  }
  if (!["UTI2", "UTI3", "UTI4"].includes(payload.target.uti)) {
    await audit(admin, user_id, null, payload, null, [], warnings, false, "uti_invalid");
    return j(400, { ok: false, error: "uti_invalid", uti: payload.target.uti });
  }

  let paciente_id: string | null = payload.target.paciente_id ?? null;

  if (!paciente_id) {
    const { data: existing, error: pacErr } = await admin
      .from("pacientes").select("id, user_id")
      .eq("uti", payload.target.uti).eq("leito", payload.target.leito)
      .eq("status_leito", "ativo").maybeSingle();

    if (pacErr) {
      await audit(admin, user_id, null, payload, null, [], warnings, false, `paciente_lookup: ${pacErr.message}`);
      return j(500, { ok: false, error: "paciente_lookup_failed", detail: pacErr.message });
    }

    if (existing?.id) {
      paciente_id = existing.id;
      if (existing.user_id && existing.user_id !== user_id) {
        await audit(admin, user_id, paciente_id, payload, null, [], warnings, false, "paciente_outro_dono");
        return j(403, { ok: false, error: "paciente_outro_dono" });
      }
    } else if (payload.paciente_upsert && typeof payload.paciente_upsert === "object") {
      const upsertBody = {
        ...(payload.paciente_upsert as Record<string, unknown>),
        uti: payload.target.uti, leito: payload.target.leito,
        user_id, status_leito: "ativo",
      };
      const { data: created, error: insErr } = await admin
        .from("pacientes").insert(upsertBody).select("id").single();
      if (insErr || !created) {
        await audit(admin, user_id, null, payload, null, [], warnings, false, `paciente_upsert: ${insErr?.message}`);
        return j(400, { ok: false, error: "paciente_upsert_failed", detail: insErr?.message });
      }
      paciente_id = created.id;
      warnings.push(`paciente criado via upsert: ${paciente_id}`);
    } else {
      await audit(admin, user_id, null, payload, null, [], warnings, false, "paciente_nao_encontrado_e_upsert_vazio");
      return j(404, { ok: false, error: "paciente_nao_encontrado", hint: "envie paciente_upsert ou crie o leito antes" });
    }
  }

  let evolucao_id: string | null = null;
  if (payload.evolucao_snapshot && typeof payload.evolucao_snapshot === "object") {
    const snap = payload.evolucao_snapshot as Record<string, unknown>;
    const evolucaoBody: Record<string, unknown> = {
      paciente_id, user_id,
      data_evolucao: snap.data_evolucao ?? payload.extracted_at,
      plantao: snap.plantao ?? "manha",
      neuro: snap.neuro ?? {}, resp: snap.resp ?? {}, hemo: snap.hemo ?? {},
      tgi: snap.tgi ?? {}, renal: snap.renal ?? {}, hemato: snap.hemato ?? {},
      infecto: snap.infecto ?? {},
      dvas: snap.dvas ?? [], sedativos: snap.sedativos ?? [],
      impressao: snap.impressao ?? [], conduta: snap.conduta ?? [],
    };
    const { data: evol, error: evolErr } = await admin
      .from("evolucoes").insert(evolucaoBody).select("id").single();
    if (evolErr || !evol) {
      await audit(admin, user_id, paciente_id, payload, null, [], warnings, false, `evolucao_insert: ${evolErr?.message}`);
      return j(500, { ok: false, error: "evolucao_insert_failed", detail: evolErr?.message });
    }
    evolucao_id = evol.id;
  }

  if (Array.isArray(payload.eventos_clinicos) && payload.eventos_clinicos.length > 0) {
    const fonte = payload.source?.fonte === "claude_ocr" ? "claude_ocr"
              : payload.source?.fonte === "gemini_ocr" ? "gemini_ocr"
              : "edge_function";

    const eventosBody = payload.eventos_clinicos.map((ev) => ({
      paciente_id, evolucao_id, user_id,
      ts: ev.ts, tipo: ev.tipo,
      valor_num: ev.valor_num ?? null, valor_json: ev.valor_json ?? null,
      unidade: ev.unidade ?? null, fonte,
      confidence: ev.confidence ?? null,
      source_text: ev.source_text ?? null,
      requires_review: ev.requires_review ?? false,
    }));

    const { data: inserted, error: evErr } = await admin
      .from("eventos_clinicos").insert(eventosBody).select("id, tipo, requires_review");

    if (evErr) {
      await audit(admin, user_id, paciente_id, payload, null, [], warnings, false, `eventos_insert: ${evErr.message}`);
      return j(500, { ok: false, error: "eventos_insert_failed", detail: evErr.message });
    }
    for (const r of inserted ?? []) eventos_ids.push(r.id);
  }

  const response = {
    ok: true, paciente_id, evolucao_id,
    eventos_inseridos: eventos_ids.length, eventos_ids,
    requires_review_count: (payload.eventos_clinicos ?? []).filter((e) => e.requires_review).length,
    warnings,
  };

  await audit(admin, user_id, paciente_id, payload, response, eventos_ids, warnings, true, null);

  return j(200, response);
});
