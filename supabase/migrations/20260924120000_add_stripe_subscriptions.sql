-- Stripe subscriptions bought on the web.
--
-- Deliberately a separate table from `public.subscriptions` rather than a
-- `source` column on it: that table is keyed by `user_id` (primary key), so an
-- Apple row and a Stripe row for the same person would collide. Keeping them
-- apart also means the entire Apple path -- three edge functions and the
-- shipped iOS app -- stays untouched by this feature.
--
-- `status` mirrors Stripe's own vocabulary verbatim ('active', 'trialing',
-- 'past_due', 'canceled', ...) rather than being normalised to the Apple
-- wording. Translating here would mean guessing at states Apple has no
-- equivalent for, and the webhook is the only writer either way.
create table public.subscriptions_stripe (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text not null,
  stripe_subscription_id text not null unique,
  price_id               text not null,
  plan                   text not null check (plan in ('monthly', 'annual', 'family')),
  status                 text not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  trial_end              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- The webhook resolves a user by customer id when subscription metadata is
-- missing (older sessions, or events that carry no metadata).
create index subscriptions_stripe_customer_id_idx
  on public.subscriptions_stripe (stripe_customer_id);

alter table public.subscriptions_stripe enable row level security;

create policy "Users can read their own stripe subscription"
  on public.subscriptions_stripe
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Mirrors the equivalent policy on `public.subscriptions`: a family member has
-- to be able to see that their plan owner is still paying, or their own
-- entitlement check cannot resolve.
create policy "Users can read the stripe subscription of their family owner"
  on public.subscriptions_stripe
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.subscriptions_family sf
      where sf.user_id = (select auth.uid())
        and sf.subscribed_user_id = subscriptions_stripe.user_id
    )
  );

-- No insert/update/delete policy, matching `public.subscriptions`: the only
-- writer is the `stripe-webhook` edge function, which uses the service role and
-- bypasses RLS. A client must never be able to grant itself a subscription.
