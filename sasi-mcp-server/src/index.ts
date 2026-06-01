#!/usr/bin/env node
/**
 * SASI MCP Server — Sistema de Auditoria e Síntese Intensiva
 * Comando UTI Alpha | UTI2 (12 leitos) · UTI3 (13 leitos) · UTI4 (8 leitos)
 *
 * Variáveis de ambiente obrigatórias:
 *   SUPABASE_URL              — URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Service Role Key (bypassa RLS — só para uso local)
 *
 * Transport: stdio (Claude Desktop)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSitrepTools }    from "./tools/sitrep.js";
import { registerPacienteTools }  from "./tools/pacientes.js";
import { registerEvolucaoTools }  from "./tools/evolucoes.js";
import { registerEventoTools }    from "./tools/eventos.js";
import { registerPendenciaTools } from "./tools/pendencias.js";
import { registerAtbTools }       from "./tools/atbs.js";
import { registerCulturaTools }   from "./tools/culturas.js";
import { registerAlertTools }     from "./tools/alerts.js";

// ── Server ────────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "sasi-mcp-server",
  version: "1.0.0",
});

// ── Registro de todas as tools ────────────────────────────────────────────────
registerSitrepTools(server);    // sasi_sitrep
registerPacienteTools(server);  // sasi_list_patients · sasi_get_patient · sasi_admit_patient · sasi_update_patient
registerEvolucaoTools(server);  // sasi_get_evolution · sasi_create_evolution
registerEventoTools(server);    // sasi_insert_event · sasi_get_timeseries
registerPendenciaTools(server); // sasi_list_pendencias · sasi_create_pendencia · sasi_close_pendencia
registerAtbTools(server);       // sasi_list_atbs · sasi_start_atb · sasi_stop_atb
registerCulturaTools(server);   // sasi_list_culturas · sasi_create_cultura · sasi_add_antibiograma · sasi_update_cultura
registerAlertTools(server);     // sasi_list_alerts · sasi_ack_alert · sasi_ack_all_alerts

// ── Startup ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.\n" +
      "   Encontre em: https://supabase.com/dashboard/project/idswehsvvqczzkiatuzu/settings/api"
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SASI MCP Server operacional — Comando UTI pronto.");
}

main().catch((err: Error) => {
  console.error("Erro fatal:", err.message);
  process.exit(1);
});
