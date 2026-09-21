-- Whether the caller can sign in with a password.
--
-- The obvious proxy -- "does an `email` identity exist" -- is wrong. Unlinking
-- that identity leaves `auth.users.encrypted_password` untouched, and setting a
-- password does NOT create one (verified: a password set at 23:10 left
-- email_identities at 0). So an account can hold a working password with no
-- identity to show for it, and the UI would keep insisting they set one.
--
-- `auth.users` is not reachable through PostgREST, hence the definer function.
create or replace function public.current_user_has_password()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and encrypted_password is not null
      and encrypted_password <> ''
  );
$$;

revoke all on function public.current_user_has_password() from public, anon;
grant execute on function public.current_user_has_password() to authenticated;

-- Align the unlink trigger with the same signal, so the UI and the database
-- agree on what "can still get in" means. Previously it required an `email`
-- identity, which an account like the above will never have -- meaning the UI
-- would permit an email change that the trigger then silently declined to act
-- on, leaving the old OAuth accounts attached to the new address.
create or replace function public.unlink_oauth_on_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Never strip an account's only way in.
  if new.encrypted_password is not null and new.encrypted_password <> '' then
    delete from auth.identities
    where user_id = new.id
      and provider <> 'email';
  end if;

  return new;
end;
$$;
