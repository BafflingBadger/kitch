-- Self-serve account deletion.
--
-- The client cannot do this itself: `public.users` has a DELETE policy of
-- `USING (false)` and no service-role key is configured, so nothing in the app
-- can reach `auth.users`. Deleting there cascades through `public.users` and,
-- since 20260914120000, on through recipes and cookbooks.

-- Re-authentication gate, split out so the caller can check it *before* doing
-- anything irreversible. Deleting an account also means deleting the user's
-- images from storage, and that has to happen while the recipe rows still
-- exist -- the bucket's delete policy proves ownership by joining back to
-- them. Without a preflight, a stale session would destroy the images and then
-- be refused here, leaving the account alive and its pictures gone.
create or replace function public.assert_recent_auth()
returns void
language plpgsql
security definer
-- Empty rather than `public, auth`: a SECURITY DEFINER function with a
-- resolvable search_path can be hijacked by shadowing an object it references.
set search_path = ''
as $$
declare
  last_auth bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- `amr` timestamps record when the user last actually proved who they are
  -- and, unlike `iat`, do not move on a token refresh -- so a long-lived stolen
  -- session cannot clear this on its own. Checked in the database rather than
  -- the UI so it still holds for a caller hitting PostgREST directly. Missing
  -- or stale `amr` fails closed; the caller is told to sign in again, which is
  -- recoverable.
  select max((entry->>'timestamp')::bigint)
    into last_auth
    from jsonb_array_elements(
      coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)
    ) as entry;

  if last_auth is null
     or last_auth < extract(epoch from now())::bigint - 900 then
    raise exception 'reauthentication_required' using errcode = '28000';
  end if;
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Re-checked here, not just at preflight, so the guarantee does not depend on
  -- the caller having asked politely first.
  perform public.assert_recent_auth();

  delete from auth.users where id = (select auth.uid());
end;
$$;

comment on function public.delete_own_account() is
  'Deletes the calling user. Takes no arguments on purpose: the target is always '
  'auth.uid(), so it can never be aimed at another account. Do not add a parameter.';

revoke all on function public.assert_recent_auth() from public, anon;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.assert_recent_auth() to authenticated;
grant execute on function public.delete_own_account() to authenticated;
