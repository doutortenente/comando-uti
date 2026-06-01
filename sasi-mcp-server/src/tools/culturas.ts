import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs } from "../db.js";

const MATERIAL_ENUM = z.enum([
  "hemocultura","urocultura","aspirado_traqueal","lavado_bal",
  "lcr","secrecao_ferida","liquido_peritoneal","liquido_pleural","outro"
]);
const RESULTADO_ENUM = z.enum(["S","I","R"]);

export function registerCulturaTools(server: McpServer): void {

  // ── List Culturas ─────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_list_culturas",
    {
      title: "SASI — Listar Culturas",
      description: `Lista culturas microbiológicas de um paciente com antibiograma.

Args:
  - paciente_id (string): UUID do paciente
  - apenas_pendentes (boolean): Mostrar apenas culturas sem laudo (default: false)
  - apenas_positivas (boolean): Mostrar apenas culturas com crescimento (default: false)

Retorna: Material, data de coleta, laudo, agente isolado, antibiograma.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        apenas_pendentes: z.boolean().default(false),
        apenas_positivas: z.boolean().default(false),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, apenas_pendentes, apenas_positivas }) => {
      try {
        let q = getDB()
          .from("culturas")
          .select("*, antibiograma(antibiotico, resultado, cim)")
          .eq("paciente_id", paciente_id)
          .order("coleta_ts", { ascending: false });

        if (apenas_pendentes) q = q.is("laudo_ts", null);
        if (apenas_positivas) q = q.eq("crescimento", true);

        const { data, error } = await q;
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: "Nenhuma cultura encontrada." }] };

        const lines = [`# Culturas (${data.length})\n`];
        for (const c of data as CulturaRow[]) {
          const ab = (c.antibiograma ?? []) as AbRow[];
          const abStr = ab.length
            ? ab.map(a => `${a.antibiotico} [${a.resultado}]${a.cim ? ` CIM:${a.cim}` : ""}`).join(", ")
            : "sem antibiograma";

          lines.push([
            `**${c.material.toUpperCase()}** — coletada ${fmtTs(c.coleta_ts)}`,
            c.laudo_ts ? `Laudo: ${fmtTs(c.laudo_ts)} | ${c.crescimento ? `🔴 POSITIVA: **${c.agente ?? "NID"}**` : "✅ NEGATIVA"}` : "⏳ Aguardando laudo",
            c.crescimento && ab.length ? `Antibiograma: ${abStr}` : "",
            c.observacoes ? `Obs: ${c.observacoes}` : "",
            `ID: \`${c.id}\``,
            "---"
          ].filter(Boolean).join("\n"));
        }

        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { culturas: data } };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Create Cultura ────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_create_cultura",
    {
      title: "SASI — Registrar Cultura",
      description: `Registra uma nova cultura microbiológica (coleta ou resultado).

Args:
  - paciente_id (string): UUID do paciente
  - material: Tipo de material
  - coleta_ts (string): ISO 8601 da coleta (default: agora)
  - crescimento (boolean): Houve crescimento? (default: false)
  - agente (string): Micro-organismo isolado (obrigatório se crescimento=true)
  - laudo_ts (string): ISO 8601 do laudo (opcional — omitir se ainda sem resultado)
  - ufc_por_ml (number): UFC/mL para urocultura (opcional)
  - observacoes (string): Texto livre

Para registrar coleta inicial sem resultado: omitir laudo_ts, crescimento=false.
Para atualizar com resultado: use sasi_update_cultura.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        material: MATERIAL_ENUM,
        coleta_ts: z.string().optional().describe("ISO 8601 — default: agora"),
        crescimento: z.boolean().default(false),
        agente: z.string().optional(),
        laudo_ts: z.string().optional(),
        ufc_por_ml: z.number().positive().optional(),
        observacoes: z.string().optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      try {
        const { data, error } = await getDB()
          .from("culturas")
          .insert({
            paciente_id: params.paciente_id,
            material: params.material,
            coleta_ts: params.coleta_ts ?? new Date().toISOString(),
            crescimento: params.crescimento,
            agente: params.agente,
            laudo_ts: params.laudo_ts,
            ufc_por_ml: params.ufc_por_ml,
            observacoes: params.observacoes,
          })
          .select("id, material, crescimento, agente")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const c = data as { id: string; material: string; crescimento: boolean; agente: string | null };
        return {
          content: [{ type: "text", text: `✅ Cultura registrada: **${c.material}** | ${c.crescimento ? `Positiva: ${c.agente}` : "Negativa / Pendente"} | ID: \`${c.id}\`` }],
          structuredContent: c,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Add Antibiograma ──────────────────────────────────────────────────────
  server.registerTool(
    "sasi_add_antibiograma",
    {
      title: "SASI — Adicionar Resultado de Antibiograma",
      description: `Registra um resultado de sensibilidade no antibiograma de uma cultura.

Args:
  - cultura_id (string): UUID da cultura (obter de sasi_list_culturas)
  - antibiotico (string): Nome do antibiótico
  - resultado ('S'|'I'|'R'): Sensível / Intermediário / Resistente
  - cim (number): CIM (µg/mL) — opcional

Pode chamar múltiplas vezes para adicionar vários antibióticos na mesma cultura.`,
      inputSchema: z.object({
        cultura_id: z.string().uuid(),
        antibiotico: z.string().min(1).max(200),
        resultado: RESULTADO_ENUM,
        cim: z.number().positive().optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ cultura_id, antibiotico, resultado, cim }) => {
      try {
        const { data, error } = await getDB()
          .from("antibiograma")
          .insert({ cultura_id, antibiotico, resultado, cim })
          .select("id, antibiotico, resultado, cim")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const a = data as { id: string; antibiotico: string; resultado: string; cim: number | null };
        return {
          content: [{ type: "text", text: `✅ Antibiograma: **${a.antibiotico}** → [**${a.resultado}**]${a.cim ? ` CIM: ${a.cim} µg/mL` : ""} | ID: \`${a.id}\`` }],
          structuredContent: a,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Update Cultura (resultado chegou) ─────────────────────────────────────
  server.registerTool(
    "sasi_update_cultura",
    {
      title: "SASI — Atualizar Resultado de Cultura",
      description: `Atualiza uma cultura existente com o laudo definitivo.

Args:
  - cultura_id (string): UUID da cultura
  - crescimento (boolean): Houve crescimento?
  - agente (string): Micro-organismo isolado
  - laudo_ts (string): ISO 8601 do laudo (default: agora)
  - ufc_por_ml (number): UFC/mL (urocultura)
  - observacoes (string): Texto livre`,
      inputSchema: z.object({
        cultura_id: z.string().uuid(),
        crescimento: z.boolean().optional(),
        agente: z.string().optional(),
        laudo_ts: z.string().optional(),
        ufc_por_ml: z.number().positive().optional(),
        observacoes: z.string().optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ cultura_id, ...fields }) => {
      try {
        const patch = {
          ...fields,
          laudo_ts: fields.laudo_ts ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await getDB()
          .from("culturas")
          .update(patch)
          .eq("id", cultura_id)
          .select("id, material, crescimento, agente")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const c = data as { id: string; material: string; crescimento: boolean; agente: string | null };
        return {
          content: [{ type: "text", text: `✅ Cultura atualizada: **${c.material}** | ${c.crescimento ? `Positiva: ${c.agente ?? "NID"}` : "Negativa"}` }],
          structuredContent: c,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}

interface CulturaRow {
  id: string; material: string; coleta_ts: string; laudo_ts: string | null;
  crescimento: boolean; agente: string | null; ufc_por_ml: number | null;
  observacoes: string | null; antibiograma: AbRow[];
}
interface AbRow { antibiotico: string; resultado: string; cim: number | null; }
