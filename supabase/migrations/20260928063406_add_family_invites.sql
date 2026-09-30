-- Family plan invites, member listing, and hardening of the legacy iOS family
-- RPCs.
--
-- A family is `subscriptions_family` rows pointing at one owner
-- (`subscribed_user_id`). The primary key on `user_id` already means a user
-- can be in at most one family. The Family plan is 5 accounts including the
-- owner, so at most 4 rows per owner.
--
-- Joining on the web goes through a single-use invite: the owner mints one,
-- shares the link, and the invitee accepts or declines. Either answer spends
-- it; an unanswered invite lapses after 7 days.

create table public.family_invites (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.users (id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  responded_by uuid references public.users (id) on delete set null,
  responded_at timestamptz
);

create index family_invites_owner_id_idx on public.family_invites (owner_id);
create index family_invites_responded_by_idx on public.family_invites (responded_by);

-- No policies, on purpose: every read and write goes through the definer
-- functions below, which is what makes "single use" enforceable.
alter table public.family_invites enable row level security;

-- Does this user currently own an active Family plan, from either storefront?
--
-- Only ever called from the definer functions below, which run as the table
-- owner and so see every subscription row. Nobody else may execute it: as an
-- invoker function called directly, RLS would make its answer depend on who
-- was asking.
create or replace function public.family_owner_is_active(p_owner uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select
    exists (
      select 1
      from public.subscriptions s
      where s.user_id = p_owner
        and s.status = 'active'
        and s.product_id = 'com.kitch.family'
    )
    or exists (
      select 1
      from public.subscriptions_stripe ss
      where ss.user_id = p_owner
        and ss.plan = 'family'
        and ss.status in ('active', 'trialing')
    );
$$;

revoke all on function public.family_owner_is_active(uuid) from public, anon, authenticated;

-- Whether `p_user` could accept invite `p_invite_id` right now, and whose it is.
--
-- The one copy of the rules, shared by the read-only check and the respond
-- path so the page never promises something the button then refuses. Order
-- matters: the invite's own validity first, then who the caller is, then the
-- state of the family.
create or replace function public.family_invite_state(p_invite_id uuid, p_user uuid)
returns table (state text, owner_id uuid)
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  v_invite public.family_invites%rowtype;
  v_current_owner uuid;
begin
  select * into v_invite
  from public.family_invites fi
  where fi.id = p_invite_id;

  if not found then
    state := 'not_found';
    owner_id := null;
    return next;
    return;
  end if;

  owner_id := v_invite.owner_id;

  select f.subscribed_user_id into v_current_owner
  from public.subscriptions_family f
  where f.user_id = p_user;

  state := case
    when v_invite.status <> 'pending' then 'used'
    when v_invite.expires_at <= now() then 'expired'
    when p_user = v_invite.owner_id then 'own_invite'
    when v_current_owner = v_invite.owner_id then 'already_member'
    when v_current_owner is not null then 'in_other_family'
    when exists (
      select 1 from public.subscriptions s
      where s.user_id = p_user and s.status = 'active'
    ) or exists (
      select 1 from public.subscriptions_stripe ss
      where ss.user_id = p_user and ss.status in ('active', 'trialing')
    ) then 'already_subscribed'
    when not public.family_owner_is_active(v_invite.owner_id) then 'plan_inactive'
    when (
      select count(*) from public.subscriptions_family f
      where f.subscribed_user_id = v_invite.owner_id
    ) >= 4 then 'family_full'
    else 'ok'
  end;

  return next;
end;
$$;

revoke all on function public.family_invite_state(uuid, uuid) from public, anon, authenticated;

-- Mint a new invite for the caller's family. Returns its id, which is the
-- token in the link.
--
-- Pending invites do not reserve seats -- the owner may hand out more links
-- than they have seats, and whoever accepts first gets one. The seat count is
-- checked again, under a lock, on accept.
create or replace function public.family_invite_create()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.family_owner_is_active(v_user_id) then
    raise exception 'not_family_owner';
  end if;

  if (
    select count(*) from public.subscriptions_family f
    where f.subscribed_user_id = v_user_id
  ) >= 4 then
    raise exception 'family_full';
  end if;

  insert into public.family_invites (owner_id)
  values (v_user_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.family_invite_create() from public, anon;
grant execute on function public.family_invite_create() to authenticated;

-- What the join page shows. Read-only: opening a link, or a chat app
-- unfurling it, never spends the invite.
create or replace function public.family_invite_check(p_invite_id uuid)
returns table (
  state text,
  owner_display_name text,
  owner_username text,
  owner_avatar_url text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select s.state, s.owner_id into state, v_owner
  from public.family_invite_state(p_invite_id, v_user_id) s;

  select u.display_name, u.username, u.profile_pic_url
  into owner_display_name, owner_username, owner_avatar_url
  from public.users u
  where u.id = v_owner;

  return next;
end;
$$;

revoke all on function public.family_invite_check(uuid) from public, anon;
grant execute on function public.family_invite_check(uuid) to authenticated;

-- Accept or decline an invite. Returns 'accepted' or 'declined' on success,
-- otherwise the blocking state from `family_invite_state`.
--
-- A refused accept leaves the invite pending: someone told to leave their
-- current family first should be able to come back to the same link.
create or replace function public.family_invite_respond(p_invite_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner uuid;
  v_state text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Lock the invite so it can be answered exactly once.
  select fi.owner_id into v_owner
  from public.family_invites fi
  where fi.id = p_invite_id
  for update;

  if not found then
    return 'not_found';
  end if;

  -- Lock the owner too, which serialises every accept into this family:
  -- without it, two invitees accepting at once could both see 3 members and
  -- both take the fourth seat. The legacy iOS accept takes the same lock.
  perform 1 from public.users u where u.id = v_owner for update;

  select s.state into v_state
  from public.family_invite_state(p_invite_id, v_user_id) s;

  if not p_accept then
    -- Declining only needs the invite to still be live; who the caller is or
    -- how full the family is doesn't matter.
    if v_state in ('used', 'expired', 'own_invite') then
      return v_state;
    end if;

    update public.family_invites
    set status = 'declined', responded_by = v_user_id, responded_at = now()
    where id = p_invite_id;

    return 'declined';
  end if;

  if v_state <> 'ok' then
    return v_state;
  end if;

  begin
    insert into public.subscriptions_family (user_id, subscribed_user_id)
    values (v_user_id, v_owner);
  exception when unique_violation then
    -- Joined another family between the check and the insert.
    return 'in_other_family';
  end;

  update public.family_invites
  set status = 'accepted', responded_by = v_user_id, responded_at = now()
  where id = p_invite_id;

  return 'accepted';
end;
$$;

revoke all on function public.family_invite_respond(uuid, boolean) from public, anon;
grant execute on function public.family_invite_respond(uuid, boolean) to authenticated;

-- Everyone in the caller's family: the owner plus members, whether the caller
-- is the owner or a member.
--
-- Definer because the `subscriptions_family` SELECT policy only shows a
-- member their own row, not the people they share a plan with. Returns only
-- columns every authenticated user can already read from `public.users` --
-- never email.
create or replace function public.family_get_members()
returns table (
  user_id uuid,
  display_name text,
  username text,
  profile_pic_url text,
  is_owner boolean,
  is_self boolean,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Their own family wins if they own an active one, matching
  -- `entitlement_get_status`, which resolves their own subscription before a
  -- seat. Otherwise the family they hold a seat in; otherwise their own
  -- (which then has no members).
  if public.family_owner_is_active(v_user_id) then
    v_owner := v_user_id;
  else
    select f.subscribed_user_id into v_owner
    from public.subscriptions_family f
    where f.user_id = v_user_id;

    v_owner := coalesce(v_owner, v_user_id);
  end if;

  return query
  select u.id, u.display_name::text, u.username, u.profile_pic_url,
         true, u.id = v_user_id, null::timestamptz
  from public.users u
  where u.id = v_owner
  union all
  select u.id, u.display_name::text, u.username, u.profile_pic_url,
         false, u.id = v_user_id, f.created_at
  from public.subscriptions_family f
  join public.users u on u.id = f.user_id
  where f.subscribed_user_id = v_owner
  order by 5 desc, 7;
end;
$$;

revoke all on function public.family_get_members() from public, anon;
grant execute on function public.family_get_members() to authenticated;

-- ---------------------------------------------------------------------------
-- Legacy iOS RPCs. Names, arguments and return shapes are frozen -- the
-- shipped app calls them. Previously these were definer functions with no
-- identity check and executable by anon, so anyone could add any user to any
-- family, or read any family's member emails, knowing only an owner id.
--
-- Now: the caller may only act as themselves; web-bought (Stripe) family
-- plans are recognised; the cap is 4 members, matching the 5-account plan.
-- ---------------------------------------------------------------------------

create or replace function public."FamilyPlan_ReadAllMembers"(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result json;
begin
  if p_user_id is distinct from (select auth.uid()) then
    return '[]'::json;
  end if;

  select coalesce(json_agg(familyplan_data), '[]'::json)
  into v_result
  from (
    select u.id, u.display_name, u.email
    from public.subscriptions_family subs
    join public.users u on u.id = subs.user_id
    where subs.subscribed_user_id = p_user_id
  ) as familyplan_data;

  return coalesce(v_result, '[]'::json);
end;
$$;

-- Error codes as iOS knows them: 1 owner not subscribed, 2 already a member of
-- this family, 3 own family, 4 full. The old body appended one row per failed
-- rule without returning; this returns exactly one.
create or replace function public."FamilyPlan_JoinFamily_GetSetupData"(p_user_id uuid, p_owner_id uuid)
returns table (error_code integer, display_name character varying)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is distinct from (select auth.uid())
     or not public.family_owner_is_active(p_owner_id) then
    return query select 1, null::varchar;
    return;
  end if;

  if exists (
    select 1 from public.subscriptions_family f
    where f.user_id = p_user_id and f.subscribed_user_id = p_owner_id
  ) then
    return query select 2, null::varchar;
    return;
  end if;

  if p_user_id = p_owner_id then
    return query select 3, null::varchar;
    return;
  end if;

  if (
    select count(*) from public.subscriptions_family f
    where f.subscribed_user_id = p_owner_id
  ) >= 4 then
    return query select 4, null::varchar;
    return;
  end if;

  return query
  select 0, coalesce(u.display_name, u.email)
  from public.users u
  where u.id = p_owner_id;
end;
$$;

create or replace function public."FamilyPlan_JoinFamily_Accept"(p_user_id uuid, p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is distinct from (select auth.uid()) then
    return;
  end if;

  if p_user_id = p_owner_id then
    return;
  end if;

  -- Same lock as `family_invite_respond`, so the two paths can't race each
  -- other past the seat cap.
  perform 1 from public.users u where u.id = p_owner_id for update;

  if not public.family_owner_is_active(p_owner_id) then
    return;
  end if;

  if exists (
    select 1 from public.subscriptions_family f
    where f.user_id = p_user_id
  ) then
    return;
  end if;

  if (
    select count(*) from public.subscriptions_family f
    where f.subscribed_user_id = p_owner_id
  ) >= 4 then
    return;
  end if;

  insert into public.subscriptions_family (user_id, subscribed_user_id)
  values (p_user_id, p_owner_id);
end;
$$;

revoke all on function public."FamilyPlan_ReadAllMembers"(uuid) from public, anon;
revoke all on function public."FamilyPlan_JoinFamily_GetSetupData"(uuid, uuid) from public, anon;
revoke all on function public."FamilyPlan_JoinFamily_Accept"(uuid, uuid) from public, anon;
grant execute on function public."FamilyPlan_ReadAllMembers"(uuid) to authenticated;
grant execute on function public."FamilyPlan_JoinFamily_GetSetupData"(uuid, uuid) to authenticated;
grant execute on function public."FamilyPlan_JoinFamily_Accept"(uuid, uuid) to authenticated;
