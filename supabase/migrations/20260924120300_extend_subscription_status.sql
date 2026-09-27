-- Teach the existing status RPC about Stripe, and add a richer one for the web.

-- `"Subscriptions_GetStatus"` keeps its exact name, argument and
-- `returns table(status text, product_id text)` shape, because the shipped iOS
-- app calls it and decodes those two columns. Adding, renaming or reordering a
-- column here would break a binary that is already in people's hands.
--
-- What changes is only the resolution order inside: two Stripe branches are
-- appended after the two Apple ones. A web purchase reports back as the
-- equivalent `com.kitch.*` product id, so iOS recognises a subscription bought
-- on the web with no app update at all.
--
-- The zero-rows-means-not-entitled convention is preserved exactly.
create or replace function public."Subscriptions_GetStatus"(p_user_id uuid)
returns table (status text, product_id text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_product_id text;
begin
  -- Apple, in their own name.
  select s.status, s.product_id
  into v_status, v_product_id
  from public.subscriptions s
  where s.user_id = p_user_id;

  -- Apple, as a member of someone else's family plan.
  if v_status is null or v_status != 'active' then
    select subs.status, ''
    into v_status, v_product_id
    from public.subscriptions subs
    join public.subscriptions_family fam
      on fam.subscribed_user_id = subs.user_id
     and subs.product_id = 'com.kitch.family'
    where fam.user_id = p_user_id
      and subs.status = 'active';
  end if;

  -- Stripe, in their own name. Normalised to 'active' and to the matching
  -- Apple product id: iOS has no vocabulary for 'trialing' or for a Stripe
  -- price, and a trial is full access.
  if v_status is null or v_status != 'active' then
    select
      'active',
      case ss.plan
        when 'monthly' then 'com.kitch.monthly'
        when 'annual'  then 'com.kitch.annual'
        when 'family'  then 'com.kitch.family'
      end
    into v_status, v_product_id
    from public.subscriptions_stripe ss
    where ss.user_id = p_user_id
      and ss.status in ('active', 'trialing');
  end if;

  -- Stripe, as a member of someone else's family plan. Returns '' for the
  -- product id, matching what the Apple family branch above does.
  if v_status is null or v_status != 'active' then
    select 'active', ''
    into v_status, v_product_id
    from public.subscriptions_stripe ss
    join public.subscriptions_family fam
      on fam.subscribed_user_id = ss.user_id
     and ss.plan = 'family'
    where fam.user_id = p_user_id
      and ss.status in ('active', 'trialing');
  end if;

  if v_status is null or v_status != 'active' then
    -- return no rows
    return query
    select null::text as status, null::text as product_id
    where false;
  else
    return query select v_status as status, v_product_id as product_id;
  end if;
end;
$$;

-- The web's own view of entitlement.
--
-- Separate from the RPC above rather than an extension of it, for two reasons:
-- that one's shape is frozen by the iOS app, and the web needs things iOS never
-- asks for (which billing source to send someone to, whether a cancellation is
-- already scheduled, how many family seats are taken).
--
-- Unlike the iOS RPC, this always returns exactly one row -- `is_premium` false
-- for a free user -- so callers never have to distinguish "no subscription"
-- from "the query failed".
create or replace function public.entitlement_get_status()
returns table (
  is_premium           boolean,
  source               text,
  plan                 text,
  status               text,
  renews_at            timestamptz,
  cancel_at_period_end boolean,
  trial_end            timestamptz,
  has_stripe_billing   boolean,
  is_family_owner      boolean,
  family_seats_used    integer,
  family_owner_name    text
)
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_apple   public.subscriptions%rowtype;
  v_stripe  public.subscriptions_stripe%rowtype;
  v_owner_name text;
  v_owner_is_family boolean := false;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_apple
  from public.subscriptions s
  where s.user_id = v_user_id;

  select * into v_stripe
  from public.subscriptions_stripe ss
  where ss.user_id = v_user_id;

  -- A Stripe customer record outlives any one subscription, so the billing
  -- portal stays reachable after a cancellation -- and remains reachable for
  -- the rare account that somehow holds both an Apple and a Stripe
  -- subscription, which would otherwise resolve as Apple and hide the only
  -- control that can stop the web charge.
  has_stripe_billing := v_stripe.stripe_customer_id is not null;

  family_seats_used := (
    select count(*)
    from public.subscriptions_family f
    where f.subscribed_user_id = v_user_id
  );

  -- coalesce because a missing row makes every comparison null, and these are
  -- non-nullable booleans as far as the callers are concerned.
  is_family_owner := coalesce(
    (v_apple.status = 'active' and v_apple.product_id = 'com.kitch.family')
    or (v_stripe.plan = 'family' and v_stripe.status in ('active', 'trialing')),
    false
  );

  -- Apple first, matching the precedence in "Subscriptions_GetStatus" so the
  -- two surfaces never disagree about which plan someone is on.
  if v_apple.status = 'active' then
    is_premium := true;
    source     := 'apple';
    plan       := case v_apple.product_id
                    when 'com.kitch.monthly' then 'monthly'
                    when 'com.kitch.annual'  then 'annual'
                    when 'com.kitch.family'  then 'family'
                  end;
    status     := v_apple.status;
    renews_at  := v_apple.expiration_date;
    -- Apple does not tell us through this table whether auto-renew is off.
    cancel_at_period_end := false;
    trial_end  := null;
    return next;
    return;
  end if;

  if v_stripe.status in ('active', 'trialing') then
    is_premium := true;
    source     := 'stripe';
    plan       := v_stripe.plan;
    status     := v_stripe.status;
    renews_at  := v_stripe.current_period_end;
    cancel_at_period_end := v_stripe.cancel_at_period_end;
    trial_end  := v_stripe.trial_end;
    return next;
    return;
  end if;

  -- A seat on someone else's plan, from either source. The owner's name comes
  -- from `public.users`, which every authenticated user may read.
  select u.display_name,
         (
           (s.status = 'active' and s.product_id = 'com.kitch.family')
           or (ss.plan = 'family' and ss.status in ('active', 'trialing'))
         )
  into v_owner_name, v_owner_is_family
  from public.subscriptions_family f
  join public.users u on u.id = f.subscribed_user_id
  left join public.subscriptions s on s.user_id = f.subscribed_user_id
  left join public.subscriptions_stripe ss on ss.user_id = f.subscribed_user_id
  where f.user_id = v_user_id
  -- `desc` alone is nulls-first in Postgres, which would rank an owner with no
  -- subscription row above one who actually has an active family plan.
  order by 2 desc nulls last
  limit 1;

  if coalesce(v_owner_is_family, false) then
    is_premium        := true;
    source            := 'family';
    plan              := 'family';
    status            := 'active';
    renews_at         := null;
    cancel_at_period_end := false;
    trial_end         := null;
    family_owner_name := v_owner_name;
    return next;
    return;
  end if;

  -- Free.
  is_premium := false;
  source     := null;
  plan       := null;
  status     := null;
  renews_at  := null;
  cancel_at_period_end := false;
  trial_end  := null;
  return next;
end;
$$;

revoke all on function public.entitlement_get_status() from public, anon;
grant execute on function public.entitlement_get_status() to authenticated;
