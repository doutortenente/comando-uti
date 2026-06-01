import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs } from "../db.js";

export function registerAlertTools(server: McpServer): void {

  // ── List Alerts ───────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_list_alerts",
    {
      title: "SASI — Listar Alertas",
      description: `Lista alertas clínicos ativos (não reconhecidos) ou histórico.

Args:
  - paciente_id (string): Filtrar por paciente (opcional — sem ele retorna todos)
  - apenas_nao_reconhecidos (boolean): Apenas alertas pendentes de ack (default: true)
  - severidade ('info'|'warning'|'critical'): Filtrar por nível (opcional)
  - limite (number): Máx de alertas (default: 50)

Retorna: Alertas ordenados por severidade e timestamp com payload clínico.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid().optional(),
        apenas_nao_reconhecidos: z.boolean().default(true),
        severidade: z.enum(["info", "warning", "critical"]).optional(),
        limite: z.number().int().min(1).max(200).default(50),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, apenas_nao_reconhecidos, severidade, limite }) => {
      try {
        let q = getDB()
          .from("alerts_log")
          .select("id, paciente_id, tipo, severidade, mensagem, payload, acked, acked_at, created_at")
          .order("created_at", { ascending: false })
          .limit(limite);

        if (paciente_id) q = q.eq("paciente_id", paciente_id);
        if (apenas_nao_reconhecidos) q = q.eq("acked", false);
        if (severidade) q = q.eq("severidade", severidade);

        const { data, error } = await q;
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: "✅ Nenhum alerta ativo." }] };

        const SEV_ICON: Record<string, string> = { critical: "🔴", warning: "🟡", info: "🔵" };
        const lines = [`# Alertas (${data.length})${paciente_id ? ` — paciente \`${paciente_id}\`` : " — todas as UTIs"}\n`];

        for (const a of data as AlertRow[]) {
          lines.push([
            `${SEV_ICON[a.severidade] ?? "⚪"} **[${a.severidade.toUpperCase()}]** ${a.mensagem}`,
            `Tipo: ${a.tipo} | ${fmtTs(a.created_at)} | ${a.acked ? `✅ Reconhecido ${fmtTs(a.acked_at)}` : "⏳ Pendente"}`,
            `ID: \`${a.id}\``,
            "---"
          ].join("\n"));
        }

        const crit = (data as AlertRow[]).filter(a => a.severidade === "critical").length;
        const warn = (data as AlertRow[]).filter(a => a.severidade === "warning").length;
        lines.push(`\n**Resumo**: 🔴 ${crit} críticos | 🟡 ${warn} warnings`);

        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { count: data.length, alerts: data } };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Ack Alert ─────────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_ack_alert",
    {
      title: "SASI — Reconhecer Alerta",
      description: `Reconhece (ACK) um alerta clínico, removendo-o da fila de ativos.

Args:
  - alert_id (string): UUID do alerta (obter de sasi_list_alerts)

Retorna: Confirmação com timestamp do reconhecimento.`,
      inputSchema: z.object({
        alert_id: z.string().uuid(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ alert_id }) => {
      try {
        const { data, error } = await getDB()
          .from("alerts_log")
          .update({ acked: true, acked_at: new Date().toISOString() })
          .eq("id", alert_id)
          .select("id, tipo, mensagem, acked_at")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const a = data as { id: string; tipo: string; mensagem: string; acked_at: string };
        return {
          content: [{ type: "text", text: `✅ Alerta reconhecido: **${a.mensagem}** | ${fmtTs(a.acked_at)} | ID: \`${a.id}\`` }],
          structuredContent: a,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Ack All Alerts (paciente ou UTI) ──────────────────────────────────────
  server.registerTool(
    "sasi_ack_all_alerts",
    {
      title: "SASI — Reconhecer Todos os Alertas",
      description: `Reconhece todos os alertas ativos de um paciente ou de uma UTI inteira.

Args:
  - paciente_id (string): Reconhecer alertas de um paciente específico (opcional)
  - severidade ('info'|'warning'|'critical'): Limitar a um nível de severidade (opcional)

⚠️ Sem paciente_id: reconhece TODOS os alertas ativos da UTI. Use com cautela.

Retorna: Contagem de alertas reconhecidos.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid().optional(),
        severidade: z.enum(["info", "warning", "critical"]).optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, severidade }) => {
      try {
        let q = getDB()
          .from("alerts_log")
          .update({ acked: true, acked_at: new Date().toISOString() })
          .eq("acked", false);

        if (paciente_id) q = q.eq("paciente_id", paciente_id);
        if (severidade) q = q.eq("severidade", severidade);

        const { data, error } = await q.select("id");
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const count = (data as { id: string }[]).length;
        return {
          content: [{ type: "text", text: `✅ ${count} alerta(s) reconhecido(s)${paciente_id ? ` para paciente \`${paciente_id}\`` : " (todos)"}` }],
          structuredContent: { acked_count: count },
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}

interface AlertRow {
  id: string; paciente_id: string; tipo: string; severidade: string;
  mensagem: string; payload: unknown; acked: boolean;
  acked_at: string | null; created_at: string;
}
