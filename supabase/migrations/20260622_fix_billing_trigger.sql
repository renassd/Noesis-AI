-- ============================================================
-- Fix: "Database error saving new user" on signup
--
-- Root cause: create_free_subscription() (fired by
-- on_auth_user_created_billing after insert on auth.users) has no
-- error handling. If the insert into `subscriptions` fails for any
-- reason -- most likely a missing 'free' row in `plans`, causing a
-- foreign-key violation on subscriptions.plan_id -- Postgres aborts
-- the entire auth.users insert, and the user can never sign up.
--
-- Fix: re-assert the plans seed (in case it's missing/was rolled
-- back), and make the trigger function defensive so a billing-table
-- problem never blocks account creation again.
-- ============================================================

-- Re-assert the plans seed in case it's missing on the live DB
insert into plans (id, name, price_monthly, price_yearly, monthly_ai_credits, features,
                   paddle_monthly_price_id, paddle_yearly_price_id) values
  ('free', 'Free', 0,  0,   50,  '["ai_tutor","flashcards_basic","research","pdf_upload"]',
   null, null),
  ('pro',  'Pro',  12, 99,  500, '["ai_tutor","flashcards_unlimited","research","papers","smart_notes","memory_engine","pdf_upload"]',
   'pri_01krfkm5qkwn2dw8y2t46v17w0', 'pri_01krfkn4w8cepy4s249zggc7rp')
on conflict (id) do nothing;

-- Harden the trigger function: never let a billing-row failure
-- block auth.users insertion (account creation must always succeed).
create or replace function create_free_subscription()
returns trigger language plpgsql security definer as $$
begin
  begin
    insert into subscriptions (user_id, plan_id, status)
    values (new.id, 'free', 'active')
    on conflict (user_id) do nothing;
  exception when others then
    -- Log and swallow: a billing hiccup must never block signup.
    raise warning 'create_free_subscription failed for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
