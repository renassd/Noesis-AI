-- MIGRATION: user plans + AI usage limits
-- Run in Supabase SQL Editor

create table if not exists ai_user_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  credits_used integer not null default 0,
  last_reset_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists ai_request_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro')),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  credits_used integer not null default 0,
  request_chars integer not null default 0,
  max_tokens integer not null default 0,
  model text,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists idx_ai_request_events_user_created_at
  on ai_request_events(user_id, created_at desc);

create index if not exists idx_ai_request_events_user_status_created_at
  on ai_request_events(user_id, status, created_at desc);

alter table ai_user_usage enable row level security;
alter table ai_request_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_user_usage'
      and policyname = 'users can view own ai usage'
  ) then
    create policy "users can view own ai usage"
      on ai_user_usage
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_request_events'
      and policyname = 'users can view own ai request events'
  ) then
    create policy "users can view own ai request events"
      on ai_request_events
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

insert into ai_user_usage (user_id)
select id
from auth.users
on conflict (user_id) do nothing;
