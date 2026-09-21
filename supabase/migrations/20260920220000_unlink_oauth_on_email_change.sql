-- Changing an email must revoke the OAuth accounts tied to the old address.
--
-- Partial unlinking does not work: GoTrue's account-linking lookup matches
-- against the email stored on *identities*, not just `auth.users.email`, so a
-- single leftover identity carrying the old address silently re-links the
-- others on the next sign-in. Observed directly -- a disconnected Google
-- identity re-attached itself while an Apple identity still held that address.
--
-- It also has to happen when the change *commits*, not when it is requested.
-- Unlinking up front leaves this window open:
--
--   1. user asks to change old@ -> new@, identities are unlinked
--   2. user does not confirm, so the account email is still old@
--   3. user signs in with Google (old@) -- it matches and re-links
--   4. user then confirms, and the old Google account is now on the new email
--
-- A trigger on the commit closes that window, and means an abandoned change
-- unlinks nothing at all.
--
-- NOTE: this writes to `auth.identities`, which is GoTrue's own schema and not
-- a supported integration point. Re-check it when upgrading Supabase auth.
create or replace function public.unlink_oauth_on_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Never strip an account's only way in. The app separately requires a
  -- password before allowing an email change; this is the backstop for any
  -- path that does not, including changes made from the Supabase dashboard.
  if exists (
    select 1
    from auth.identities
    where user_id = new.id
      and provider = 'email'
  ) then
    delete from auth.identities
    where user_id = new.id
      and provider <> 'email';
  end if;

  return new;
end;
$$;

drop trigger if exists unlink_oauth_on_email_change on auth.users;

create trigger unlink_oauth_on_email_change
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email and new.email is not null)
  execute function public.unlink_oauth_on_email_change();
