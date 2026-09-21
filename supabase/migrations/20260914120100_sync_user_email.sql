-- `public.users.email` mirrors `auth.users.email`, but nothing kept the two in
-- step: Supabase only ever writes the `auth` side, so every email change left
-- the mirror stale.
--
-- Doing this with a trigger rather than in the web app's confirm route means it
-- also covers the iOS app, the Supabase dashboard, and anything added later.
-- `User_AfterInsert` already sets the precedent for triggering on `auth.users`.

create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists user_email_sync on auth.users;

-- `auth.users.email` is nullable (phone-only accounts) while
-- `public.users.email` is NOT NULL, so a null must never propagate.
create trigger user_email_sync
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email and new.email is not null)
  execute function public.sync_user_email();

-- Backfill anything that drifted before the trigger existed.
update public.users u
set email = au.email
from auth.users au
where au.id = u.id
  and au.email is not null
  and au.email is distinct from u.email;
