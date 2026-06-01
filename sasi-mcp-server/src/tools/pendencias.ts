import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs } from "../db.js";

export function registerPendenciaTools(server: McpServer): void {

  server.registerTool(
    "sasi_list_pendencias",
    {
      title: "SASI — Listar Pendências",
      description: `Lista pendências (tarefas) abertas ou concluídas.

Args:
  - paciente_id (string): Filtrar por paciente (opcional — sem ele retorna todas as UTIs)
  - apenas_abertas (boolean): Omitir concluídas (default: true)
  - prioridade (1|2|3): Filtrar por prioridade — 1=alta, 2=média, 3=baixa (opcional)

Retorna: Lista de tarefas com prioridade, status e timestamps.`,
      inputSchema: z.object({
        paciente_id: z.string().uuid().optional(),
        apenas_abertas: z.boolean().default(true),
        prioridade: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, apenas_abertas, prioridade }) => {
      try {
        let q = getDB()
          .from("pendencias")
          .select("id, tarefa, prioridade, concluida, concluida_at, created_at, paciente_id")
          .order("prioridade", { ascending: true })
          .order("created_at", { ascending: true });

        if (paciente_id) q = q.eq("paciente_id", paciente_id);
        if (apenas_abertas) q = q.eq("concluida", false);
        if (prioridade) q = q.eq("prioridade", prioridade);

        const { data, error } = await q;
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: "Nenhuma pendência encontrada." }] };

        const PRIO = ["", "🔴 ALTA", "🟡 MÉDIA", "🟢 BAIXA"] as const;
        const lines = [
          `# Pendências (${data.length})${paciente_id ? ` — paciente \`${paciente_id}\`` : " — todas as UTIs"}\n`,
          ...(data as Array<{ id: string; tarefa: string; prioridade: number; concluida: boolean; concluida_at: string | null; created_at: string; paciente_id: string }>).map(p =>
            `- [${p.concluida ? "✅" : " "}] ${PRIO[p.prioridade] ?? `P${p.prioridade}`} **${p.tarefa}**\n  Criada: ${fmtTs(p.created_at)}${p.concluida_at ? ` | Concluída: ${fmtTs(p.concluida_at)}` : ""} | ID: \`${p.id}\``
          )
        ];

        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { count: data.length, pendencias: data } };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  server.registerTool(
    "sasi_create_pendencia",
    {
      title: "SASI — Criar Pendência",
      description: `Registra uma nova pendência/tarefa para um paciente.

Args:
  - paciente_id (string): UUID do paciente
  - tarefa (string): Descrição da tarefa (máx 500 chars)
  - prioridade (1|2|3): 1=alta, 2=média, 3=baixa (default: 2)
  - evolucao_id (string): UUID da evolução associada (opcional)`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        tarefa: z.string().min(1).max(500),
        prioridade: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
        evolucao_id: z.string().uuid().optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ paciente_id, tarefa, prioridade, evolucao_id }) => {
      try {
        const { data, error } = await getDB()
          .from("pendencias")
          .insert({ paciente_id, tarefa, prioridade, evolucao_id })
          .select("id, tarefa, prioridade")
          .single();
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const p = data as { id: string; tarefa: string; prioridade: number };
        return {
          content: [{ type: "text", text: `✅ Pendência criada: P${p.prioridade} — "${p.tarefa}" | ID: \`${p.id}\`` }],
          structuredContent: p,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  server.registerTool(
    "sasi_close_pendencia",
    {
      title: "SASI — Concluir Pendência",
      description: `Marca uma pendência como concluída.

Args:
  - pendencia_id (string): UUID da pendência`,
      inputSchema: z.object({
        pendencia_id: z.string().uuid(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ pendencia_id }) => {
      try {
        const { data, error } = await getDB()
          .from("pendencias")
          .update({ concluida: true, concluida_at: new Date().toISOString() })
          .eq("id", pendencia_id)
          .select("id, tarefa")
          .single();
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const p = data as { id: string; tarefa: string };
        return {
          content: [{ type: "text", text: `✅ Pendência concluída: "${p.tarefa}" | ID: \`${p.id}\`` }],
          structuredContent: p,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}
