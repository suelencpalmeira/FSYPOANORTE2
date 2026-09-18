-- FSY 2027 — campos da ficha de inscrição, dados sensíveis (LGPD) e auditoria.

alter table public.participantes
  alter column companhia drop not null;

alter table public.participantes
  add column if not exists sobrenome text,
  add column if not exists nome_preferencia text,
  add column if not exists data_nascimento date,
  add column if not exists sexo text,
  add column if not exists telefone text,
  add column if not exists email text,
  add column if not exists tamanho_camiseta text,
  add column if not exists alimentacao text,
  add column if not exists contato1_nome text,
  add column if not exists contato1_email text,
  add column if not exists contato1_telefone text,
  add column if not exists contato2_nome text,
  add column if not exists contato2_email text,
  add column if not exists contato2_telefone text,
  add column if not exists idade integer,
  add column if not exists submetido_em timestamptz,
  add column if not exists situacao text not null default 'pendente',
  add column if not exists tipo text not null default 'participante',
  add column if not exists bispo_email text,
  add column if not exists bispo_nome text,
  add column if not exists apresentacao text,
  add column if not exists membro_igreja boolean,
  add column if not exists alerta_saude boolean not null default false,
  add column if not exists menor_idade boolean not null default false;

alter table public.participantes drop constraint if exists participantes_situacao_check;
alter table public.participantes
  add constraint participantes_situacao_check
  check (situacao in ('pendente', 'aprovado'));

alter table public.participantes drop constraint if exists participantes_tipo_check;
alter table public.participantes
  add constraint participantes_tipo_check
  check (tipo in ('participante', 'consultor'));

create unique index if not exists idx_participantes_email_unico
  on public.participantes (lower(email))
  where email is not null and length(trim(email)) > 0;

create index if not exists idx_participantes_tipo on public.participantes (tipo);
create index if not exists idx_participantes_situacao on public.participantes (situacao);
create index if not exists idx_participantes_idade on public.participantes (idade);

create table if not exists public.participantes_sensiveis (
  participante_id uuid primary key references public.participantes (id) on delete cascade,
  documento text,
  orgao_emissor text,
  cpf text,
  cpf_valido boolean,
  nome_responsavel text,
  telefone_responsavel text,
  autorizacao_pais boolean,
  info_medicas text,
  condicoes_saude text,
  detalhe_saude text,
  atualizado_em timestamptz not null default now()
);

create unique index if not exists idx_participantes_cpf_unico
  on public.participantes_sensiveis (cpf)
  where cpf is not null and length(cpf) = 11;

create table if not exists public.auditoria_acesso (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users (id) on delete set null,
  usuario_email text,
  acao text not null,
  participante_id uuid references public.participantes (id) on delete set null,
  detalhes text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_auditoria_acesso_criado_em on public.auditoria_acesso (criado_em desc);

create or replace function private.touch_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_participantes_touch on public.participantes;
create trigger trg_participantes_touch
before update on public.participantes
for each row execute function private.touch_atualizado_em();

drop trigger if exists trg_sensiveis_touch on public.participantes_sensiveis;
create trigger trg_sensiveis_touch
before update on public.participantes_sensiveis
for each row execute function private.touch_atualizado_em();

alter table public.participantes_sensiveis enable row level security;
alter table public.auditoria_acesso enable row level security;

drop policy if exists sensiveis_lideranca_all on public.participantes_sensiveis;
create policy sensiveis_lideranca_all
on public.participantes_sensiveis
for all
to authenticated
using (private.is_lideranca())
with check (private.is_lideranca());

drop policy if exists auditoria_insert_aprovado on public.auditoria_acesso;
create policy auditoria_insert_aprovado
on public.auditoria_acesso
for insert
to authenticated
with check (private.is_aprovado());

drop policy if exists auditoria_select_lideranca on public.auditoria_acesso;
create policy auditoria_select_lideranca
on public.auditoria_acesso
for select
to authenticated
using (private.is_lideranca());

grant select, insert, update, delete on public.participantes_sensiveis to authenticated;
grant select, insert on public.auditoria_acesso to authenticated;
revoke update, delete on public.auditoria_acesso from authenticated;
revoke all on public.participantes_sensiveis from anon;
revoke all on public.auditoria_acesso from anon;
