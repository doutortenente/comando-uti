-- ============================================================================
-- 05_schema_real_snapshot.sql
-- SNAPSHOT AUTORITATIVO do schema REAL em produção (projeto idswehsvvqczzkiatuzu)
-- Capturado em 2026-06-14 via Supabase MCP (catálogo pg_*).
--
-- Por que este arquivo existe:
--   As migrations 01–04 deste diretório descrevem o schema ANTIGO de 4 tabelas
--   (patients/clinical_parameters/prescriptions/lab_results), que está OBSOLETO
--   (ver STATUS.md §4). O schema real de produção (9 tabelas + 5 views + funções
--   + RLS) só existia no Supabase e nas interfaces TS do app. Este snapshot
--   versiona essa verdade — pré-requisito (Fase 0) do plano de convergência do
--   app mobile (uti-tracker) para este mesmo Supabase.
--
-- Natureza: idempotente/re-aplicável (IF NOT EXISTS / OR REPLACE / DROP POLICY
-- IF EXISTS). Reflete o estado de produção COMO ESTÁ — inclusive as 11 políticas
-- `dev_bypass USING (true)` (auth desabilitada) e os pontos sinalizados pelo
-- database linter (ver supabase/migrations/README.md).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;   -- digest() em fn_alert_hash
create extension if not exists pg_trgm;     -- busca por nome (idx_pacientes_nome_trgm)

-- ---------------------------------------------------------------------------
-- Tabelas (sem FKs; FKs adicionadas depois para evitar ordem de dependência)
-- ---------------------------------------------------------------------------

create table if not exists public.pacientes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  leito              text not null,
  uti                text not null check (uti = any (array['UTI2','UTI3','UTI4'])),
  nome               text not null check (char_length(nome) between 1 and 200),
  idade              integer check (idade between 0 and 130),
  peso               numeric check (peso between 1 and 400),
  altura             numeric check (altura between 30 and 250),
  hd                 text,
  data_adm           date not null default current_date,
  alergias           text,
  gravidade          text not null default 'estavel'
                       check (gravidade = any (array['estavel','moderado','grave','critico','obito'])),
  status_leito       text not null default 'ativo'
                       check (status_leito = any (array['ativo','alta','obito','transferencia'])),
  sofa_baseline      integer check (sofa_baseline between 0 and 24),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  dispositivos       jsonb not null default '{}'::jsonb,
  isolation          text not null default 'none'
                       check (isolation = any (array['none','contact','droplet','aerosol'])),
  out_of_range_count integer not null default 0,
  severidade_visual  text not null default 'green'
                       check (severidade_visual = any (array['red','yellow','green'])),
  patient_summary    jsonb
);
comment on column public.pacientes.dispositivos      is 'Dispositivos em uso: {mv, dva, sed, atb, cvc, trr} — booleans';
comment on column public.pacientes.isolation         is 'Precaução de isolamento: none | contact | droplet | aerosol';
comment on column public.pacientes.out_of_range_count is 'Nº de parâmetros fora do range clínico';
comment on column public.pacientes.severidade_visual is 'Semáforo clínico: red | yellow | green (sincronizado de gravidade por trigger)';
comment on column public.pacientes.patient_summary   is 'Patient Summary (SASI) — resumo persistente da admissão (dispositivos, HPMA, plano/metas)';

create table if not exists public.evolucoes (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null,
  user_id       uuid,
  data_evolucao timestamptz not null default now(),
  plantao       text not null default 'manha'
                  check (plantao = any (array['manha','tarde','noite','plantao_24h'])),
  neuro         jsonb not null default '{}'::jsonb,
  resp          jsonb not null default '{}'::jsonb,
  hemo          jsonb not null default '{}'::jsonb,
  tgi           jsonb not null default '{}'::jsonb,
  renal         jsonb not null default '{}'::jsonb,
  hemato        jsonb not null default '{}'::jsonb,
  infecto       jsonb not null default '{}'::jsonb,
  dvas          jsonb not null default '[]'::jsonb,
  sedativos     jsonb not null default '[]'::jsonb,
  impressao     text[] not null default '{}'::text[],
  conduta       text[] not null default '{}'::text[],
  sofa_snapshot jsonb,
  sofa_total    integer check (sofa_total between 0 and 24),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  prescricao    jsonb default '{}'::jsonb
);
comment on column public.evolucoes.prescricao is 'Kardex/prescricao vigente por categoria (cardiovascular, snc, gastro_endocrino, infeccioso_resp, sintomaticos_sn, solucoes_diureticos, nutricao); cada categoria = array de strings';

