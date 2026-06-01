import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs } from "../db.js";

const PLANTAO_ENUM = z.enum(["manha", "tarde", "noite", "plantao_24h"]);

export function registerEvolucaoTools(server: McpServer): void {

  // ── Get Latest Evolution ──────────────────────────────────────────────────
  server.registerTool(
    "sasi_get_evolution",
    {
      title: "SASI — Última Evolução",
      description: `Retorna a evolução mais recente (ou lista histórica) de um paciente.

Args:
  - paciente_id (string): UUID do paciente
  - listar (boolean): Listar histórico completo em vez da última (default: false)
  - limite (number): Nº de evoluções no histórico (default: 5, máx: 20)

Retorna: SOAP por sistemas + SOFA + prescrição vigente.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        listar: z.boolean().default(false),
        limite: z.number().int().min(1).max(20).default(5),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, listar, limite }) => {
      try {
        const { data, error } = await getDB()
          .from("evolucoes")
          .select("*")
          .eq("paciente_id", paciente_id)
          .order("data_evolucao", { ascending: false })
          .limit(listar ? limite : 1);

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: "Nenhuma evolução encontrada para este paciente." }] };

        if (listar) {
          const lines = [`# Histórico de Evoluções (${data.length})\n`,
            ...data.map((e, i) => `${i + 1}. ${fmtTs(e.data_evolucao as string)} — ${e.plantao} | SOFA: ${e.sofa_total ?? "—"} | ID: \`${e.id}\``)
          ];
          return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { evolutions: data } };
        }

        const e = data[0];
        const pres = e.prescricao as Record<string, string[]> ?? {};

        const lines = [
          `# Evolução — ${fmtTs(e.data_evolucao as string)} (${e.plantao})`,
          `**SOFA**: ${e.sofa_total ?? "—"} | **ID**: \`${e.id}\`\n`,
          fmtSystem("NEURO", e.neuro as Record<string, unknown>),
          fmtSystem("RESP", e.resp as Record<string, unknown>),
          fmtSystem("HEMO", e.hemo as Record<string, unknown>),
          fmtSystem("RENAL", e.renal as Record<string, unknown>),
          fmtSystem("TGI", e.tgi as Record<string, unknown>),
          fmtSystem("HEMATO", e.hemato as Record<string, unknown>),
          fmtSystem("INFECTO", e.infecto as Record<string, unknown>),
          "",
          (e.impressao as string[])?.length ? `## Impressão\n${(e.impressao as string[]).map((x, i) => `${i + 1}. ${x}`).join("\n")}` : "",
          (e.conduta as string[])?.length ? `## Conduta\n${(e.conduta as string[]).map((x, i) => `${i + 1}. ${x}`).join("\n")}` : "",
          "",
          Object.keys(pres).length ? [
            "## Prescrição Vigente",
            ...Object.entries(pres).filter(([, v]) => v?.length).map(([cat, items]) =>
              `**${cat}**:\n${(items as string[]).map(d => `  - ${d}`).join("\n")}`
            )
          ].join("\n") : "",
        ].filter(Boolean).join("\n");

        return { content: [{ type: "text", text: lines }], structuredContent: e };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Create Evolution ──────────────────────────────────────────────────────
  server.registerTool(
    "sasi_create_evolution",
    {
      title: "SASI — Registrar Evolução",
      description: `Registra uma nova evolução médica para um paciente.

Args:
  - paciente_id (string): UUID do paciente
  - plantao ('manha'|'tarde'|'noite'|'plantao_24h'): Turno
  - sofa_total (number): Score SOFA total 0–24 (opcional)
  - neuro, resp, hemo, renal, tgi, hemato, infecto (object): Dados por sistema — estrutura livre JSONB
  - impressao (array de strings): Lista de impressões diagnósticas
  - conduta (array de strings): Lista de condutas
  - prescricao (object): Kardex por categoria — {cardiovascular, snc, gastro_endocrino, infeccioso_resp, sintomaticos_sn, solucoes_diureticos, nutricao} — cada um array de strings

Retorna: ID da evolução criada.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        plantao: PLANTAO_ENUM.default("manha"),
        sofa_total: z.number().int().min(0).max(24).optional(),
        neuro: z.record(z.unknown()).optional(),
        resp: z.record(z.unknown()).optional(),
        hemo: z.record(z.unknown()).optional(),
        renal: z.record(z.unknown()).optional(),
        tgi: z.record(z.unknown()).optional(),
        hemato: z.record(z.unknown()).optional(),
        infecto: z.record(z.unknown()).optional(),
        impressao: z.array(z.string()).optional(),
        conduta: z.array(z.string()).optional(),
        prescricao: z.record(z.array(z.string())).optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ paciente_id, plantao, sofa_total, impressao, conduta, prescricao, ...sistemas }) => {
      try {
        const { data, error } = await getDB()
          .from("evolucoes")
          .insert({
            paciente_id,
            plantao,
            sofa_total,
            impressao: impressao ?? [],
            conduta: conduta ?? [],
            prescricao: prescricao ?? {},
            ...sistemas,
          })
          .select("id, data_evolucao, plantao, sofa_total")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const e = data as { id: string; data_evolucao: string; plantao: string; sofa_total: number | null };
        return {
          content: [{ type: "text", text: `✅ Evolução registrada: ${fmtTs(e.data_evolucao)} (${e.plantao}) | SOFA: ${e.sofa_total ?? "—"} | ID: \`${e.id}\`` }],
          structuredContent: e,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}

function fmtSystem(name: string, data: Record<string, unknown> | null | undefined): string {
  if (!data || !Object.keys(data).length) return "";
  const fields = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(" | ");
  return fields ? `**${name}**: ${fields}` : "";
}
