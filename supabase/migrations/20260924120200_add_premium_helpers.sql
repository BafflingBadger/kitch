-- Entitlement and import-quota helpers shared by the web app and the
-- `import-recipe` edge function.
--
-- All three are named in lowercase snake_case, matching the convention the
-- recent migrations use (`current_user_has_password`, `delete_own_account`,
-- `assert_recent_auth`). The older mixed-case, quoted names -- and in
-- particular `"Subscriptions_GetStatus"` -- are left alone because the shipped
-- iOS app calls them by those exact names.

-- Is the caller entitled to Premium, from any source?
--
-- Security invoker, not definer, and deliberately argument-less. The existing
-- `"Subscriptions_GetStatus"` takes a user id and is safe only because RLS
-- silently returns nothing for anyone else's row; taking no argument at all
-- removes that footgun entirely. The family branches work because both
-- subscription tables carry a policy letting a family member read their plan
-- owner's row.
--
-- Trusts `status` without re-checking expiry dates, exactly as the existing
-- status RPC does. Both webhooks keep `status` current, and second-guessing it
-- here would mean locking out a paying user whose row is merely stale.
create or replace function public.has_active_premium()
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select
    -- Bought on iOS, in their own name.
    exists (
      select 1
      from public.subscriptions s
      where s.user_id = (select auth.uid())
        and s.status = 'active'
    )
    -- Bought on the web. Stripe reports a trialling subscription as its own
    -- status rather than as active, and a trial is full access.
    or exists (
      select 1
      from public.subscriptions_stripe ss
      where ss.user_id = (select auth.uid())
        and ss.status in ('active', 'trialing')
    )
    -- A seat on someone else's family plan, bought on iOS.
    or exists (
      select 1
      from public.subscriptions_family f
      join public.subscriptions s on s.user_id = f.subscribed_user_id
      where f.user_id = (select auth.uid())
        and s.status = 'active'
        and s.product_id = 'com.kitch.family'
    )
    -- ... or bought on the web.
    or exists (
      select 1
      from public.subscriptions_family f
      join public.subscriptions_stripe ss on ss.user_id = f.subscribed_user_id
      where f.user_id = (select auth.uid())
        and ss.plan = 'family'
        and ss.status in ('active', 'trialing')
    );
$$;

revoke all on function public.has_active_premium() from public, anon;
grant execute on function public.has_active_premium() to authenticated;

-- How many imports the caller has spent, and whether the cap applies to them.
--
-- `import_limit` is returned rather than hard-coded in the clients so that the
-- free allowance has one authoritative home. Premium callers get
-- `is_premium => true` and should ignore the other two columns.
create or replace function public.imports_get_usage()
returns table (is_premium boolean, used integer, import_limit integer)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    public.has_active_premium(),
    coalesce(
      (
        select iu.import_count
        from public.import_usage iu
        where iu.user_id = (select auth.uid())
      ),
      0
    ),
    10;
$$;

revoke all on function public.imports_get_usage() from public, anon;
grant execute on function public.imports_get_usage() to authenticated;

-- Spend one import. Returns the new lifetime total.
--
-- Definer because `public.import_usage` has no write policy by design. Called
-- by the `import-recipe` edge function *after* the recipe has been written, so
-- an import that fails part-way through never costs the user a slot.
create or replace function public.imports_record()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count   integer;
begin
  -- A definer function has no RLS to fall back on, so the identity check has
  -- to be explicit: without it, an unauthenticated caller would write a row
  -- keyed by null.
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.import_usage as iu (user_id, import_count, updated_at)
  values (v_user_id, 1, now())
  on conflict (user_id) do update
    set import_count = iu.import_count + 1,
        updated_at   = now()
  returning iu.import_count into v_count;

  return v_count;
end;
$$;

revoke all on function public.imports_record() from public, anon;
grant execute on function public.imports_record() to authenticated;
