-- The landing page's Android waitlist.
--
-- `android_waitlist` has RLS on and no policies, so nothing but the service
-- role can touch it. Rather than put the service role key in the Next app, the
-- landing page goes through this one function: it can add an email and nothing
-- else -- no reading the list, no deleting from it.
--
-- Callable by anon on purpose: the waitlist is for people who don't have an
-- account. A duplicate is swallowed so the response doesn't reveal whether an
-- address is already on the list.

create or replace function public.android_waitlist_join(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null
     or length(v_email) > 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  insert into public.android_waitlist (email)
  values (v_email)
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.android_waitlist_join(text) from public, anon, authenticated;
grant execute on function public.android_waitlist_join(text) to anon, authenticated;
