import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs } from "../db.js";

// Tipos válidos do CHECK constraint da tabela eventos_clinicos
const TIPO_EVENTO = z.enum([
  "sofa_total","sofa_resp","sofa_coag","sofa_liver","sofa_cardio","sofa_neuro","sofa_renal",
  "pam","pam_min","pa_sys","pa_dia","pf_ratio","spo2","fr","fc","temp",
  "lactato","ph","pco2","po2","hco3","be",
  "diurese_h","bh_h","bh_acumulado",
  "hb","ht","plaq","leuco","cr","ur","na","k","mg","ca","p","bb","inr","pcr","procalcitonina",
  "nor_dose","adr_dose","vaso_dose","dobuta_dose","dopa_dose",
  "fent_dose","midaz_dose","propofol_dose","precedex_dose",
  "gcs","rass","cam_icu","bps","cpot","glicemia","custom"
]);

const FONTE_ENUM = z.enum(["manual","gemini_ocr","claude_ocr","appsheet","auto_trigger","edge_function","api_import"]);

export function registerEventoTools(server: McpServer): void {

  // ── Insert Clinical Event ─────────────────────────────────────────────────
  server.registerTool(
    "sasi_insert_event",
    {
      title: "SASI — Inserir Evento Clínico",
      description: `Insere um evento clínico pontual na série temporal do paciente.

Args:
  - paciente_id (string): UUID do paciente
  - tipo: Tipo do evento — ver lista completa abaixo
  - valor_num (number): Valor numérico (ex: 65 para PAM, 7.32 para pH)
  - unidade (string): Unidade de medida (ex: 'mmHg', 'mEq/L')
  - ts (string): Timestamp ISO 8601 (default: agora)
  - evolucao_id (string): UUID da evolução associada (opcional)
  - fonte: Origem do dado (default: 'manual')
  - confidence (number): Confiança 0–1, se origem OCR
  - requires_review (boolean): Flagar para revisão (default: false)

Tipos disponíveis: sofa_total, pam, spo2, fr, fc, temp, lactato, ph, pco2, po2,
hco3, be, diurese_h, bh_h, bh_acumulado, hb, ht, plaq, leuco, cr, ur, na, k,
mg, ca, p, bb, inr, pcr, procalcitonina, nor_dose, adr_dose, gcs, rass,
cam_icu, glicemia, custom (e outros — use o tipo exato do schema)`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        tipo: TIPO_EVENTO,
        valor_num: z.number().optional(),
        valor_json: z.record(z.unknown()).optional(),
        unidade: z.string().max(20).optional(),
        ts: z.string().optional().describe("ISO 8601 — default: agora"),
        evolucao_id: z.string().uuid().optional(),
        fonte: FONTE_ENUM.default("manual"),
        confidence: z.number().min(0).max(1).optional(),
        requires_review: z.boolean().default(false),
        source_text: z.string().optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      try {
        const { data, error } = await getDB()
          .from("eventos_clinicos")
          .insert({
            paciente_id: params.paciente_id,
            evolucao_id: params.evolucao_id,
            tipo: params.tipo,
            valor_num: params.valor_num,
            valor_json: params.valor_json,
            unidade: params.unidade,
            ts: params.ts ?? new Date().toISOString(),
            fonte: params.fonte,
            confidence: params.confidence,
            requires_review: params.requires_review,
            source_text: params.source_text,
          })
          .select("id, tipo, valor_num, ts")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const ev = data as { id: string; tipo: string; valor_num: number | null; ts: string };
        return {
          content: [{ type: "text", text: `✅ Evento inserido: **${ev.tipo}** = ${ev.valor_num ?? "—"} | ${fmtTs(ev.ts)} | ID: \`${ev.id}\`` }],
          structuredContent: ev,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Get Timeseries ────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_get_timeseries",
    {
      title: "SASI — Série Temporal de Parâmetro",
      description: `Recupera série temporal de um ou mais parâmetros clínicos para um paciente.

Args:
  - paciente_id (string): UUID do paciente
  - tipos (array): Lista de tipos de eventos (ex: ["pam","lactato","spo2"])
  - desde (string): ISO 8601 — início do período (default: 24h atrás)
  - ate (string): ISO 8601 — fim do período (default: agora)
  - limite (number): Máx de registros por tipo (default: 50)

Retorna: Tabela cronológica dos valores com fonte e flag de revisão.

Exemplos:
  - "Evolução do lactato nas últimas 12h" → tipos=["lactato"]
  - "Hemodinâmica: PAM + vasopressores" → tipos=["pam","nor_dose","adr_dose"]`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        tipos: z.array(TIPO_EVENTO).min(1).max(10),
        desde: z.string().optional().describe("ISO 8601 — default: 24h atrás"),
        ate: z.string().optional().describe("ISO 8601 — default: agora"),
        limite: z.number().int().min(1).max(200).default(50),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, tipos, desde, ate, limite }) => {
      try {
        const agora = new Date();
        const inicio = desde ?? new Date(agora.getTime() - 24 * 3600 * 1000).toISOString();
        const fim = ate ?? agora.toISOString();

        const { data, error } = await getDB()
          .from("eventos_clinicos")
          .select("tipo, valor_num, unidade, ts, fonte, requires_review")
          .eq("paciente_id", paciente_id)
          .in("tipo", tipos)
          .gte("ts", inicio)
          .lte("ts", fim)
          .order("ts", { ascending: true })
          .limit(limite);

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: `Nenhum evento encontrado para ${tipos.join(", ")} no período.` }] };

        const lines = [
          `# Série Temporal — ${tipos.join(", ")}`,
          `Período: ${fmtTs(inicio)} → ${fmtTs(fim)} | ${data.length} registros\n`,
          "| Timestamp | Tipo | Valor | Unidade | Fonte | Rev? |",
          "|---|---|---|---|---|---|",
          ...(data as Array<{ tipo: string; valor_num: number | null; unidade: string | null; ts: string; fonte: string; requires_review: boolean }>).map(ev =>
            `| ${fmtTs(ev.ts)} | ${ev.tipo} | **${ev.valor_num ?? "—"}** | ${ev.unidade ?? ""} | ${ev.fonte} | ${ev.requires_review ? "⚠️" : ""} |`
          )
        ];

        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { data } };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}
