create table if not exists public.emails_lideranca (
  email text primary key,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id)
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and status = 'aprovado'
      and lower(email) = 'suelencpalmeira@gmail.com'
  );
$$;

create or replace function private.is_lideranca()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and status = 'aprovado'
      and (
        perfil = 'lideranca'
        or lower(email) = 'suelencpalmeira@gmail.com'
      )
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_email text;
  v_perfil text;
  v_status text;
begin
  v_email := lower(trim(new.email));
  v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'nome', '')), '');
  if v_nome is null then
    v_nome := split_part(v_email, '@', 1);
  end if;

  if v_email = 'suelencpalmeira@gmail.com' then
    v_perfil := 'lideranca';
    v_status := 'aprovado';
  elsif exists (select 1 from public.emails_lideranca where email = v_email) then
    v_perfil := 'lideranca';
    v_status := 'aprovado';
  else
    v_perfil := 'consultor';
    v_status := 'pendente';
  end if;

  insert into public.usuarios (id, nome, email, perfil, status)
  values (new.id, v_nome, v_email, v_perfil, v_status)
  on conflict (id) do update
    set nome = excluded.nome,
        email = excluded.email,
        perfil = excluded.perfil,
        status = excluded.status;

  return new;
end;
$$;

create or replace function private.normalize_lider_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  if new.email is null or strpos(new.email, '@') < 2 or strpos(new.email, '.') = 0 then
    raise exception 'Informe um e-mail válido.';
  end if;
  if new.criado_por is null then
    new.criado_por := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_lider_email on public.emails_lideranca;
create trigger trg_normalize_lider_email
before insert or update on public.emails_lideranca
for each row execute function private.normalize_lider_email();

create or replace function private.sync_lider_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    update public.usuarios
      set perfil = 'lideranca',
          status = 'aprovado'
    where lower(email) = new.email;
    return new;
  end if;

  if lower(old.email) = 'suelencpalmeira@gmail.com' then
    raise exception 'A administradora não pode ser removida da liderança.';
  end if;

  update public.usuarios
    set perfil = 'consultor'
  where lower(email) = lower(old.email)
    and perfil = 'lideranca';
  return old;
end;
$$;

drop trigger if exists trg_sync_lider_email on public.emails_lideranca;
create trigger trg_sync_lider_email
after insert or update or delete on public.emails_lideranca
for each row execute function private.sync_lider_email();

create or replace function private.protect_admin_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if lower(old.email) = 'suelencpalmeira@gmail.com' then
      raise exception 'A administradora não pode ser excluída.';
    end if;
    return old;
  end if;

  if lower(old.email) = 'suelencpalmeira@gmail.com' then
    new.email := old.email;
    new.perfil := 'lideranca';
    new.status := 'aprovado';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_admin_usuario on public.usuarios;
create trigger trg_protect_admin_usuario
before update or delete on public.usuarios
for each row execute function private.protect_admin_usuario();

alter table public.emails_lideranca enable row level security;

drop policy if exists emails_lideranca_admin_all on public.emails_lideranca;
create policy emails_lideranca_admin_all
on public.emails_lideranca
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

grant select, insert, update, delete on public.emails_lideranca to authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

insert into public.emails_lideranca (email)
values ('suelencpalmeira@gmail.com')
on conflict (email) do nothing;

update public.usuarios
  set perfil = 'lideranca',
      status = 'aprovado'
where lower(email) = 'suelencpalmeira@gmail.com';
