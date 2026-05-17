-- ============================================================================
-- SASI · Onda 5 — Dispositivos, Isolamento, Severidade visual
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Reverter: ver seção "ROLLBACK" ao final
-- ============================================================================

-- 1. Adicionar colunas à tabela pacientes
alter table public.pacientes
  add column if not exists dispositivos jsonb not null default '{}'::jsonb,
  add column if not exists isolation text not null default 'none'
    check (isolation in ('none','contact','droplet','aerosol')),
  add column if not exists out_of_range_count int not null default 0,
  add column if not exists severidade_visual text not null default 'green'
    check (severidade_visual in ('red','yellow','green'));

-- 2. Comentários das colunas
comment on column public.pacientes.dispositivos is
  'Dispositivos em uso: {mv, dva, sed, atb, cvc, trr} — booleans';
comment on column public.pacientes.isolation is
  'Precaução de isolamento: none | contact | droplet | aerosol';
comment on column public.pacientes.out_of_range_count is
  'Nº de parâmetros fora do range clínico (atualizado por trigger ou edge function)';
comment on column public.pacientes.severidade_visual is
  'Semáforo clínico: red (grave/crítico) | yellow (atenção) | green (estável)';

-- 3. Atualizar severidade_visual baseado em gravidade existente (migração de dados)
update public.pacientes set severidade_visual =
  case gravidade
    when 'critico'  then 'red'
    when 'grave'    then 'red'
    when 'moderado' then 'yellow'
    else                 'green'
  end
where status_leito = 'ativo';

-- 4. Trigger pra manter severidade_visual em sync com gravidade quando não
--    atualizado manualmente. Mantém consistência sem bloquear override manual.
create or replace function public.sync_severidade_visual()
returns trigger language plpgsql as $$
begin
  -- Só faz sync automático se severidade_visual não foi explicitamente alterado
  -- pelo caller neste mesmo update. Se caller alterou gravidade e não alterou
  -- severidade_visual, sincroniza.
  if (NEW.gravidade is distinct from OLD.gravidade) and
     (NEW.severidade_visual is not distinct from OLD.severidade_visual) then
    NEW.severidade_visual := case NEW.gravidade
      when 'critico'  then 'red'::text
      when 'grave'    then 'red'::text
      when 'moderado' then 'yellow'::text
      else                 'green'::text
    end;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_severidade_visual on public.pacientes;
create trigger trg_sync_severidade_visual
  before update on public.pacientes
  for each row execute function public.sync_severidade_visual();

-- 5. Refazer view vw_dashboard_uti incluindo novos campos
--    ATENÇÃO: substitua a definição abaixo pela sua view atual se ela for diferente.
--    O bloco abaixo usa CREATE OR REPLACE mantendo as colunas existentes.
--    Se a view usa WITH CHECK OPTION ou security invoker, ajuste conforme necessário.

-- Descomentar e adaptar à definição real da view:
-- create or replace view public.vw_dashboard_uti as
-- select
--   p.id              as paciente_id,
--   p.user_id,
--   p.leito,
--   p.uti,
--   p.nome,
--   p.idade,
--   p.peso,
--   p.hd,
--   p.gravidade,
--   p.status_leito,
--   p.data_adm,
--   date_part('day', now() - p.data_adm::timestamptz)::int as dias_internacao,
--   e.id              as evolucao_id,
--   e.updated_at      as ultima_evolucao,
--   e.sofa_total,
--   e.sofa_snapshot,
--   e.dvas,
--   e.sedativos,
--   (
--     select ev2.valor_num - ev1.valor_num
--     from eventos_clinicos ev1, eventos_clinicos ev2
--     where ev1.paciente_id = p.id and ev2.paciente_id = p.id
--       and ev1.tipo = 'sofa' and ev2.tipo = 'sofa'
--     order by ev1.ts asc, ev2.ts desc
--     limit 1
--   )                 as delta_sofa_24h,
--   (
--     select count(*) from pendencias
--     where paciente_id = p.id and concluida = false
--   )::int            as pendencias_abertas,
--   -- NOVOS CAMPOS ONDA 5:
--   p.dispositivos,
--   p.isolation,
--   p.out_of_range_count,
--   p.severidade_visual
-- from pacientes p
-- left join lateral (
--   select * from evolucoes
--   where paciente_id = p.id
--   order by created_at desc
--   limit 1
-- ) e on true
-- where p.status_leito = 'ativo'
-- order by p.leito;

-- 6. Índices de suporte
create index if not exists idx_pacientes_isolation
  on public.pacientes(isolation) where isolation <> 'none';

create index if not exists idx_pacientes_severidade
  on public.pacientes(severidade_visual);

-- ============================================================================
-- ROLLBACK (executar em caso de reversão):
-- ============================================================================
-- drop trigger if exists trg_sync_severidade_visual on public.pacientes;
-- drop function if exists public.sync_severidade_visual();
-- alter table public.pacientes
--   drop column if exists dispositivos,
--   drop column if exists isolation,
--   drop column if exists out_of_range_count,
--   drop column if exists severidade_visual;
-- ============================================================================
