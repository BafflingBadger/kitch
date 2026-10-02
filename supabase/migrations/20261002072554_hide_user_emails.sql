-- Stop exposing every user's email address to every other signed-in user.
--
-- public.users is readable by all authenticated users (profiles, discover,
-- follows), and its `email` column mirrored auth.users.email -- so anyone with an
-- account could list every address with one query.
--
-- Why blank the column instead of revoking it:
--   * The iOS app decodes `UserDetails.email` as a non-optional String from
--     Users_Read / Users_ReadAll / Users_ReadAllFollowing /
--     Users_ReadAllFollowingCookbooks, which return `users.*`. A missing key
--     fails decoding; an empty string does not.
--   * iOS profile edits use supabase-swift `update()`, which defaults to
--     `returning: .representation` -- i.e. it selects the whole row back. A
--     column-level revoke would turn every profile edit into a permission error.
-- iOS never displays UserDetails.email, so an empty string changes nothing it
-- shows.
--
-- auth.users.email remains the source of truth (not exposed through the API).
-- The two places that legitimately show members' emails -- your own household
-- and your own family plan -- now read it from there.

-- ---------------------------------------------------------------------------
-- 1. Stop mirroring, and clear what is already there
-- ---------------------------------------------------------------------------
drop trigger if exists user_email_sync on auth.users;
drop function if exists public.sync_user_email();

update public.users set email = '' where email <> '';

comment on column public.users.email is
  'Deliberately always empty: this table is readable by every signed-in user. '
  'Read emails from auth.users (security definer) or the JWT instead. '
  'Kept, NOT NULL, because the iOS app decodes it as a non-optional String.';

-- New accounts: identical to the previous trigger except that `email` is
-- written as ''. The display-name fallback still uses the email local-part.
create or replace function public."User_AfterInsert"()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_display_name text;
  v_base         text;
  v_username     text;
  v_pic          text;
  v_suffix       int;
begin
  -- Nothing to do if a profile already exists for this auth user.
  if exists (select 1 from public.users u where u.id = new.id) then
    return new;
  end if;

  -- Seed per-user settings. Kept idempotent so this trigger stays safe to
  -- re-run against a partially provisioned user.
  insert into public.user_settings (user_id, sort_type_recipe)
  select new.id, 'newest'
  where not exists (
    select 1 from public.user_settings s where s.user_id = new.id
  );

  -- Display name: the web sign-up form sends `display_name`; Google and Apple
  -- send `full_name` / `name`. Fall back to the email local-part.
  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'),    ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'),         ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'Kitch User'
  );

  -- Avatar handed over by the OAuth provider. Stored as the raw provider URL so
  -- the user always has a picture; the web app mirrors it into the `profiles`
  -- storage bucket and rewrites this column on first sign-in.
  v_pic := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'picture'),    '')
  );

  -- Username: lowercase the display name and drop everything that is not
  -- alphanumeric, then append the lowest free integer suffix on collision.
  --
  -- NFKD first decomposes accented characters into base letter + combining
  -- mark, so stripping non-alphanumerics folds "Diaz" rather than dropping the
  -- accented letter outright ("Ana Diaz" -> anadiaz, not anadaz).
  v_base := left(
    lower(regexp_replace(normalize(v_display_name, NFKD), '[^a-zA-Z0-9]', '', 'g')),
    30
  );
  if v_base = '' then
    v_base := 'user';
  end if;

  -- Retried because two concurrent sign-ups can derive the same base and both
  -- observe it as free before either commits.
  for attempt in 1 .. 5 loop
    v_username := v_base;
    v_suffix   := 1;

    while exists (select 1 from public.users u where lower(u.username) = v_username) loop
      v_username := v_base || v_suffix::text;
      v_suffix   := v_suffix + 1;
    end loop;

    begin
      -- email is intentionally '' -- see the column comment.
      insert into public.users (id, display_name, username, email, profile_pic_url)
      values (new.id, v_display_name, v_username, '', v_pic);
      return new;
    exception
      when unique_violation then
        null; -- taken between the check and the insert; recompute and retry
    end;
  end loop;

  -- Last resort, so a pathological collision can never block sign-up.
  insert into public.users (id, display_name, username, email, profile_pic_url)
  values (
    new.id,
    v_display_name,
    v_base || replace(new.id::text, '-', ''),
    '',
    v_pic
  );

  return new;
