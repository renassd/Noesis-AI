-- ============================================================
-- Neuvra Billing Schema
-- Provider-agnostic. Works with Paddle today, Stripe tomorrow.
-- ============================================================

-- ── Plans (static config, seeded once) ─────────────────────
create table if not exists plans (
  id           text primary key,           -- 'free' | 'pro' | 'enterprise'
  name         text not null,
  price_monthly numeric(10,2),
  price_yearly  numeric(10,2),
  monthly_ai_credits integer not null default 0,
  features     jsonb not null default '[]'::jsonb,
  -- Provider price IDs — only field that changes on migration
  paddle_monthly_price_id text,
  paddle_yearly_price_id  text,
  stripe_monthly_price_id text,             -- filled in month 5
  stripe_yearly_price_id  text,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);

-- Seed plans
insert into plans (id, name, price_monthly, price_yearly, monthly_ai_credits, features) values
  ('free',       'Free',       0,     0,     50,  '["ai_tutor","flashcards_basic","research"]'),
  ('pro',        'Pro',        12,    99,    500, '["ai_tutor","flashcards_unlimited","research","papers","smart_notes","memory_engine"]'),
  ('enterprise', 'Enterprise', 49,    399,   9999,'["ai_tutor","flashcards_unlimited","research","papers","smart_notes","memory_engine","api_access","team_features"]')
on conflict (id) do nothing;

-- ── Subscriptions (one row per user, always) ────────────────
create table if not exists subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  plan_id               text references plans(id) not null default 'free',

  -- Provider-agnostic state ─────────────────────────────────
  -- active | trialing | canceled | past_due | paused | inactive
  status                text not null default 'inactive',
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  trial_ends_at         timestamptz,

  -- Provider binding (swapped during migration) ─────────────
  provider              text,              -- 'paddle' | 'stripe'
  provider_subscription_id text,           -- their sub ID
  provider_customer_id  text,              -- their customer ID
  provider_metadata     jsonb,             -- raw last event from provider

  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  unique (user_id)
);

-- Every user gets a free subscription row at sign-up
create or replace function create_free_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_billing on auth.users;
create trigger on_auth_user_created_billing
  after insert on auth.users
  for each row execute function create_free_subscription();

-- ── Subscription events (append-only audit log) ─────────────
-- Webhooks write here first. Business logic reads from here.
create table if not exists subscription_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id),
  subscription_id uuid references subscriptions(id),

  -- Normalized internal event type
  event_type      text not null,
  -- 'subscription.activated' | 'subscription.updated'
  -- 'subscription.canceled'  | 'subscription.past_due'
  -- 'subscription.paused'    | 'subscription.resumed'
  -- 'payment.succeeded'      | 'payment.failed'

  plan_id         text,                    -- plan at time of event
  provider        text not null,           -- 'paddle' | 'stripe'
  provider_event_id text,                  -- used for idempotency

  raw_payload     jsonb not null,          -- full provider event
  processed_at    timestamptz default now(),
  processing_error text,                   -- null = success

  unique (provider, provider_event_id)     -- idempotency guard
);

-- ── Indexes ─────────────────────────────────────────────────
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
create index if not exists subscriptions_provider_sub_idx on subscriptions(provider_subscription_id);
create index if not exists subscriptions_provider_customer_idx on subscriptions(provider_customer_id);
create index if not exists events_user_id_idx on subscription_events(user_id);
create index if not exists events_sub_id_idx on subscription_events(subscription_id);

-- ── RLS ─────────────────────────────────────────────────────
alter table subscriptions enable row level security;
alter table subscription_events enable row level security;
alter table plans enable row level security;

-- Users can read their own subscription
create policy "users read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Plans are publicly readable
create policy "plans are public"
  on plans for select
  using (true);

-- Service role bypasses RLS for webhook processing
-- (handled via service role key in server routes)

-- ── updated_at trigger ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();
