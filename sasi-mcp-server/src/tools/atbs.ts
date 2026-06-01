import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs } from "../db.js";

const VIA_ENUM = z.enum(["EV","VO","IM","SC","SNE","SNG","IT","Tópico"]);
const INTENCAO_ENUM = z.enum(["empirica","dirigida","profilatica"]);

export function registerAtbTools(server: McpServer): void {

  server.registerTool(
    "sasi_list_atbs",
    {
      title: "SASI — Listar Antibióticos",
      description: `Lista antibióticos ativos ou histórico de um paciente.

Args:
  - paciente_id (string): UUID do paciente
  - apenas_ativos (boolean): Omitir ATBs com data_fim (default: true)

Retorna: Droga, dose, via, DTA (dias de terapia), intenção, foco, agente-alvo.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        apenas_ativos: z.boolean().default(true),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, apenas_ativos }) => {
      try {
        let q = getDB()
          .from("atbs")
          .select("*")
          .eq("paciente_id", paciente_id)
          .order("data_inicio", { ascending: false });
        if (apenas_ativos) q = q.is("data_fim", null);

        const { data, error } = await q;
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: "Nenhum ATB encontrado." }] };

        const lines = [
          `# ATBs ${apenas_ativos ? "Ativos" : "(Histórico)"} — ${data.length} registros\n`,
          ...(data as AtbRow[]).map(a => {
            const dta = Math.floor((Date.now() - new Date(a.data_inicio).getTime()) / 86400000);
            return [
              `**${a.droga}** ${a.dose ?? ""} ${a.via ?? ""} ${a.frequencia ?? ""}`,
              `DTA: **D${dta}** (início ${fmtTs(a.data_inicio)}${a.data_fim ? ` — fim ${fmtTs(a.data_fim)}` : ""})`,
              `Intenção: ${a.intencao ?? "—"} | Foco: ${a.foco ?? "—"} | Alvo: ${a.agente_alvo ?? "—"}`,
              a.motivo_suspensao ? `Suspensão: ${a.motivo_suspensao}` : "",
              `ID: \`${a.id}\``,
              "---"
            ].filter(Boolean).join("\n");
          })
        ];

        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { atbs: data } };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  server.registerTool(
    "sasi_start_atb",
    {
      title: "SASI — Iniciar Antibiótico",
      description: `Registra início de um novo antibiótico.

Args:
  - paciente_id (string): UUID do paciente
  - droga (string): Nome do antibiótico
  - dose (string): Dose com unidade (ex: '500mg', '4g')
  - via ('EV'|'VO'|'IM'|'SC'|'SNE'|'SNG'|'IT'|'Tópico')
  - frequencia (string): Intervalo (ex: '8/8h', '12/12h', '1x/dia')
  - intencao ('empirica'|'dirigida'|'profilatica')
  - foco (string): Sítio de infecção (ex: 'PAV', 'ITU', 'sepse abdominal')
  - agente_alvo (string): Germe alvo (ex: 'MRSA', 'Klebsiella')
  - data_inicio (string): YYYY-MM-DD (default: hoje)`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        droga: z.string().min(1).max(200),
        dose: z.string().optional(),
        via: VIA_ENUM.optional(),
        frequencia: z.string().optional(),
        intencao: INTENCAO_ENUM.optional(),
        foco: z.string().optional(),
        agente_alvo: z.string().optional(),
        data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      try {
        const { data, error } = await getDB()
          .from("atbs")
          .insert({
            paciente_id: params.paciente_id,
            droga: params.droga,
            dose: params.dose,
            via: params.via,
            frequencia: params.frequencia,
            intencao: params.intencao,
            foco: params.foco,
            agente_alvo: params.agente_alvo,
            data_inicio: params.data_inicio ?? new Date().toISOString().split("T")[0],
          })
          .select("id, droga, data_inicio")
          .single();
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const a = data as { id: string; droga: string; data_inicio: string };
        return {
          content: [{ type: "text", text: `✅ ATB iniciado: **${a.droga}** | início ${fmtTs(a.data_inicio)} | ID: \`${a.id}\`` }],
          structuredContent: a,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  server.registerTool(
    "sasi_stop_atb",
    {
      title: "SASI — Suspender Antibiótico",
      description: `Define data de fim de um antibiótico (suspensão/alta/óbito/desescalonamento).

Args:
  - atb_id (string): UUID do ATB (obter de sasi_list_atbs)
  - motivo_suspensao (string): Razão da suspensão (ex: 'alta', 'desescalonamento', 'óbito', 'toxicidade')
  - data_fim (string): YYYY-MM-DD (default: hoje)`,
      inputSchema: z.object({
        atb_id: z.string().uuid(),
        motivo_suspensao: z.string().min(1).max(200),
        data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ atb_id, motivo_suspensao, data_fim }) => {
      try {
        const { data, error } = await getDB()
          .from("atbs")
          .update({
            data_fim: data_fim ?? new Date().toISOString().split("T")[0],
            motivo_suspensao,
            updated_at: new Date().toISOString(),
          })
          .eq("id", atb_id)
          .select("id, droga, data_fim, motivo_suspensao")
          .single();
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const a = data as { id: string; droga: string; data_fim: string; motivo_suspensao: string };
        return {
          content: [{ type: "text", text: `✅ ATB suspenso: **${a.droga}** | ${fmtTs(a.data_fim)} | Motivo: ${a.motivo_suspensao}` }],
          structuredContent: a,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}

interface AtbRow { id: string; droga: string; dose: string | null; via: string | null; frequencia: string | null; data_inicio: string; data_fim: string | null; intencao: string | null; foco: string | null; agente_alvo: string | null; motivo_suspensao: string | null; }
