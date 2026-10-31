-- Lower the free tier's daily Quick Add AI estimates from 5 to 3.
--
-- Only the limit changes. `create or replace` keeps the existing grants
-- (execute for authenticated only). Anyone already at 3 or more today is
-- refused for the rest of the UTC day: the conditional update below never
-- fires, so `v_count` stays null.

create or replace function public.macro_estimates_consume()
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit   constant integer := 3;
  v_today   date := (now() at time zone 'utc')::date;
  v_count   integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if public.has_active_premium() then
    return query select true, null::integer;
    return;
  end if;

  -- The conditional update makes the check and the increment one statement,
  -- so two concurrent requests can't both take the last slot.
  insert into public.macro_estimate_usage as u (user_id, day, count)
  values (v_user_id, v_today, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < v_limit
  returning u.count into v_count;

  if v_count is null then
    return query select false, 0;
  else
    return query select true, v_limit - v_count;
  end if;
end;
$$;