end;
$function$;

-- create or replace keeps grants, but restate the lockdown from
-- 20261001051822_prelaunch_hardening in case that ran in a different order.
revoke execute on function public."User_AfterInsert"() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Readers that legitimately need an email: read auth.users instead
-- ---------------------------------------------------------------------------
-- Same signatures and result shapes as before.

-- Your own household's members (iOS shares a grocery list across it).
create or replace function public."Households_ReadAllMembers"(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_result json;
begin
  if p_user_id is distinct from (select auth.uid())
     and not exists (
       select 1
       from public.households h
       where ((select auth.uid()) = h.owner_id or (select auth.uid()) = h.member_id)
         and (p_user_id = h.owner_id or p_user_id = h.member_id)
     ) then
    return '[]'::json;
  end if;

  select owner_id into v_owner_id
  from public.households
  where member_id = p_user_id
  limit 1;

  if v_owner_id is null then
    v_owner_id := p_user_id;
  end if;

  select coalesce(json_agg(households_data), '[]'::json)
  into v_result
  from (
    select u.id, u.display_name, coalesce(au.email, '')::varchar as email, false as is_owner
    from public.households h
    join public.users u on u.id = h.member_id
    left join auth.users au on au.id = u.id
    where h.owner_id = v_owner_id

    union

    select u.id, u.display_name, coalesce(au.email, '')::varchar as email, true as is_owner
    from public.users u
    left join auth.users au on au.id = u.id
    where u.id = v_owner_id
  ) as households_data;

  return coalesce(v_result, '[]'::json);
end;
$$;

-- Members of the family plan you own.
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
    select u.id, u.display_name, coalesce(au.email, '')::varchar as email
    from public.subscriptions_family subs
    join public.users u on u.id = subs.user_id
    left join auth.users au on au.id = u.id
    where subs.subscribed_user_id = p_user_id
  ) as familyplan_data;

  return coalesce(v_result, '[]'::json);
end;
$$;

-- The join screens fell back to the owner's email when they had no display
-- name. Display names are always set on sign-up, so the fallback is now a
-- neutral label rather than someone's address.
create or replace function public."FamilyPlan_JoinFamily_GetSetupData"(
  p_user_id uuid,
  p_owner_id uuid
)
returns table(error_code integer, display_name character varying)
language plpgsql
security definer
set search_path to ''
as $function$
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
  select 0, coalesce(nullif(btrim(u.display_name), ''), 'a Kitch user')::varchar
  from public.users u
  where u.id = p_owner_id;
end;
$function$;

create or replace function public."Households_JoinHousehold_GetSetupData"(
  p_owner_id uuid,
  p_user_id uuid
)
returns table(error_code integer, display_name character varying)
language plpgsql
set search_path to 'public'
as $function$
begin
  -- Rule 1: If household owner is already a member of another household
  if exists (
    select 1 from public.households h where h.member_id = p_owner_id
  ) then
    return query select 1 as error_code, null::varchar as display_name;
  end if;

  -- Rule 2: If the current user is already a member of the owner's household
  if exists (
    select 1 from public.households h where h.member_id = p_user_id and h.owner_id = p_owner_id
  ) then
    return query select 2 as error_code, null::varchar as display_name;
  end if;

  -- Rule 3: If the current user is a member of another household
  if exists (
    select 1 from public.households h where h.member_id = p_user_id
  ) and not exists (
    select 1 from public.households h where h.owner_id = p_owner_id
  ) then
    return query select 3 as error_code, null::varchar as display_name;
  end if;

  -- Rule 4: If the current user is already a household owner
  if exists (
    select 1 from public.households h where h.owner_id = p_user_id
  ) then
    return query select 4 as error_code, null::varchar as display_name;
  end if;

  -- Rule 5: If the current user is trying to join his own household
  if p_user_id = p_owner_id then
    return query select 5 as error_code, null::varchar as display_name;
  end if;

  -- Rule 6: Otherwise return error_code 0 with display_name
  return query
  select
    0 as error_code,
    coalesce(nullif(btrim(u.display_name), ''), 'a Kitch user')::varchar as display_name
  from public.users u
  where u.id = p_owner_id;

end;
$function$;
