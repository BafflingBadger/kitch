-- Recipe macros, servings on meal-plan recipes, Premium-only Quick Add, and a
-- monthly import ceiling.
--
-- Everything here is additive for the shipped iOS app:
--   * the new `recipes` columns are NOT NULL with defaults, so `Recipe_Write`
--     inserts pick them up and its updates (which name their columns) leave
--     them alone; `Recipes_Read` lists its columns explicitly.
--   * `mealplan_recipe_mapping.servings` defaults to 1, and the extra key in
--     `MealPlanRecipes_ReadAll` (setof the table) is ignored by Decodable.

-- ---------------------------------------------------------------------------
-- Per-serving macros on recipes
-- ---------------------------------------------------------------------------

-- Never null, so every recipe has macros from the moment its row exists.
-- Imports fill them from the same OpenAI call that parses the recipe; recipes
-- written by hand start at zero until the owner enters numbers (or uses the
-- Premium "Auto Estimate"). Ranges match `food_items`.
alter table public.recipes
  add column servings  numeric(5, 2) not null default 1
    check (servings > 0 and servings <= 100),
  add column calories  integer not null default 0
    check (calories between 0 and 10000),
  add column protein_g numeric(6, 1) not null default 0
    check (protein_g between 0 and 1000),
  add column fat_g     numeric(6, 1) not null default 0
    check (fat_g between 0 and 1000),
  add column carbs_g   numeric(6, 1) not null default 0
    check (carbs_g between 0 and 1000);

-- ---------------------------------------------------------------------------
-- Servings eaten per meal-plan recipe
-- ---------------------------------------------------------------------------

alter table public.mealplan_recipe_mapping
  add column servings numeric(4, 2) not null default 1
    check (servings > 0 and servings <= 20);

-- There was no UPDATE policy before: entries were only ever added or removed.
create policy "Users can update their own meal plan recipes"
  on public.mealplan_recipe_mapping for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Monthly import ceiling
-- ---------------------------------------------------------------------------

-- A silent fair-use ceiling on imports for everyone, Premium included. It
-- exists to cap what an automated caller can spend on BrightData and OpenAI,
-- not as a product limit; the free tier's 10 lifetime imports stay in
-- `import_usage`. Same shape as `macro_estimate_usage`: no write policy, only
-- `imports_consume_monthly()` moves it.
create table public.import_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  month   date not null,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, month)
);

alter table public.import_usage_monthly enable row level security;

create policy "Users can read their own monthly import usage"
  on public.import_usage_monthly for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.import_usage_monthly from anon, authenticated;
grant select on public.import_usage_monthly to authenticated;

-- Spend one import attempt this UTC month. Called by `import-recipe` before
-- it scrapes or calls OpenAI, so attempts that later fail still count.
create or replace function public.imports_consume_monthly()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit   constant integer := 300;
  v_month   date := date_trunc('month', now() at time zone 'utc')::date;
  v_count   integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- The conditional update makes the check and the increment one statement,
  -- so two concurrent requests can't both take the last slot.
  insert into public.import_usage_monthly as u (user_id, month, count)
  values (v_user_id, v_month, 1)
  on conflict (user_id, month) do update
    set count = u.count + 1
    where u.count < v_limit
  returning u.count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.imports_consume_monthly() from public, anon;
grant execute on function public.imports_consume_monthly() to authenticated;

-- ---------------------------------------------------------------------------
-- Quick Add is Premium only
-- ---------------------------------------------------------------------------

-- Free users no longer get any AI estimates (previously 3 a day). Premium is
-- still unlimited and still counted, so `macro_estimate_usage` stays a usage
-- log. Same signature, so the existing grants carry over.
create or replace function public.macro_estimates_consume()
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_today   date := (now() at time zone 'utc')::date;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_active_premium() then
    return query select false, 0;
    return;
  end if;

  insert into public.macro_estimate_usage as u (user_id, day, count)
  values (v_user_id, v_today, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1;

  return query select true, null::integer;
end;
$$;

-- ---------------------------------------------------------------------------
-- Recipe "Auto Estimate" (Premium only)
-- ---------------------------------------------------------------------------

-- Per-day count of recipe macro estimates. Premium-only feature with a
-- fair-use ceiling no real user reaches; it stops a script from looping.
create table public.recipe_macro_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.recipe_macro_usage enable row level security;

create policy "Users can read their own recipe macro usage"
  on public.recipe_macro_usage for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.recipe_macro_usage from anon, authenticated;
grant select on public.recipe_macro_usage to authenticated;

-- Spend one recipe estimate. `reason` is 'premium_required' or
-- 'limit_reached' when refused, null when allowed.
create or replace function public.recipe_macro_estimates_consume()
returns table (allowed boolean, reason text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit   constant integer := 200;
  v_today   date := (now() at time zone 'utc')::date;
  v_count   integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_active_premium() then
    return query select false, 'premium_required'::text;
    return;
  end if;

  insert into public.recipe_macro_usage as u (user_id, day, count)
  values (v_user_id, v_today, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < v_limit
  returning u.count into v_count;

  if v_count is null then
    return query select false, 'limit_reached'::text;
  else
    return query select true, null::text;
  end if;
end;
$$;

revoke all on function public.recipe_macro_estimates_consume() from public, anon;
grant execute on function public.recipe_macro_estimates_consume() to authenticated;
