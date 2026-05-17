-- MULT-CHAT-HUB — Schema inicial
-- Execute no SQL Editor do Supabase ou via supabase db push

-- ── Conversas ─────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  agent_name  text not null default 'Agente Geral',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Mensagens ─────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system')),
  content          text not null,
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

-- ── Agentes ───────────────────────────────────────────────────────────────────
create table if not exists public.agents (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text not null default '',
  provider       text not null default 'Interno',
  system_prompt  text,
  created_at     timestamptz not null default now()
);

-- ── Trigger: updated_at automático ───────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
-- Desabilitado inicialmente; habilite quando adicionar Auth.js
alter table public.conversations disable row level security;
alter table public.messages disable row level security;
alter table public.agents disable row level security;
