-- Repairs profile creation on sign-up.
--
-- The live `User_AfterInsert` trigger inserted into public.users(first_name,
-- last_name, ...) -- columns that do not exist on this table. Because it is an
-- AFTER INSERT trigger on auth.users, the raised 42703 rolled back the whole
-- auth insert, so every sign-up failed with "Database error saving new user".
--
-- This rewrites the function to populate the columns the table actually has and
-- to derive a unique username from the display name.

-- Usernames are treated as case-insensitively unique. All existing rows are
-- already distinct when lowercased, so this is safe to add in place.
create unique index if not exists users_username_lower_key
  on public.users (lower(username));

create or replace function public."User_AfterInsert"()
returns trigger
language plpgsql
security definer
set search_path = public
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
      insert into public.users (id, display_name, username, email, profile_pic_url)
      values (new.id, v_display_name, v_username, coalesce(new.email, ''), v_pic);
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
    coalesce(new.email, ''),
    v_pic
  );

  return new;
end;
$function$;
