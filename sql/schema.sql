-- FSY 2027 — Gestão de Participantes
-- Este script já foi aplicado no projeto pukresrhryarypzzmdch.
-- Use apenas se for recriar o banco em outro projeto.

create schema if not exists private;

create table if not exists public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text unique not null,
  perfil text not null check (perfil in ('lideranca', 'consultor')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'bloqueado')),
  criado_em timestamptz not null default now()
);

create table if not exists public.participantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ala text not null,
  estaca text not null,
  contato_lider text not null,
  contato_responsavel text not null,
  consultor text not null,
  companhia integer not null,
  quarto text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
