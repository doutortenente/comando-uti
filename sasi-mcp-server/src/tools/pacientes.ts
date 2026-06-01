import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDB, handleDBError, fmtTs, semaforo } from "../db.js";

const UTI_ENUM = z.enum(["UTI2", "UTI3", "UTI4"]);
const GRAVIDADE_ENUM = z.enum(["estavel", "moderado", "grave", "critico", "obito"]);
const STATUS_ENUM = z.enum(["ativo", "alta", "obito", "transferencia"]);
const ISOLATION_ENUM = z.enum(["none", "contact", "droplet", "aerosol"]);

export function registerPacienteTools(server: McpServer): void {

  // ── List Patients ─────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_list_patients",
    {
      title: "SASI — Listar Pacientes",
      description: `Lista pacientes da UTI com filtros opcionais.

Args:
  - uti ('UTI2'|'UTI3'|'UTI4'): Filtrar por unidade (opcional)
  - status_leito ('ativo'|'alta'|'obito'|'transferencia'): Default 'ativo'
  - gravidade ('estavel'|'moderado'|'grave'|'critico'|'obito'): Filtro opcional

Retorna: Lista com leito, nome, HD, gravidade, dispositivos, dias de UTI.`,
      inputSchema: z.object({
        uti: UTI_ENUM.optional(),
        status_leito: STATUS_ENUM.default("ativo"),
        gravidade: GRAVIDADE_ENUM.optional(),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ uti, status_leito, gravidade }) => {
      try {
        let q = getDB()
          .from("pacientes")
          .select("id, leito, uti, nome, idade, hd, gravidade, status_leito, dispositivos, isolation, data_adm, sofa_baseline, out_of_range_count")
          .eq("status_leito", status_leito)
          .order("uti").order("leito");
        if (uti) q = q.eq("uti", uti);
        if (gravidade) q = q.eq("gravidade", gravidade);

        const { data, error } = await q;
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        if (!data?.length) return { content: [{ type: "text", text: "Nenhum paciente encontrado." }] };

        const lines = [
          `# Pacientes (${status_leito}${uti ? ` — ${uti}` : ""})  ${data.length} registros\n`,
          ...data.map(p => {
            const dev = Object.entries((p.dispositivos ?? {}) as Record<string, boolean>)
              .filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(" ");
            const dias = Math.floor((Date.now() - new Date(p.data_adm).getTime()) / 86400000);
            return `**${p.uti} / ${p.leito}** — ${semaforo(p.gravidade)} ${p.nome} (${p.idade ?? "?"}a) | ${p.hd ?? "sem HD"} | D${dias}-UTI | ${dev || "sem disp"} | SOFA-base ${p.sofa_baseline ?? "—"} | ID: \`${p.id}\``;
          })
        ];
        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { count: data.length, patients: data } };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Get Patient ───────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_get_patient",
    {
      title: "SASI — Detalhes do Paciente",
      description: `Retorna dados completos de um paciente incluindo última evolução, ATBs ativos, culturas pendentes e alertas abertos.

Args:
  - paciente_id (string): UUID do paciente (use sasi_list_patients para obter)
  - leito (string): Alternativa ao paciente_id — busca por leito (ex: 'L01', 'L02')
  - uti ('UTI2'|'UTI3'|'UTI4'): Obrigatório se usar leito

Use um dos dois: paciente_id OU (leito + uti).`,
      inputSchema: z.object({
        paciente_id: z.string().uuid().optional().describe("UUID do paciente (alternativa ao leito+uti)"),
        leito: z.string().optional().describe("Identificador do leito, ex: 'L01'"),
        uti: UTI_ENUM.optional().describe("Obrigatório se usar leito"),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ paciente_id, leito, uti }) => {
      try {
        if (!paciente_id && !(leito && uti)) {
          return { content: [{ type: "text", text: "Erro: informe paciente_id ou (leito + uti)." }] };
        }
        const db = getDB();

        let q = db.from("pacientes").select(`
          *,
          evolucoes(id, data_evolucao, plantao, sofa_total, sofa_snapshot, impressao, conduta, prescricao, neuro, resp, hemo, renal, tgi, hemato, infecto),
          atbs(id, droga, dose, via, frequencia, data_inicio, data_fim, intencao, foco, agente_alvo),
          culturas(id, material, coleta_ts, laudo_ts, crescimento, agente, observacoes),
          alerts_log(id, tipo, severidade, mensagem, acked, created_at),
          pendencias(id, tarefa, prioridade, concluida, created_at)
        `);

        if (paciente_id) {
          q = q.eq("id", paciente_id);
        } else {
          q = q.eq("leito", leito!).eq("uti", uti!).eq("status_leito", "ativo");
        }

        q = q
          .order("data_evolucao", { referencedTable: "evolucoes", ascending: false }).limit(1, { referencedTable: "evolucoes" })
          .order("data_inicio", { referencedTable: "atbs", ascending: false })
          .order("coleta_ts", { referencedTable: "culturas", ascending: false })
          .order("created_at", { referencedTable: "alerts_log", ascending: false })
          .limit(1);

        const { data, error } = await q.single();
        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };

        const p = data as PatientDetail;
        const evo = (p.evolucoes as EvoDetail[])?.[0];
        const atbsAtivos = ((p.atbs as AtbRow[]) ?? []).filter(a => !a.data_fim);
        const alertasAbertos = ((p.alerts_log as AlertRow[]) ?? []).filter(a => !a.acked);
        const pendAbertas = ((p.pendencias as PendRow[]) ?? []).filter(x => !x.concluida);
        const culturasPend = ((p.culturas as CulturaRow[]) ?? []).filter(c => !c.laudo_ts);

        const dev = Object.entries((p.dispositivos ?? {}) as Record<string, boolean>)
          .filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(", ");
        const dias = Math.floor((Date.now() - new Date(p.data_adm).getTime()) / 86400000);

        const lines = [
          `# ${semaforo(p.gravidade)} ${p.nome} | ${p.uti} / ${p.leito}`,
          `**HD**: ${p.hd ?? "—"} | **Idade**: ${p.idade ?? "?"}a | **Peso**: ${p.peso ?? "?"}kg | **Altura**: ${p.altura ?? "?"}cm`,
          `**Gravidade**: ${p.gravidade} | **Isolamento**: ${p.isolation} | **Dias UTI**: D${dias}`,
          `**Dispositivos**: ${dev || "nenhum"} | **SOFA-base**: ${p.sofa_baseline ?? "—"}`,
          p.alergias ? `**Alergias**: ⚠️ ${p.alergias}` : "",
          `**Adm**: ${fmtTs(p.data_adm)} | **ID**: \`${p.id}\``,
          "",
          evo ? [
            `## Última Evolução — ${fmtTs(evo.data_evolucao)} (${evo.plantao})`,
            `**SOFA**: ${evo.sofa_total ?? "—"}`,
            evo.impressao?.length ? `**Impressão**: ${evo.impressao.join("; ")}` : "",
            evo.conduta?.length ? `**Conduta**: ${evo.conduta.map((c, i) => `${i + 1}. ${c}`).join(" | ")}` : "",
          ].filter(Boolean).join("\n") : "## Sem evoluções registradas",
          "",
          atbsAtivos.length ? [
            `## ATBs Ativos (${atbsAtivos.length})`,
            ...atbsAtivos.map(a => `- **${a.droga}** ${a.dose ?? ""} ${a.via ?? ""} ${a.frequencia ?? ""} | início ${fmtTs(a.data_inicio)} | ${a.intencao ?? ""} | foco: ${a.foco ?? "—"} | ID: \`${a.id}\``)
          ].join("\n") : "## ATBs: nenhum ativo",
          "",
          culturasPend.length ? `## Culturas pendentes (${culturasPend.length}): ${culturasPend.map(c => `${c.material} — coletada ${fmtTs(c.coleta_ts)}`).join("; ")}` : "",
          alertasAbertos.length ? [
            `## ⚠️ Alertas abertos (${alertasAbertos.length})`,
            ...alertasAbertos.map(a => `- [${a.severidade.toUpperCase()}] ${a.mensagem} | ID: \`${a.id}\``)
          ].join("\n") : "",
          pendAbertas.length ? [
            `## Pendências (${pendAbertas.length})`,
            ...pendAbertas.map(x => `- P${x.prioridade} ${x.tarefa} | ID: \`${x.id}\``)
          ].join("\n") : "",
        ].filter(Boolean).join("\n");

        return { content: [{ type: "text", text: lines }], structuredContent: p as unknown as Record<string, unknown> };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Create Patient (Admissão) ─────────────────────────────────────────────
  server.registerTool(
    "sasi_admit_patient",
    {
      title: "SASI — Admitir Paciente",
      description: `Registra um novo paciente na UTI (admissão).

Args:
  - leito (string): Identificador do leito (ex: 'L01')
  - uti ('UTI2'|'UTI3'|'UTI4'): Unidade
  - nome (string): Nome do paciente
  - idade (number): Idade em anos
  - peso (number): Peso em kg (opcional)
  - altura (number): Altura em cm (opcional)
  - hd (string): Hipótese diagnóstica / motivo de internação
  - alergias (string): Alergias conhecidas (opcional)
  - gravidade ('estavel'|'moderado'|'grave'|'critico'): Classificação (default: 'estavel')
  - sofa_baseline (number): SOFA na admissão (opcional)
  - data_adm (string): Data de admissão YYYY-MM-DD (default: hoje)
  - dispositivos (object): {mv, dva, sed, atb, cvc, trr} — booleans
  - isolation ('none'|'contact'|'droplet'|'aerosol'): Precaução (default: 'none')

Retorna: ID e leito do paciente criado.`,
      inputSchema: z.object({
        leito: z.string().min(1).max(20),
        uti: UTI_ENUM,
        nome: z.string().min(1).max(200),
        idade: z.number().int().min(0).max(130).optional(),
        peso: z.number().min(1).max(400).optional(),
        altura: z.number().min(30).max(250).optional(),
        hd: z.string().optional(),
        alergias: z.string().optional(),
        gravidade: GRAVIDADE_ENUM.default("estavel"),
        sofa_baseline: z.number().int().min(0).max(24).optional(),
        data_adm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        dispositivos: z.object({
          mv: z.boolean().optional(),
          dva: z.boolean().optional(),
          sed: z.boolean().optional(),
          atb: z.boolean().optional(),
          cvc: z.boolean().optional(),
          trr: z.boolean().optional(),
        }).optional(),
        isolation: ISOLATION_ENUM.default("none"),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      try {
        const { data, error } = await getDB()
          .from("pacientes")
          .insert({
            leito: params.leito,
            uti: params.uti,
            nome: params.nome,
            idade: params.idade,
            peso: params.peso,
            altura: params.altura,
            hd: params.hd,
            alergias: params.alergias,
            gravidade: params.gravidade,
            sofa_baseline: params.sofa_baseline,
            data_adm: params.data_adm ?? new Date().toISOString().split("T")[0],
            dispositivos: params.dispositivos ?? {},
            isolation: params.isolation,
          })
          .select("id, leito, uti, nome")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const p = data as { id: string; leito: string; uti: string; nome: string };
        return {
          content: [{ type: "text", text: `✅ Paciente admitido: **${p.nome}** | ${p.uti} / ${p.leito} | ID: \`${p.id}\`` }],
          structuredContent: p,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );

  // ── Update Patient ────────────────────────────────────────────────────────
  server.registerTool(
    "sasi_update_patient",
    {
      title: "SASI — Atualizar Paciente",
      description: `Atualiza campos de um paciente (gravidade, status, dispositivos, isolamento, HD).
Apenas os campos informados são alterados.

Args:
  - paciente_id (string): UUID do paciente
  - gravidade, status_leito, isolation, hd, dispositivos, alergias, peso, sofa_baseline: campos opcionais

Exemplos:
  - Alta → status_leito="alta"
  - Piora clínica → gravidade="critico"
  - Iniciou VM → dispositivos={mv:true}`,
      inputSchema: z.object({
        paciente_id: z.string().uuid(),
        gravidade: GRAVIDADE_ENUM.optional(),
        status_leito: STATUS_ENUM.optional(),
        isolation: ISOLATION_ENUM.optional(),
        hd: z.string().optional(),
        alergias: z.string().optional(),
        peso: z.number().min(1).max(400).optional(),
        sofa_baseline: z.number().int().min(0).max(24).optional(),
        dispositivos: z.object({
          mv: z.boolean().optional(),
          dva: z.boolean().optional(),
          sed: z.boolean().optional(),
          atb: z.boolean().optional(),
          cvc: z.boolean().optional(),
          trr: z.boolean().optional(),
        }).optional(),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ paciente_id, ...fields }) => {
      try {
        const patch: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
        delete patch["paciente_id"];

        const { data, error } = await getDB()
          .from("pacientes")
          .update(patch)
          .eq("id", paciente_id)
          .select("id, leito, uti, nome, gravidade, status_leito")
          .single();

        if (error) return { content: [{ type: "text", text: handleDBError(error) }] };
        const p = data as { id: string; leito: string; uti: string; nome: string; gravidade: string; status_leito: string };
        return {
          content: [{ type: "text", text: `✅ Paciente atualizado: **${p.nome}** | ${p.uti}/${p.leito} | ${p.gravidade} | ${p.status_leito}` }],
          structuredContent: p,
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleDBError(e) }] };
      }
    }
  );
}

// Tipos auxiliares
interface PatientDetail {
  id: string; leito: string; uti: string; nome: string; idade: number | null;
  peso: number | null; altura: number | null; hd: string | null; alergias: string | null;
  gravidade: string; status_leito: string; isolation: string; data_adm: string;
  dispositivos: Record<string, boolean> | null; sofa_baseline: number | null;
  evolucoes: EvoDetail[]; atbs: AtbRow[]; culturas: CulturaRow[];
  alerts_log: AlertRow[]; pendencias: PendRow[];
}
interface EvoDetail { id: string; data_evolucao: string; plantao: string; sofa_total: number | null; sofa_snapshot: unknown; impressao: string[] | null; conduta: string[] | null; prescricao: unknown; neuro: unknown; resp: unknown; hemo: unknown; renal: unknown; tgi: unknown; hemato: unknown; infecto: unknown; }
interface AtbRow { id: string; droga: string; dose: string | null; via: string | null; frequencia: string | null; data_inicio: string; data_fim: string | null; intencao: string | null; foco: string | null; agente_alvo: string | null; }
interface CulturaRow { id: string; material: string; coleta_ts: string; laudo_ts: string | null; crescimento: boolean; agente: string | null; observacoes: string | null; }
interface AlertRow { id: string; tipo: string; severidade: string; mensagem: string; acked: boolean; created_at: string; }
interface PendRow { id: string; tarefa: string; prioridade: number; concluida: boolean; created_at: string; }
lertRow { id: string; tipo: string; severidade: string; mensagem: string; acked: boolean; created_at: string; }
interface PendRow { id: string; tarefa: string; prioridade: number; concluida: boolean; created_at: string; }
