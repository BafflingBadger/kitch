-- Carry a family along when an Apple Family subscription moves between
-- accounts.
--
-- `transfer-subscription` re-keys a `subscriptions` row from one user to
-- another (e.g. someone restores their iPhone purchase on a new Kitch
-- account). Seats in `subscriptions_family` and pending `family_invites` point
-- at the owner's user id, so without this they stay behind on an account that
-- no longer owns the plan, and every member silently loses Premium.
--
-- Called by that edge function after its insert, with the service role. Safe
-- to call after any transfer: it does nothing unless `p_to` now holds the
-- Family product and `p_from` no longer owns an active family some other way.
--
-- Returns the number of seats moved.
create or replace function public.family_transfer_owner(p_from uuid, p_to uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room integer;
  v_moved integer;
begin
  if p_from is null or p_to is null or p_from = p_to then
    return 0;
  end if;

  -- The Family product is now attached to the new account. Status is not
  -- checked: a lapsed plan that renews should come back with its members.
  if not exists (
    select 1 from public.subscriptions s
    where s.user_id = p_to and s.product_id = 'com.kitch.family'
  ) then
    return 0;
  end if;

  -- The old account still owns an active family (a web purchase, say). Its
  -- members are on that plan, not the one that moved.
  if public.family_owner_is_active(p_from) then
    return 0;
  end if;

  -- Same lock the accept paths take on an owner, on both families, in a
  -- fixed order so two opposing transfers cannot deadlock.
  perform 1 from public.users u
  where u.id in (p_from, p_to)
  order by u.id
  for update;

  -- The new owner can't also hold a seat -- in this family (transferring to a
  -- member's account) or anyone else's.
  delete from public.subscriptions_family f
  where f.user_id = p_to;

  -- Normally 4: the new owner has no members of their own. Less only if they
  -- also own a web Family plan, in which case the earliest joiners move and
  -- the rest stay dormant on the old account rather than overfill this one.
  v_room := 4 - (
    select count(*) from public.subscriptions_family f
    where f.subscribed_user_id = p_to
  );

  with moving as (
    select f.user_id
    from public.subscriptions_family f
    where f.subscribed_user_id = p_from
    order by f.created_at
    limit greatest(v_room, 0)
  )
  update public.subscriptions_family f
  set subscribed_user_id = p_to
  from moving
  where f.user_id = moving.user_id;

  get diagnostics v_moved = row_count;

  -- Links already sent keep working, now for the new owner's family.
  update public.family_invites fi
  set owner_id = p_to
  where fi.owner_id = p_from
    and fi.status = 'pending';

  return v_moved;
end;
$$;

-- Service role only: this moves other people's seats, and the only caller is
-- the edge function, which has already verified the Apple transaction.
revoke all on function public.family_transfer_owner(uuid, uuid) from public, anon, authenticated;
grant execute on function public.family_transfer_owner(uuid, uuid) to service_role;
