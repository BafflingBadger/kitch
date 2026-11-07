-- Return recipe nutrition from the three recipe-reading RPCs iOS uses.
--
-- Each function is recreated exactly as it was live (same signature, settings,
-- joins and filters), with the macro columns from `20261107190448_recipe_macros`
-- and `20261107215927_macro_confidence` appended after `created_at`. Adding
-- keys to the returned JSON is backwards compatible: shipped iOS builds decode
-- with Codable, which ignores keys it doesn't know. Nothing is renamed or
-- removed.

create or replace function public."Recipes_Read"(_recipe_id bigint)
returns json
language sql
stable
set search_path to 'public'
as $function$
select row_to_json(recipes_data)
  from (
    select
      recipes.id,
      recipes.user_id,
      recipes.name,
      recipes.thumbnail,
      recipes.source_url,
      recipes.source_text,
      coalesce(json_agg(distinct ingredients.*) filter (where ingredients.id is not null), '[]'::json) as ingredients,
      coalesce(json_agg(distinct directions.*) filter (where directions.id is not null), '[]'::json) as directions,
      coalesce(json_agg(distinct cookbooks.*) filter (where cookbooks.id is not null), '[]'::json) as cookbooks,
      recipes.rating,
      recipes.notes,
      recipes.created_at,
      recipes.servings,
      recipes.calories,
      recipes.protein_g,
      recipes.fat_g,
      recipes.carbs_g,
      recipes.macros_confidence
    from recipes
    left join ingredients on ingredients.recipe_id = recipes.id
    left join directions on directions.recipe_id = recipes.id
    left join recipes_mapping on recipes_mapping.recipe_id = recipes.id
    left join cookbooks on cookbooks.id = recipes_mapping.cookbook_id
    where recipes.id = _recipe_id
    group by recipes.id
  ) as recipes_data;
$function$;

create or replace function public."Recipes_ReadAll"(_user_id uuid)
returns json
language sql
stable
set search_path to 'public'
as $function$
select coalesce(json_agg(recipes_data), '[]'::json)
  from (
    select
      recipes.id,
      recipes.user_id,
      recipes.name,
      recipes.thumbnail,
      recipes.source_url,
      recipes.source_text,
      coalesce(json_agg(distinct ingredients.*) filter (where ingredients.id is not null), '[]'::json) as ingredients,
      coalesce(json_agg(distinct directions.*) filter (where directions.id is not null), '[]'::json) as directions,
      coalesce(json_agg(distinct cookbooks.*) filter (where cookbooks.id is not null), '[]'::json) as cookbooks,
      recipes.rating,
      recipes.notes,
      recipes.created_at,
      recipes.servings,
      recipes.calories,
      recipes.protein_g,
      recipes.fat_g,
      recipes.carbs_g,
      recipes.macros_confidence
    from recipes
    left join ingredients on ingredients.recipe_id = recipes.id
    left join directions on directions.recipe_id = recipes.id
    left join recipes_mapping on recipes_mapping.recipe_id = recipes.id
    left join cookbooks on cookbooks.id = recipes_mapping.cookbook_id
    where recipes.user_id = _user_id
    group by recipes.id
  ) as recipes_data;
$function$;

create or replace function public."Recipes_ReadAllFollowing"(p_user_id uuid)
returns json
language sql
stable
set search_path to 'public'
as $function$
select coalesce(json_agg(recipes_data), '[]'::json)
from (
  select
    recipes.id,
    recipes.user_id,
    recipes.name,
    recipes.thumbnail,
    recipes.source_url,
    recipes.source_text,
    coalesce(json_agg(distinct ingredients.*) filter (where ingredients.id is not null), '[]'::json) as ingredients,
    coalesce(json_agg(distinct directions.*) filter (where directions.id is not null), '[]'::json) as directions,
    coalesce(json_agg(distinct cookbooks.*) filter (where cookbooks.id is not null), '[]'::json) as cookbooks,
    recipes.rating,
    recipes.notes,
    recipes.created_at,
    recipes.servings,
    recipes.calories,
    recipes.protein_g,
    recipes.fat_g,
    recipes.carbs_g,
    recipes.macros_confidence
  from recipes
  inner join followers on followers.follows_user_id = recipes.user_id
  left join ingredients on ingredients.recipe_id = recipes.id
  left join directions on directions.recipe_id = recipes.id
  left join recipes_mapping on recipes_mapping.recipe_id = recipes.id
  left join cookbooks on cookbooks.id = recipes_mapping.cookbook_id
  where followers.user_id = p_user_id
  group by recipes.id
) as recipes_data;
$function$;