create table if not exists public.eventos_clinicos (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid not null,
  evolucao_id     uuid,
  user_id         uuid,
  ts              timestamptz not null,
  tipo            text not null check (tipo = any (array[
                    'sofa_total','sofa_resp','sofa_coag','sofa_liver','sofa_cardio','sofa_neuro','sofa_renal',
                    'pam','pam_min','pa_sys','pa_dia','pf_ratio','spo2','fr','fc','temp','lactato',
                    'ph','pco2','po2','hco3','be','diurese_h','bh_h','bh_acumulado',
                    'hb','ht','plaq','leuco','cr','ur','na','k','mg','ca','p','bb','inr','pcr','procalcitonina',
                    'nor_dose','adr_dose','vaso_dose','dobuta_dose','dopa_dose','fent_dose','midaz_dose',
                    'propofol_dose','precedex_dose','gcs','rass','cam_icu','bps','cpot','glicemia','custom'])),
  valor_num       numeric,
  valor_json      jsonb,
  unidade         text,
  fonte           text not null check (fonte = any (array[
                    'manual','gemini_ocr','claude_ocr','appsheet','auto_trigger','edge_function','api_import'])),
  confidence      numeric check (confidence between 0 and 1),
  source_text     text,
  requires_review boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.pendencias (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null,
  evolucao_id  uuid,
  user_id      uuid,
  tarefa       text not null check (char_length(tarefa) between 1 and 500),
  prioridade   smallint not null default 2 check (prioridade between 1 and 3),
  concluida    boolean not null default false,
  concluida_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.atbs (
  id               uuid primary key default gen_random_uuid(),
  paciente_id      uuid not null,
  user_id          uuid,
  droga            text not null,
  dose             text,
  via              text check (via = any (array['EV','VO','IM','SC','SNE','SNG','IT','Tópico'])),
  frequencia       text,
  data_inicio      date not null default current_date,
  data_fim         date,
  intencao         text check (intencao = any (array['empirica','dirigida','profilatica'])),
  foco             text,
  agente_alvo      text,
  motivo_suspensao text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.culturas (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null,
  user_id     uuid,
  material    text not null check (material = any (array[
                'hemocultura','urocultura','aspirado_traqueal','lavado_bal','lcr',
                'secrecao_ferida','liquido_peritoneal','liquido_pleural','outro'])),
  coleta_ts   timestamptz not null,
  laudo_ts    timestamptz,
  crescimento boolean not null default false,
  agente      text,
  ufc_por_ml  numeric,
  observacoes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.antibiograma (
  id          uuid primary key default gen_random_uuid(),
  cultura_id  uuid not null,
  antibiotico text not null,
  resultado   text not null check (resultado = any (array['S','I','R'])),
  cim         numeric,
  created_at  timestamptz not null default now()
);

create table if not exists public.alerts_log (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null,
  evento_id   uuid,
  user_id     uuid,
  tipo        text not null,
  severidade  text not null default 'warning'
                check (severidade = any (array['info','warning','critical'])),
  mensagem    text not null,
  payload     jsonb,
  hash_key    text not null,
  acked       boolean not null default false,
  acked_at    timestamptz,
  acked_by    uuid,
  created_at  timestamptz not null default now()
);

create table if not exists public.ingest_audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  paciente_id uuid,
  source_type text,
  fonte       text,
  payload_raw jsonb,
  response    jsonb,
  eventos_ids uuid[],
  warnings    text[],
  ok          boolean not null,
  error_msg   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
alter table public.pacientes        add constraint pacientes_user_id_fkey        foreign key (user_id)     references auth.users(id);
alter table public.evolucoes        add constraint evolucoes_paciente_id_fkey    foreign key (paciente_id) references public.pacientes(id) on delete cascade;
alter table public.evolucoes        add constraint evolucoes_user_id_fkey        foreign key (user_id)     references auth.users(id);
alter table public.eventos_clinicos add constraint eventos_clinicos_paciente_id_fkey foreign key (paciente_id) references public.pacientes(id) on delete cascade;
alter table public.eventos_clinicos add constraint eventos_clinicos_evolucao_id_fkey foreign key (evolucao_id) references public.evolucoes(id) on delete set null;
alter table public.eventos_clinicos add constraint eventos_clinicos_user_id_fkey foreign key (user_id)     references auth.users(id);
alter table public.pendencias       add constraint pendencias_paciente_id_fkey   foreign key (paciente_id) references public.pacientes(id) on delete cascade;
alter table public.pendencias       add constraint pendencias_evolucao_id_fkey   foreign key (evolucao_id) references public.evolucoes(id) on delete set null;
alter table public.pendencias       add constraint pendencias_user_id_fkey       foreign key (user_id)     references auth.users(id);
alter table public.atbs             add constraint atbs_paciente_id_fkey         foreign key (paciente_id) references public.pacientes(id) on delete cascade;
alter table public.atbs             add constraint atbs_user_id_fkey             foreign key (user_id)     references auth.users(id);
alter table public.culturas         add constraint culturas_paciente_id_fkey     foreign key (paciente_id) references public.pacientes(id) on delete cascade;
alter table public.culturas         add constraint culturas_user_id_fkey         foreign key (user_id)     references auth.users(id);
alter table public.antibiograma     add constraint antibiograma_cultura_id_fkey  foreign key (cultura_id)  references public.culturas(id) on delete cascade;
alter table public.alerts_log       add constraint alerts_log_paciente_id_fkey   foreign key (paciente_id) references public.pacientes(id) on delete cascade;
alter table public.alerts_log       add constraint alerts_log_evento_id_fkey     foreign key (evento_id)   references public.eventos_clinicos(id) on delete set null;
alter table public.alerts_log       add constraint alerts_log_user_id_fkey       foreign key (user_id)     references auth.users(id);
alter table public.alerts_log       add constraint alerts_log_acked_by_fkey      foreign key (acked_by)    references auth.users(id);
alter table public.ingest_audit_log add constraint ingest_audit_log_paciente_id_fkey foreign key (paciente_id) references public.pacientes(id) on delete set null;
alter table public.ingest_audit_log add constraint ingest_audit_log_user_id_fkey foreign key (user_id)     references auth.users(id);

-- ---------------------------------------------------------------------------
-- Índices (verbatim do catálogo; PKs/UNIQUEs implícitas omitidas)
-- ---------------------------------------------------------------------------
create index if not exists idx_alerts_pac_ack        on public.alerts_log using btree (paciente_id, acked, created_at desc);
create index if not exists idx_alerts_severidade     on public.alerts_log using btree (severidade, created_at desc) where (acked = false);
create unique index if not exists uq_alerts_hash      on public.alerts_log using btree (hash_key);
create index if not exists idx_antibiograma_cultura  on public.antibiograma using btree (cultura_id);
create unique index if not exists uq_antibiograma_cultura_atb on public.antibiograma using btree (cultura_id, antibiotico);
create index if not exists idx_atbs_droga            on public.atbs using btree (droga);
create index if not exists idx_atbs_pac_ativo        on public.atbs using btree (paciente_id, data_inicio desc) where (data_fim is null);
create index if not exists idx_culturas_agente       on public.culturas using btree (agente) where (agente is not null);
create index if not exists idx_culturas_pac_coleta   on public.culturas using btree (paciente_id, coleta_ts desc);
create index if not exists idx_eventos_evolucao      on public.eventos_clinicos using btree (evolucao_id) where (evolucao_id is not null);
create index if not exists idx_eventos_pac_tipo_ts   on public.eventos_clinicos using btree (paciente_id, tipo, ts desc);
create index if not exists idx_eventos_pac_ts        on public.eventos_clinicos using btree (paciente_id, ts desc);
create index if not exists idx_eventos_review        on public.eventos_clinicos using btree (requires_review, created_at desc) where (requires_review = true);
create index if not exists idx_eventos_tipo_ts       on public.eventos_clinicos using btree (tipo, ts desc);
create index if not exists idx_evolucoes_dvas_gin    on public.evolucoes using gin (dvas);
create index if not exists idx_evolucoes_infecto_gin on public.evolucoes using gin (infecto);
create index if not exists idx_evolucoes_paciente_data on public.evolucoes using btree (paciente_id, data_evolucao desc);
create index if not exists idx_evolucoes_user        on public.evolucoes using btree (user_id);
create index if not exists idx_ingest_audit_falhas   on public.ingest_audit_log using btree (created_at desc) where (ok = false);
create index if not exists idx_ingest_audit_pac      on public.ingest_audit_log using btree (paciente_id, created_at desc);
create index if not exists idx_pacientes_isolation   on public.pacientes using btree (isolation) where (isolation <> 'none');
create index if not exists idx_pacientes_nome_trgm   on public.pacientes using gin (nome gin_trgm_ops);
create index if not exists idx_pacientes_severidade  on public.pacientes using btree (severidade_visual);
create index if not exists idx_pacientes_status      on public.pacientes using btree (status_leito, updated_at desc);
create index if not exists idx_pacientes_user        on public.pacientes using btree (user_id);
create unique index if not exists uq_pacientes_leito_ativo on public.pacientes using btree (uti, leito) where (status_leito = 'ativo');
create index if not exists idx_pendencias_pac_aberta on public.pendencias using btree (paciente_id) where (concluida = false);
create index if not exists idx_pendencias_prioridade on public.pendencias using btree (prioridade, created_at) where (concluida = false);

-- NOTA (advisor performance): 9 FKs sem índice de cobertura — alerts_log(acked_by,
-- evento_id, user_id), atbs(user_id), culturas(user_id), eventos_clinicos(user_id),
-- ingest_audit_log(user_id), pendencias(evolucao_id, user_id). NÃO criados aqui para
-- manter o snapshot fiel à produção; recomendação de hardening no README.md.

-- ---------------------------------------------------------------------------
-- Funções (nível-app; funções C do pg_trgm vêm da extensão)
-- ---------------------------------------------------------------------------
create or replace function public.fn_updated_at()
returns trigger language plpgsql set search_path to 'public','pg_catalog' as $function$
begin new.updated_at = now(); return new; end;
$function$;

-- ATENÇÃO: search_path mutável (advisor security WARN). Mantido fiel à produção.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $function$
begin new.updated_at = now(); return new; end;
$function$;

create or replace function public.fn_invalidate_sofa_cache()
returns trigger language plpgsql set search_path to 'public','pg_catalog' as $function$
begin
  if (old.resp is distinct from new.resp) or (old.hemo is distinct from new.hemo) or
     (old.renal is distinct from new.renal) or (old.hemato is distinct from new.hemato) or
     (old.tgi is distinct from new.tgi) or (old.neuro is distinct from new.neuro) or
     (old.dvas is distinct from new.dvas) or (old.sedativos is distinct from new.sedativos) then
    new.sofa_snapshot = null; new.sofa_total = null;
  end if;
  return new;
end;
$function$;

-- ATENÇÃO: search_path mutável (advisor security WARN). Mantido fiel à produção.
create or replace function public.sync_severidade_visual()
returns trigger language plpgsql as $function$
begin
  if (new.gravidade is distinct from old.gravidade) and
     (new.severidade_visual is not distinct from old.severidade_visual) then
    new.severidade_visual := case new.gravidade
      when 'critico' then 'red' when 'grave' then 'red'
      when 'moderado' then 'yellow' else 'green' end;
  end if;
  return new;
end;
$function$;

create or replace function public.fn_alert_hash(p_paciente_id uuid, p_tipo text, p_payload jsonb)
returns text language plpgsql immutable set search_path to 'public','pg_catalog' as $function$
begin
  return encode(digest(p_paciente_id::text || '|' || p_tipo || '|' ||
    coalesce(p_payload::text,'') || '|' || to_char(now(),'YYYY-MM-DD'), 'sha256'), 'hex');
end;
$function$;

create or replace function public.rls_auto_enable()
returns event_trigger language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare cmd record;
begin
  for cmd in select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name = 'public' then
      begin execute format('alter table if exists %s enable row level security', cmd.object_identity);
      exception when others then raise log 'rls_auto_enable: failed on %', cmd.object_identity; end;
    end if;
  end loop;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_updated_at on public.atbs;
create trigger trg_updated_at before update on public.atbs for each row execute function fn_updated_at();
drop trigger if exists trg_updated_at on public.culturas;
create trigger trg_updated_at before update on public.culturas for each row execute function fn_updated_at();
drop trigger if exists trg_updated_at on public.evolucoes;
create trigger trg_updated_at before update on public.evolucoes for each row execute function fn_updated_at();
drop trigger if exists trg_sofa_cache_invalidate on public.evolucoes;
create trigger trg_sofa_cache_invalidate before update on public.evolucoes for each row execute function fn_invalidate_sofa_cache();
drop trigger if exists trg_updated_at on public.pacientes;
create trigger trg_updated_at before update on public.pacientes for each row execute function fn_updated_at();
drop trigger if exists set_pacientes_updated_at on public.pacientes;
create trigger set_pacientes_updated_at before update on public.pacientes for each row execute function set_updated_at();
drop trigger if exists trg_sync_severidade_visual on public.pacientes;
create trigger trg_sync_severidade_visual before update on public.pacientes for each row execute function sync_severidade_visual();

-- ---------------------------------------------------------------------------
-- RLS — habilitar + políticas
-- IMPORTANTE: políticas `dev_bypass USING (true)` refletem a produção COM AUTH
-- DESABILITADA (STATUS.md §2). As políticas `*_own` são as reais por usuário
-- (auth.uid()). O plano de convergência mantém o bypass (decisão do usuário:
-- "não voltar o auth"). Para hardening futuro ver README.md.
-- ---------------------------------------------------------------------------
alter table public.pacientes        enable row level security;
alter table public.evolucoes        enable row level security;
alter table public.eventos_clinicos enable row level security;
alter table public.pendencias       enable row level security;
alter table public.atbs             enable row level security;
alter table public.culturas         enable row level security;
alter table public.antibiograma     enable row level security;
alter table public.alerts_log       enable row level security;
alter table public.ingest_audit_log enable row level security;

-- Bypass de dev (auth desabilitada) — presente em todas as 11 tabelas/relacionadas
drop policy if exists dev_bypass on public.pacientes;        create policy dev_bypass on public.pacientes        for all using (true) with check (true);
drop policy if exists dev_bypass on public.evolucoes;        create policy dev_bypass on public.evolucoes        for all using (true) with check (true);
drop policy if exists dev_bypass on public.eventos_clinicos; create policy dev_bypass on public.eventos_clinicos for all using (true) with check (true);
drop policy if exists dev_bypass on public.pendencias;       create policy dev_bypass on public.pendencias       for all using (true) with check (true);
drop policy if exists dev_bypass on public.atbs;             create policy dev_bypass on public.atbs             for all using (true) with check (true);
drop policy if exists dev_bypass on public.culturas;         create policy dev_bypass on public.culturas         for all using (true) with check (true);
drop policy if exists dev_bypass on public.antibiograma;     create policy dev_bypass on public.antibiograma     for all using (true) with check (true);
drop policy if exists dev_bypass on public.alerts_log;       create policy dev_bypass on public.alerts_log       for all using (true) with check (true);
drop policy if exists dev_bypass on public.ingest_audit_log; create policy dev_bypass on public.ingest_audit_log for all using (true) with check (true);

-- Políticas reais por usuário (coexistem com dev_bypass; ativas quando auth voltar).
-- pacientes: por comando (auth.uid() = user_id)
drop policy if exists pacientes_select_own on public.pacientes;
create policy pacientes_select_own on public.pacientes for select using (auth.uid() = user_id);
drop policy if exists pacientes_insert_own on public.pacientes;
create policy pacientes_insert_own on public.pacientes for insert with check (auth.uid() = user_id);
drop policy if exists pacientes_update_own on public.pacientes;
create policy pacientes_update_own on public.pacientes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists pacientes_delete_own on public.pacientes;
create policy pacientes_delete_own on public.pacientes for delete using (auth.uid() = user_id);

-- filhos: dono via join no paciente
drop policy if exists evolucoes_all_own on public.evolucoes;
create policy evolucoes_all_own on public.evolucoes for all
  using (exists (select 1 from public.pacientes p where p.id = evolucoes.paciente_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pacientes p where p.id = evolucoes.paciente_id and p.user_id = auth.uid()));
drop policy if exists eventos_all_own on public.eventos_clinicos;
create policy eventos_all_own on public.eventos_clinicos for all
  using (exists (select 1 from public.pacientes p where p.id = eventos_clinicos.paciente_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pacientes p where p.id = eventos_clinicos.paciente_id and p.user_id = auth.uid()));
drop policy if exists pendencias_all_own on public.pendencias;
create policy pendencias_all_own on public.pendencias for all
  using (exists (select 1 from public.pacientes p where p.id = pendencias.paciente_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pacientes p where p.id = pendencias.paciente_id and p.user_id = auth.uid()));
drop policy if exists atbs_all_own on public.atbs;
create policy atbs_all_own on public.atbs for all
  using (exists (select 1 from public.pacientes p where p.id = atbs.paciente_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pacientes p where p.id = atbs.paciente_id and p.user_id = auth.uid()));
drop policy if exists culturas_all_own on public.culturas;
create policy culturas_all_own on public.culturas for all
  using (exists (select 1 from public.pacientes p where p.id = culturas.paciente_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pacientes p where p.id = culturas.paciente_id and p.user_id = auth.uid()));
drop policy if exists antibiograma_all_own on public.antibiograma;
create policy antibiograma_all_own on public.antibiograma for all
  using (exists (select 1 from public.culturas c join public.pacientes p on p.id = c.paciente_id where c.id = antibiograma.cultura_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.culturas c join public.pacientes p on p.id = c.paciente_id where c.id = antibiograma.cultura_id and p.user_id = auth.uid()));
drop policy if exists alerts_all_own on public.alerts_log;
create policy alerts_all_own on public.alerts_log for all
  using (exists (select 1 from public.pacientes p where p.id = alerts_log.paciente_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pacientes p where p.id = alerts_log.paciente_id and p.user_id = auth.uid()));
drop policy if exists ingest_audit_own on public.ingest_audit_log;
create policy ingest_audit_own on public.ingest_audit_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Views
-- vw_dashboard_uti está em produção como SECURITY DEFINER (advisor ERROR);
-- mantido fiel. As demais são security_invoker. Recomendação no README.md.
-- ---------------------------------------------------------------------------
create or replace view public.vw_dashboard_uti as
 with ultima_evol as (
   select distinct on (e.paciente_id) e.paciente_id, e.id as evolucao_id,
     e.data_evolucao as ultima_evolucao, e.sofa_total, e.sofa_snapshot, e.dvas, e.sedativos
   from evolucoes e order by e.paciente_id, e.data_evolucao desc
 ), sofa_24h_atras as (
   select distinct on (ec.paciente_id) ec.paciente_id, ec.valor_num as sofa_total_24h
   from eventos_clinicos ec
   where ec.tipo = 'sofa_total' and ec.ts <= (now() - interval '24:00:00')
   order by ec.paciente_id, ec.ts desc
 ), pend_abertas as (
   select pendencias.paciente_id, count(*)::integer as pendencias_abertas
   from pendencias where pendencias.concluida = false group by pendencias.paciente_id
 )
 select p.id as paciente_id, p.user_id, p.leito, p.uti, p.nome, p.idade, p.peso, p.hd,
   p.gravidade, p.status_leito, p.data_adm, current_date - p.data_adm as dias_internacao,
   u.evolucao_id, u.ultima_evolucao, u.sofa_total, u.sofa_snapshot, u.dvas, u.sedativos,
   (u.sofa_total::numeric - s24.sofa_total_24h)::integer as delta_sofa_24h,
   coalesce(pa.pendencias_abertas, 0) as pendencias_abertas,
   p.dispositivos, p.isolation, p.out_of_range_count, p.severidade_visual
 from pacientes p
   left join ultima_evol u on u.paciente_id = p.id
   left join sofa_24h_atras s24 on s24.paciente_id = p.id
   left join pend_abertas pa on pa.paciente_id = p.id
 where p.status_leito = 'ativo';

create or replace view public.vw_sofa_trend_72h as
 select paciente_id, ts, valor_num as sofa_total
 from eventos_clinicos ec
 where tipo = 'sofa_total' and ts >= (now() - interval '72:00:00')
 order by paciente_id, ts;

create or replace view public.vw_bh_acumulado as
 select paciente_id,
   sum(case when ts >= (now() - interval '24:00:00') then valor_num else 0 end) as bh_24h,
   sum(case when ts >= (now() - interval '48:00:00') then valor_num else 0 end) as bh_48h,
   sum(case when ts >= (now() - interval '72:00:00') then valor_num else 0 end) as bh_72h,
   count(*) filter (where ts >= (now() - interval '24:00:00')) as eventos_24h
 from eventos_clinicos ec where tipo = 'bh_h' group by paciente_id;

create or replace view public.vw_dias_atb_ativo as
 select paciente_id, id as atb_id, droga, via, frequencia, data_inicio, intencao, foco, agente_alvo,
   current_date - data_inicio + 1 as dias_terapia,
   case when (current_date - data_inicio + 1) >= 14 then 'critical'
        when (current_date - data_inicio + 1) >= 7  then 'warning'
        else 'ok' end as stewardship_flag
 from atbs a where data_fim is null;

create or replace view public.vw_alertas_abertos as
 select al.paciente_id, p.uti, p.leito, p.nome,
   count(*) filter (where al.severidade = 'critical') as criticos,
   count(*) filter (where al.severidade = 'warning')  as warnings,
   count(*) filter (where al.severidade = 'info')     as infos,
   count(*) as total
 from alerts_log al join pacientes p on p.id = al.paciente_id
 where al.acked = false
 group by al.paciente_id, p.uti, p.leito, p.nome;
