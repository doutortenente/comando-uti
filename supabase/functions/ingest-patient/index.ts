// ============================================================================
// supabase/functions/ingest-patient/index.ts
// Edge Function de ingest AUDITADO — caminho de escrita do app mobile
// (uti-tracker) para o snapshot clínico, conforme o invariante do SASI
// (STATUS.md §1): toda evolução entra via edge function/skill com audit log.
//
// Recebe um SasiBundle { paciente, evolucao, pendencias, eventos } e:
//   1. upsert em `pacientes` (on conflict id) — last-write-wins
//   2. insert em `evolucoes` (snapshot) -> evolucao_id
//   3. replace de `pendencias` do paciente
//   4. insert de `eventos_clinicos` (tendência de SOFA) com evolucao_id
//   5. SEMPRE grava `ingest_audit_log` (ok/erro) — LGPD
//
// Usa SERVICE ROLE (bypassa RLS). Enquanto o auth do SASI está em bypass,
// deploy com verify_jwt=false; quando o login voltar, exigir JWT e derivar
// user_id do token (TODO no plano, Fase 6).
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let bundle: any;
  try {
    bundle = await req.json();
  } catch {
    return json({ ok: false, error: 'JSON inválido' }, 400);
  }

  const { paciente, evolucao, pendencias = [], eventos = [] } = bundle ?? {};

  // Validação mínima (constraints do schema fazem o resto).
  if (!paciente?.id || !paciente?.leito || !paciente?.uti || !paciente?.nome) {
    return json({ ok: false, error: 'paciente.id/leito/uti/nome são obrigatórios' }, 400);
  }
  if (!String(paciente.nome).trim()) {
    return json({ ok: false, error: 'paciente.nome não pode ser vazio (constraint do SASI)' }, 400);
  }

  const pacienteId = paciente.id as string;
  let evolucaoId: string | null = null;
  let eventosIds: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. pacientes — upsert idempotente
    const { error: ePac } = await supabase.from('pacientes').upsert(paciente, { onConflict: 'id' });
    if (ePac) throw new Error(`pacientes: ${ePac.message}`);

    // 2. evolucoes — snapshot
    const { data: ev, error: eEvo } = await supabase
      .from('evolucoes')
      .insert({ ...evolucao, paciente_id: pacienteId })
      .select('id')
      .single();
    if (eEvo) throw new Error(`evolucoes: ${eEvo.message}`);
    evolucaoId = ev!.id;

    // 3. pendencias — replace (last-write-wins)
    const { error: eDel } = await supabase.from('pendencias').delete().eq('paciente_id', pacienteId);
    if (eDel) warnings.push(`pendencias.delete: ${eDel.message}`);
    if (Array.isArray(pendencias) && pendencias.length > 0) {
      const rows = pendencias.map((pe: any) => ({
        ...pe,
        paciente_id: pacienteId,
        evolucao_id: evolucaoId,
      }));
      const { error: ePend } = await supabase.from('pendencias').insert(rows);
      if (ePend) warnings.push(`pendencias.insert: ${ePend.message}`);
    }

    // 4. eventos_clinicos — tendência (SOFA)
    if (Array.isArray(eventos) && eventos.length > 0) {
      const rows = eventos.map((e: any) => ({
        ...e,
        paciente_id: pacienteId,
        evolucao_id: evolucaoId,
      }));
      const { data: evs, error: eEvt } = await supabase.from('eventos_clinicos').insert(rows).select('id');
      if (eEvt) warnings.push(`eventos.insert: ${eEvt.message}`);
      else eventosIds = (evs ?? []).map((x: { id: string }) => x.id);
    }

    // 5. audit log (sucesso)
    await supabase.from('ingest_audit_log').insert({
      paciente_id: pacienteId,
      source_type: 'mobile_app',
      fonte: 'api_import',
      payload_raw: bundle,
      response: { evolucao_id: evolucaoId, eventos_ids: eventosIds, warnings },
      eventos_ids: eventosIds,
      warnings,
      ok: true,
    });

    return json({ ok: true, evolucao_id: evolucaoId, eventos_ids: eventosIds, warnings });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    // audit log (falha) — best effort
    await supabase
      .from('ingest_audit_log')
      .insert({
        paciente_id: pacienteId,
        source_type: 'mobile_app',
        fonte: 'api_import',
        payload_raw: bundle,
        ok: false,
        error_msg: error,
      })
      .then(() => {}, () => {});
    return json({ ok: false, error }, 500);
  }
});
