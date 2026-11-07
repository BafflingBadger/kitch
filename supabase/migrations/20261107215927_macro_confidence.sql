-- The AI's own confidence, a whole number out of 10, in each macro estimate, recorded for later
-- analysis. Not shown in any UI yet.
--
-- Null means there is no AI estimate behind the numbers: typed by hand, edited
-- after estimating, or estimated before this column existed (including the
-- recipe backfill). A food re-logged unchanged from the library keeps the
-- library row's score. All additive and nullable,
-- so the shipped iOS app is unaffected.

alter table public.recipes
  add column macros_confidence smallint
    check (macros_confidence between 0 and 10);

alter table public.food_items
  add column confidence smallint
    check (confidence between 0 and 10);

alter table public.mealplan_food_entries
  add column confidence smallint
    check (confidence between 0 and 10);

-- Same as before, plus an optional `confidence` per item. The library row takes
-- the latest item's confidence (null if the item has none) and the day's entry
-- copies it, like the macros. Older callers that don't send it record null.
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
      user_id, name, serving, calories, protein_g, fat_g, carbs_g, confidence,
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
      (v_item ->> 'confidence')::smallint,
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
          confidence   = excluded.confidence,
          use_count    = f.use_count + 1,
          last_used_at = now()
    returning f.id into v_food_id;

    insert into public.mealplan_food_entries (
      user_id, date, type, food_item_id,
      name, serving, calories, protein_g, fat_g, carbs_g, confidence
    )
    select v_user_id, p_date, p_type, f.id,
           f.name, f.serving, f.calories, f.protein_g, f.fat_g, f.carbs_g, f.confidence
    from public.food_items f
    where f.id = v_food_id;

    v_added := v_added + 1;
  end loop;

  return v_added;
end;
$$;
