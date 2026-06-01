import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs, semaforo } from "../db.js";

export function registerSitrepTools(server: McpServer): void {

  server.registerTool(
    "sasi_sitrep",
    {
      title: "SASI — SITREP Geral da UTI",
      description: `Retorna snapshot tático completo da UTI: todos os pacientes ativos (UTI2/3/4),
com gravidade, dispositivos, SOFA, alertas não reconhecidos, e pendências abertas.

Args:
  - uti ('UTI2' | 'UTI3' | 'UTI4' | 'todas'): Filtrar por unidade (default: 'todas')
  - incluir_alta (boolean): Incluir pacientes com status 'alta' ou 'obito' (default: false)

Retorna: Tabela tática com todos os pacientes + contadores por UTI.

Exemplos:
  - "Situação geral da UTI" → sem parâmetros
  - "Status da UTI2" → uti="UTI2"`,
      inputSchema: z.object({
        uti: z.enum(["UTI2", "UTI3", "UTI4", "todas"]).default("todas"),
        incluir_alta: z.boolean().default(false),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ uti, incluir_alta }) => {
      try {
        const db = getDB();

        let query = db
          .from("pacientes")
          .select(`
            id, leito, uti, nome, idade, gravidade, status_leito,
            dispositivos, isolation, severidade_visual, out_of_range_count,
            hd, data_adm, sofa_baseline,
            evolucoes(sofa_total, data_evolucao, plantao),
            alerts_log(id, severidade, acked),
            pendencias(id, concluida)
          `)
          .order("uti")
          .order("leito");

        if (uti !== "todas") query = query.eq("uti", uti);
        if (!incluir_alta) query = query.in("status_leito", ["ativo"]);

        const { data, error } = await query
          .order("data_evolucao", { referencedTable: "evolucoes", ascending: false })
          .limit(1, { referencedTable: "evolucoes" });

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: "Nenhum paciente ativo encontrado." }] };

        const rows = (data as SitrepRow[]).map(p => {
          const evo = (p.evolucoes as EvoRow[])?.[0];
          const alertas = (p.alerts_log as AlertRow[]) ?? [];
          const alertasAbertos = alertas.filter((a) => !a.acked);
          const alertasCrit = alertasAbertos.filter((a) => a.severidade === "critical").length;
          const alertasWarn = alertasAbertos.filter((a) => a.severidade === "warning").length;
          const pendencias = (p.pendencias as PendRow[]) ?? [];
          const pendAbertas = pendencias.filter((x) => !x.concluida).length;
          const dev = (p.dispositivos ?? {}) as Record<string, boolean>;
          const devStr = Object.entries(dev).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(" ");

          return {
            uti: p.uti,
            leito: p.leito,
            nome: p.nome,
            idade: p.idade,
            gravidade: p.gravidade,
            hd: p.hd ?? "—",
            dias_uti: Math.floor((Date.now() - new Date(p.data_adm).getTime()) / 86400000),
            sofa: evo?.sofa_total ?? "—",
            dispositivos: devStr || "—",
            isolation: p.isolation !== "none" ? p.isolation : "",
            alertas_crit: alertasCrit,
            alertas_warn: alertasWarn,
            pendencias: pendAbertas,
            out_of_range: p.out_of_range_count ?? 0,
          };
        });

        // Agrupa por UTI
        const byUti: Record<string, typeof rows> = {};
        for (const r of rows) {
          if (!byUti[r.uti]) byUti[r.uti] = [];
          byUti[r.uti].push(r);
        }

        const lines: string[] = ["# 🏥 SITREP SASI — COMANDO UTI", `_${fmtTs(new Date().toISOString())}_\n`];

        for (const [u, pts] of Object.entries(byUti)) {
          const crit = pts.filter((p) => p.gravidade === "critico" || p.gravidade === "grave").length;
          lines.push(`## ${u}  (${pts.length} pacientes | ${crit} graves/críticos)`);
          lines.push(`| Leito | Paciente | Idade | Gravidade | HD | D-UTI | SOFA | Disp | Alertas | Pend |`);
          lines.push(`|---|---|---|---|---|---|---|---|---|---|`);
          for (const r of pts) {
            const alStr = r.alertas_crit > 0 ? `🔴${r.alertas_crit}` : r.alertas_warn > 0 ? `🟡${r.alertas_warn}` : "✅";
            const iso = r.isolation ? ` [${r.isolation}]` : "";
            lines.push(
              `| **${r.leito}** | ${r.nome}${iso} | ${r.idade ?? "?"}a | ${semaforo(r.gravidade)} ${r.gravidade} | ${r.hd} | D${r.dias_uti} | ${r.sofa} | ${r.dispositivos} | ${alStr} | ${r.pendencias} |`
            );
          }
          lines.push("");
        }

        const totalCrit = rows.filter((r) => r.alertas_crit > 0).length;
        const totalPend = rows.reduce((s, r) => s + r.pendencias, 0);
        lines.push(`---\n**Total**: ${rows.length} pacientes | **Alertas críticos**: ${totalCrit} leitos | **Pendências abertas**: ${totalPend}`);

        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { rows } };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}

// Tipos auxiliares
interface SitrepRow {
  id: string; leito: string; uti: string; nome: string; idade: number | null;
  gravidade: string; status_leito: string; dispositivos: Record<string, boolean> | null;
  isolation: string; severidade_visual: string; out_of_range_count: number | null;
  hd: string | null; data_adm: string; sofa_baseline: number | null;
  evolucoes: EvoRow[]; alerts_log: AlertRow[]; pendencias: PendRow[];
}
interface EvoRow { sofa_total: number | null; data_evolucao: string; plantao: string; }
interface AlertRow { id: string; severidade: string; acked: boolean; }
interface PendRow { id: string; concluida: boolean; }
