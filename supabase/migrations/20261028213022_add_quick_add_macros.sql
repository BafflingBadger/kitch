-- Quick Add macro tracking on the meal plan.
--
-- Foods logged through Quick Add get their own tables rather than going into
-- `mealplan_recipe_mapping`: that table's `recipe_id` is NOT NULL and the
-- shipped iOS app decodes it through `"MealPlanRecipes_ReadAll"`, so making it
-- nullable would break iOS.
--
--   food_items             the user's personal food library (recents, favourites)
--   mealplan_food_entries  foods placed on a day, with a snapshot of the macros
--   macro_estimate_usage   per-day count of AI estimates, for the free-tier cap

-- ---------------------------------------------------------------------------
-- food_items
-- ---------------------------------------------------------------------------

create table public.food_items (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  serving      text check (char_length(serving) <= 100),
  calories     integer not null check (calories between 0 and 10000),
  protein_g    numeric(6, 1) not null check (protein_g between 0 and 1000),
  fat_g        numeric(6, 1) not null check (fat_g between 0 and 1000),
  carbs_g      numeric(6, 1) not null check (carbs_g between 0 and 1000),
  is_favourite boolean not null default false,
  use_count    integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

-- One library row per food name, so logging "Banana" again updates the same
-- row instead of filling the recents with duplicates.
create unique index food_items_user_name_key
  on public.food_items (user_id, lower(name));

create index food_items_user_last_used_idx
  on public.food_items (user_id, last_used_at desc nulls last);

create index food_items_user_favourite_idx
  on public.food_items (user_id)
  where is_favourite;

alter table public.food_items enable row level security;

-- Client writes are fine here: the worst a user can do is misstate their own
-- macros.
create policy "Users can read their own food items"
  on public.food_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own food items"
  on public.food_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own food items"
  on public.food_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own food items"
  on public.food_items for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.food_items from anon;
grant select, insert, update, delete on public.food_items to authenticated;

-- ---------------------------------------------------------------------------
-- mealplan_food_entries
-- ---------------------------------------------------------------------------

-- Name and macros are copied from the library at the time of logging, so
-- editing a food later never rewrites what was eaten on past days.
create table public.mealplan_food_entries (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  type         public."Meal Plan Types" not null,
  food_item_id bigint references public.food_items (id) on delete set null,
  name         text not null check (char_length(name) between 1 and 200),
  serving      text check (char_length(serving) <= 100),
  calories     integer not null check (calories between 0 and 10000),
  protein_g    numeric(6, 1) not null check (protein_g between 0 and 1000),
  fat_g        numeric(6, 1) not null check (fat_g between 0 and 1000),
  carbs_g      numeric(6, 1) not null check (carbs_g between 0 and 1000),
  created_at   timestamptz not null default now()
);

create index mealplan_food_entries_user_date_idx
  on public.mealplan_food_entries (user_id, date);

create index mealplan_food_entries_food_item_idx
  on public.mealplan_food_entries (food_item_id);

alter table public.mealplan_food_entries enable row level security;

create policy "Users can read their own food entries"
  on public.mealplan_food_entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own food entries"
  on public.mealplan_food_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own food entries"
  on public.mealplan_food_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own food entries"
  on public.mealplan_food_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.mealplan_food_entries from anon;
grant select, insert, update, delete on public.mealplan_food_entries to authenticated;

-- ---------------------------------------------------------------------------
-- macro_estimate_usage
-- ---------------------------------------------------------------------------

-- AI estimates spent per UTC day. Same shape of reasoning as `import_usage`:
-- no write policy, because a counter the user can write is not a limit. Only
-- `macro_estimates_consume()` moves it.
create table public.macro_estimate_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.macro_estimate_usage enable row level security;

create policy "Users can read their own macro estimate usage"
  on public.macro_estimate_usage for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.macro_estimate_usage from anon, authenticated;
grant select on public.macro_estimate_usage to authenticated;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Spend one AI estimate. Called by the `estimate-macros` edge function before
-- it calls OpenAI. Premium is unlimited (`remaining` is null); free users get 5
-- a day. The limit lives here rather than in a parameter so a caller can't
-- pick their own -- calling this directly only spends the caller's allowance.
--
-- Definer because `macro_estimate_usage` has no write policy.
create or replace function public.macro_estimates_consume()
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit   constant integer := 5;
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

revoke all on function public.macro_estimates_consume() from public, anon;
grant execute on function public.macro_estimates_consume() to authenticated;

-- Log foods to one meal in one transaction: upsert each into the caller's
-- library (refreshing its macros and recency), then insert the day's entry.
--
-- Invoker, so RLS does the ownership checking. `p_items` is an array of
-- `{ name, serving, calories, protein_g, fat_g, carbs_g }`; the table checks
-- reject out-of-range values.
create or replace function public.meal_food_entries_add(
  p_date  date,
  p_type  public."Meal Plan Types",
  p_items jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item    jsonb;
  v_name    text;
  v_serving text;
  v_food_id bigint;
  v_added   integer := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 20 then
    raise exception 'expected between 1 and 20 items';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_name := btrim(v_item ->> 'name');
    v_serving := nullif(btrim(coalesce(v_item ->> 'serving', '')), '');

    insert into public.food_items as f (
      user_id, name, serving, calories, protein_g, fat_g, carbs_g,
      use_count, last_used_at
    )
    values (
      v_user_id,
      v_name,
      v_serving,
      (v_item ->> 'calories')::integer,
      (v_item ->> 'protein_g')::numeric,
      (v_item ->> 'fat_g')::numeric,
      (v_item ->> 'carbs_g')::numeric,
      1,
      now()
    )
    on conflict (user_id, lower(name)) do update
      set name         = excluded.name,
          serving      = excluded.serving,
          calories     = excluded.calories,
          protein_g    = excluded.protein_g,
          fat_g        = excluded.fat_g,
          carbs_g      = excluded.carbs_g,
          use_count    = f.use_count + 1,
          last_used_at = now()
    returning f.id into v_food_id;

    insert into public.mealplan_food_entries (
      user_id, date, type, food_item_id,
      name, serving, calories, protein_g, fat_g, carbs_g
    )
    select v_user_id, p_date, p_type, f.id,
           f.name, f.serving, f.calories, f.protein_g, f.fat_g, f.carbs_g
    from public.food_items f
    where f.id = v_food_id;

    v_added := v_added + 1;
  end loop;

  return v_added;
end;
$$;

revoke all on function public.meal_food_entries_add(date, public."Meal Plan Types", jsonb) from public, anon;
grant execute on function public.meal_food_entries_add(date, public."Meal Plan Types", jsonb) to authenticated;
