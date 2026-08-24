-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

DROP EXTENSION pg_graphql;

CREATE ROLE supabase_privileged_role;

GRANT supabase_privileged_role TO postgres;

CREATE EXTENSION pgjwt WITH SCHEMA extensions;

CREATE EXTENSION pgsodium;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE TYPE public."Meal Plan Types" AS ENUM (
  'breakfast',
  'lunch',
  'dinner',
  'snack'
);

CREATE TYPE public."Recipe Sort Types" AS ENUM (
  'newest',
  'oldest',
  'highestRated'
);

CREATE FUNCTION public."cookbooks_AFTERDELETE"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  UPDATE public.cookbooks
  SET sort_order = sort_order - 1
  WHERE user_id = OLD.user_id 
    AND sort_order > OLD.sort_order;

  RETURN NULL;
end;
$function$;

GRANT ALL ON FUNCTION public."cookbooks_AFTERDELETE"() TO anon;

GRANT ALL ON FUNCTION public."cookbooks_AFTERDELETE"() TO authenticated;

GRANT ALL ON FUNCTION public."cookbooks_AFTERDELETE"() TO service_role;

CREATE FUNCTION public."cookbooks_AFTERINSERT"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  UPDATE public.cookbooks SET sort_order = (SELECT COUNT(*) FROM public.cookbooks WHERE user_id = OLD.user_id) - 1 WHERE user_id = OLD.user_id;
  RETURN NULL; -- AFTER triggers strictly return NULL
END;
$function$;

GRANT ALL ON FUNCTION public."cookbooks_AFTERINSERT"() TO anon;

GRANT ALL ON FUNCTION public."cookbooks_AFTERINSERT"() TO authenticated;

GRANT ALL ON FUNCTION public."cookbooks_AFTERINSERT"() TO service_role;

CREATE FUNCTION public."Cookbooks_Following_ReadAll" (
  p_user_id uuid
)
  RETURNS TABLE (
    id         bigint,
    user_id    uuid,
    title      character varying,
    thumbnails jsonb
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.title,
        COALESCE(
            jsonb_object_agg(
                ctm."order",
                ctm.recipe_id
            ) FILTER (
                WHERE ctm.recipe_id IS NOT NULL
            ),
            '{}'::jsonb
        ) AS thumbnails
    FROM followers f
    JOIN cookbooks c ON c.id = f.follows_cookbook_id
    LEFT JOIN cookbook_thumbnail_mapping ctm ON c.id = ctm.cookbook_id
    WHERE f.user_id = p_user_id
    GROUP BY c.id, c.user_id, c.title
    
    UNION
    
    -- Gets followed 'All Recipes' cookbooks (no cookbook ID)
    SELECT
        null AS id,
        f.follows_user_id AS user_id,
        'All Recipes' As title,
        COALESCE(
            jsonb_object_agg(
                ctm."order",
                ctm.recipe_id
            ) FILTER (
                WHERE ctm.recipe_id IS NOT NULL
            ),
            '{}'::jsonb
        ) AS thumbnails
    FROM followers f
    LEFT JOIN cookbook_thumbnail_mapping ctm ON ctm.user_id = f.follows_user_id AND ctm.cookbook_id IS NULL
    WHERE f.user_id = p_user_id AND f.follow_type = 'cookbook' and f.follows_cookbook_id IS NULL
    GROUP BY f.follows_user_id;
END;
$function$;

GRANT ALL ON FUNCTION public."Cookbooks_Following_ReadAll"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Cookbooks_Following_ReadAll"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Cookbooks_Following_ReadAll"(uuid) TO service_role;

CREATE FUNCTION public."Cookbooks_ReadAll" (
  p_user_id uuid
)
  RETURNS TABLE (
    id         bigint,
    user_id    uuid,
    title      character varying,
    thumbnails jsonb
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.title,
        COALESCE(
            jsonb_object_agg(
                ctm."order",
                ctm.recipe_id
            ) FILTER (
                WHERE ctm.recipe_id IS NOT NULL
            ),
            '{}'::jsonb
        ) AS thumbnails
    FROM cookbooks c
    LEFT JOIN cookbook_thumbnail_mapping ctm ON c.id = ctm.cookbook_id
    WHERE c.user_id = p_user_id
    GROUP BY c.id, c.user_id, c.title
    ORDER BY c.sort_order, c.id;
END;
$function$;

GRANT ALL ON FUNCTION public."Cookbooks_ReadAll"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Cookbooks_ReadAll"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Cookbooks_ReadAll"(uuid) TO service_role;

CREATE FUNCTION public."Cookbooks_WriteSortOrder" (
  p_payload jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
begin
  update cookbooks as c
  set sort_order = p.sort_order
  from jsonb_to_recordset(p_payload) as p(id bigint, sort_order smallint)
  where c.id = p.id;
end;
$function$;

GRANT ALL ON FUNCTION public."Cookbooks_WriteSortOrder"(jsonb) TO anon;

GRANT ALL ON FUNCTION public."Cookbooks_WriteSortOrder"(jsonb) TO authenticated;

GRANT ALL ON FUNCTION public."Cookbooks_WriteSortOrder"(jsonb) TO service_role;

CREATE FUNCTION public."FamilyPlan_JoinFamily_Accept" (
  p_user_id  uuid,
  p_owner_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
  -- Rule 1: If subscription owner is not actually subscribed
  if not exists (
    select 1 from public.subscriptions where user_id = p_owner_id and status = 'active' and product_id = 'com.kitch.family'
  ) then
    return;
  end if;

  -- Rule 2: If the current user is already a member of the family
  if exists (
    select 1 from public.subscriptions_family where user_id = p_user_id and subscribed_user_id = p_owner_id
  ) then
    return;
  end if;

  -- Rule 3: If the current user is trying to join his own family plan
  if p_user_id = p_owner_id then
    return;
  end if;

  -- Rule 4: If the family plan already has 5 members
  if (select count(*) from public.subscriptions_family where subscribed_user_id = p_owner_id) = 5 then
    return;
  end if;

  insert into public.subscriptions_family (user_id, subscribed_user_id)
  values (p_user_id, p_owner_id);
END;
$function$;

GRANT ALL ON FUNCTION public."FamilyPlan_JoinFamily_Accept"(uuid, uuid) TO anon;

GRANT ALL ON FUNCTION public."FamilyPlan_JoinFamily_Accept"(uuid, uuid) TO authenticated;

GRANT ALL ON FUNCTION public."FamilyPlan_JoinFamily_Accept"(uuid, uuid) TO service_role;

CREATE FUNCTION public."FamilyPlan_JoinFamily_GetSetupData" (
  p_user_id  uuid,
  p_owner_id uuid
)
  RETURNS TABLE (
    error_code   integer,
    display_name character varying
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
  -- Rule 1: If subscription owner is not actually subscribed
  if not exists (
    select 1 from public.subscriptions where user_id = p_owner_id and status = 'active' and product_id = 'com.kitch.family'
  ) then
    return query select 1 as error_code, null::varchar as display_name;
  end if;

  -- Rule 2: If the current user is already a member of the family
  if exists (
    select 1 from public.subscriptions_family where user_id = p_user_id and subscribed_user_id = p_owner_id
  ) then
    return query select 2 as error_code, null::varchar as display_name;
  end if;

  -- Rule 3: If the current user is trying to join his own family plan
  if p_user_id = p_owner_id then
    return query select 3 as error_code, null::varchar as display_name;
  end if;

  -- Rule 4: If the family plan already has 5 members
  if (select count(*) from public.subscriptions_family where subscribed_user_id = p_owner_id) = 5 then
    return query select 4 as error_code, null::varchar as display_name;
  end if;

  -- Rule 6: Otherwise return error_code 0 with display_name
  return query
  select
    0 as error_code,
    coalesce(u.display_name, u.email) as display_name
  from public.users u
  where u.id = p_owner_id;
END;
$function$;

GRANT ALL ON FUNCTION public."FamilyPlan_JoinFamily_GetSetupData"(uuid, uuid) TO anon;

GRANT ALL ON FUNCTION public."FamilyPlan_JoinFamily_GetSetupData"(uuid, uuid) TO authenticated;

GRANT ALL ON FUNCTION public."FamilyPlan_JoinFamily_GetSetupData"(uuid, uuid) TO service_role;

CREATE FUNCTION public."FamilyPlan_ReadAllMembers" (
  p_user_id uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_result json;
BEGIN
    SELECT coalesce(json_agg(familyplan_data), '[]'::json)
    INTO v_result
    FROM (
        SELECT u.id, u.display_name, u.email
        FROM public.subscriptions_family subs
        JOIN public.users u ON u.id = subs.user_id
        WHERE subs.subscribed_user_id = p_user_id
    ) as familyplan_data;

    IF v_result IS NULL THEN
        v_result := '[]'::json;
    END IF;

    RETURN v_result;
END;
$function$;

GRANT ALL ON FUNCTION public."FamilyPlan_ReadAllMembers"(uuid) TO anon;

GRANT ALL ON FUNCTION public."FamilyPlan_ReadAllMembers"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."FamilyPlan_ReadAllMembers"(uuid) TO service_role;

CREATE FUNCTION public."Households_JoinHousehold_GetSetupData" (
  p_owner_id uuid,
  p_user_id  uuid
)
  RETURNS TABLE (
    error_code   integer,
    display_name character varying
  )
  LANGUAGE plpgsql
  AS $function$
begin
  -- Rule 1: If household owner is already a member of another household
  if exists (
    select 1 from public.households h where h.member_id = p_owner_id
  ) then
    return query select 1 as error_code, null::varchar as display_name;
  end if;

  -- Rule 2: If the current user is already a member of the owner's household
  if exists (
    select 1 from public.households h where h.member_id = p_user_id and h.owner_id = p_owner_id
  ) then
    return query select 2 as error_code, null::varchar as display_name;
  end if;

  -- Rule 3: If the current user is a member of another household
  if exists (
    select 1 from public.households h where h.member_id = p_user_id
  ) and not exists (
    select 1 from public.households h where h.owner_id = p_owner_id
  ) then
    return query select 3 as error_code, null::varchar as display_name;
  end if;

  -- Rule 4: If the current user is already a household owner
  if exists (
    select 1 from public.households h where h.owner_id = p_user_id
  ) then
    return query select 4 as error_code, null::varchar as display_name;
  end if;

  -- Rule 5: If the current user is trying to join his own household
  if p_user_id = p_owner_id then
    return query select 5 as error_code, null::varchar as display_name;
  end if;

  -- Rule 6: Otherwise return error_code 0 with display_name
  return query
  select
    0 as error_code,
    coalesce(u.display_name, u.email) as display_name
  from public.users u
  where u.id = p_owner_id;

end;
$function$;

GRANT ALL ON FUNCTION public."Households_JoinHousehold_GetSetupData"(uuid, uuid) TO anon;

GRANT ALL ON FUNCTION public."Households_JoinHousehold_GetSetupData"(uuid, uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Households_JoinHousehold_GetSetupData"(uuid, uuid) TO service_role;

CREATE FUNCTION public."Households_ReadAllMembers" (
  p_user_id uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_owner_id uuid;
    v_result json;
BEGIN
    SELECT owner_id INTO v_owner_id
    FROM public.households
    WHERE member_id = p_user_id
    LIMIT 1;

    IF v_owner_id IS NULL THEN
        SELECT p_user_id INTO v_owner_id;
    END IF;

    SELECT coalesce(json_agg(households_data), '[]'::json)
    INTO v_result
    FROM (
        SELECT u.id, u.display_name, u.email, false AS is_owner
        FROM public.households h
        JOIN public.users u ON u.id = h.member_id
        WHERE h.owner_id = v_owner_id
        
        UNION
        
        SELECT id, display_name, email, true AS is_owner
        FROM public.users
        WHERE id = v_owner_id
    ) as households_data;

    IF v_result IS NULL THEN
        v_result := '[]'::json;
    END IF;
    RETURN v_result;
END;
$function$;

GRANT ALL ON FUNCTION public."Households_ReadAllMembers"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Households_ReadAllMembers"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Households_ReadAllMembers"(uuid) TO service_role;

CREATE FUNCTION public."Households_Write" (
  p_owner_id uuid,
  p_user_id  uuid
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$begin
    insert into public.households (owner_id, member_id)
    values (p_owner_id, p_user_id);
end;$function$;

GRANT ALL ON FUNCTION public."Households_Write"(uuid, uuid) TO anon;

GRANT ALL ON FUNCTION public."Households_Write"(uuid, uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Households_Write"(uuid, uuid) TO service_role;

CREATE FUNCTION public."Recipe_Write" (
  _id           integer,
  _user_id      uuid,
  _name         text,
  _thumbnail    text,
  _source_url   text,
  _request      text,
  _response     text,
  _cookbook_ids text,
  _rating       integer,
  _notes        text,
  _source_text  text
)
  RETURNS integer
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_cookbook_ids_array TEXT[];
    v_cookbook_id_text TEXT;
    v_cookbook_id INT;
BEGIN
    IF _id > 0 THEN
        -- Update the existing recipe
        UPDATE recipes
        SET user_id = _user_id,
            name = _name,
            thumbnail = _thumbnail,
            source_url = _source_url,
            rating = _rating,
            notes = _notes
        WHERE id = _id;
    ELSE
        -- Insert a new recipe
        INSERT INTO recipes (user_id, name, thumbnail, source_url, request, response, rating, notes, source_text)
        VALUES (_user_id, _name, _thumbnail, _source_url, _request, _response, _rating, _notes, _source_text)
        RETURNING id INTO _id;
    END IF;

    -- Convert the comma-separated string into an array of text values.
    v_cookbook_ids_array := string_to_array(_cookbook_ids, ',');
    
    -- Delete mappings for this recipe where the cookbook_id is NOT in the new list.
    DELETE FROM recipes_mapping
    WHERE recipe_id = _id
      AND cookbook_id NOT IN (
          SELECT (trim(value))::INT FROM unnest(v_cookbook_ids_array) AS value
      );
    
    -- Insert new mapping records, using ON CONFLICT DO NOTHING to skip duplicates.
    FOREACH v_cookbook_id_text IN ARRAY v_cookbook_ids_array LOOP
        v_cookbook_id := trim(v_cookbook_id_text)::INT;
        INSERT INTO recipes_mapping (recipe_id, cookbook_id)
        VALUES (_id, v_cookbook_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN _id;
END;
$function$;

GRANT ALL ON FUNCTION public."Recipe_Write"(integer, uuid, text, text, text, text, text, text, integer, text, text) TO anon;

GRANT ALL ON FUNCTION public."Recipe_Write"(integer, uuid, text, text, text, text, text, text, integer, text, text) TO authenticated;

GRANT ALL ON FUNCTION public."Recipe_Write"(integer, uuid, text, text, text, text, text, text, integer, text, text) TO service_role;

CREATE FUNCTION public."recipes_mapping_BEFOREDELETE"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  DELETE FROM public.cookbook_thumbnail_mapping WHERE cookbook_id = OLD.cookbook_id AND recipe_id = OLD.recipe_id;
  RETURN OLD;
end;
$function$;

GRANT ALL ON FUNCTION public."recipes_mapping_BEFOREDELETE"() TO anon;

GRANT ALL ON FUNCTION public."recipes_mapping_BEFOREDELETE"() TO authenticated;

GRANT ALL ON FUNCTION public."recipes_mapping_BEFOREDELETE"() TO service_role;

CREATE FUNCTION public."Recipes_Read" (
  _recipe_id bigint
)
  RETURNS json
  LANGUAGE sql
  STABLE
  AS $function$
SELECT row_to_json(recipes_data)
  FROM (
    SELECT 
      recipes.id, 
      recipes.user_id, 
      recipes.name,
      recipes.thumbnail,
      recipes.source_url,
      recipes.source_text,
      COALESCE(json_agg(DISTINCT ingredients.*) FILTER (WHERE ingredients.id IS NOT NULL), '[]'::json) AS ingredients,
      COALESCE(json_agg(DISTINCT directions.*) FILTER (WHERE directions.id IS NOT NULL), '[]'::json) AS directions,
      COALESCE(json_agg(DISTINCT cookbooks.*) FILTER (WHERE cookbooks.id IS NOT NULL), '[]'::json) AS cookbooks,
      recipes.rating,
      recipes.notes,
      recipes.created_at
    FROM recipes
    LEFT JOIN ingredients ON ingredients.recipe_id = recipes.id
    LEFT JOIN directions ON directions.recipe_id = recipes.id
    LEFT JOIN recipes_mapping ON recipes_mapping.recipe_id = recipes.id
    LEFT JOIN cookbooks ON cookbooks.id = recipes_mapping.cookbook_id
    WHERE recipes.id = _recipe_id
    GROUP BY recipes.id
  ) AS recipes_data;
$function$;

GRANT ALL ON FUNCTION public."Recipes_Read"(bigint) TO anon;

GRANT ALL ON FUNCTION public."Recipes_Read"(bigint) TO authenticated;

GRANT ALL ON FUNCTION public."Recipes_Read"(bigint) TO service_role;

CREATE FUNCTION public."Recipes_ReadAll" (
  _user_id uuid
)
  RETURNS json
  LANGUAGE sql
  STABLE
  AS $function$
SELECT coalesce(json_agg(recipes_data), '[]'::json)
  FROM (
    SELECT 
      recipes.id, 
      recipes.user_id, 
      recipes.name,
      recipes.thumbnail,
      recipes.source_url,
      recipes.source_text,
      COALESCE(json_agg(DISTINCT ingredients.*) FILTER (WHERE ingredients.id IS NOT NULL), '[]'::json) AS ingredients,
      COALESCE(json_agg(DISTINCT directions.*) FILTER (WHERE directions.id IS NOT NULL), '[]'::json) AS directions,
      COALESCE(json_agg(DISTINCT cookbooks.*) FILTER (WHERE cookbooks.id IS NOT NULL), '[]'::json) AS cookbooks,
      recipes.rating,
      recipes.notes,
      recipes.created_at
    FROM recipes
    LEFT JOIN ingredients ON ingredients.recipe_id = recipes.id
    LEFT JOIN directions ON directions.recipe_id = recipes.id
    LEFT JOIN recipes_mapping ON recipes_mapping.recipe_id = recipes.id
    LEFT JOIN cookbooks ON cookbooks.id = recipes_mapping.cookbook_id
    WHERE recipes.user_id = _user_id
    GROUP BY recipes.id
  ) AS recipes_data;
$function$;

GRANT ALL ON FUNCTION public."Recipes_ReadAll"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Recipes_ReadAll"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Recipes_ReadAll"(uuid) TO service_role;

CREATE FUNCTION public."Recipes_ReadAllFollowing" (
  p_user_id uuid
)
  RETURNS json
  LANGUAGE sql
  STABLE
  AS $function$
SELECT coalesce(json_agg(recipes_data), '[]'::json)
FROM (
  SELECT 
    recipes.id, 
    recipes.user_id, 
    recipes.name,
    recipes.thumbnail,
    recipes.source_url,
    recipes.source_text,
    COALESCE(json_agg(DISTINCT ingredients.*) FILTER (WHERE ingredients.id IS NOT NULL), '[]'::json) AS ingredients,
    COALESCE(json_agg(DISTINCT directions.*) FILTER (WHERE directions.id IS NOT NULL), '[]'::json) AS directions,
    COALESCE(json_agg(DISTINCT cookbooks.*) FILTER (WHERE cookbooks.id IS NOT NULL), '[]'::json) AS cookbooks,
    recipes.rating,
    recipes.notes,
    recipes.created_at
  FROM recipes
  INNER JOIN followers ON followers.follows_user_id = recipes.user_id
  LEFT JOIN ingredients ON ingredients.recipe_id = recipes.id
  LEFT JOIN directions ON directions.recipe_id = recipes.id
  LEFT JOIN recipes_mapping ON recipes_mapping.recipe_id = recipes.id
  LEFT JOIN cookbooks ON cookbooks.id = recipes_mapping.cookbook_id
  WHERE followers.user_id = p_user_id
  GROUP BY recipes.id
) AS recipes_data;
$function$;

GRANT ALL ON FUNCTION public."Recipes_ReadAllFollowing"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Recipes_ReadAllFollowing"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Recipes_ReadAllFollowing"(uuid) TO service_role;

CREATE FUNCTION public."Subscriptions_GetStatus" (
  p_user_id uuid
)
  RETURNS TABLE (
    status     text,
    product_id text
  )
  LANGUAGE plpgsql
  AS $function$
declare
  v_status text;
  v_product_id text;
begin
  select
    s.status,
    s.product_id
  into
    v_status,
    v_product_id
  from public.subscriptions s
  where s.user_id = p_user_id;

  -- If user does not have an active subscription, check to see if they are on a family plan
  if v_status is null or v_status != 'active' then
    select
      subs.status,
      ''
    into
      v_status,
      v_product_id
    from public.subscriptions subs join public.subscriptions_family fam on fam.subscribed_user_id = subs.user_id and subs.product_id = 'com.kitch.family'
    where fam.user_id = p_user_id and subs.status = 'active';
  end if;

  if v_status is null or v_status != 'active' then
    -- return no rows
    RETURN QUERY
    SELECT
      NULL::text AS status,
      NULL::text AS product_id
    WHERE false;
  else
    RETURN QUERY
    SELECT v_status as status, v_product_id as product_id;
  end if;
END;
$function$;

GRANT ALL ON FUNCTION public."Subscriptions_GetStatus"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Subscriptions_GetStatus"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Subscriptions_GetStatus"(uuid) TO service_role;

CREATE FUNCTION public."User_AfterInsert"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$begin
  insert into public.user_settings (user_id, sort_type_recipe)
  values (new.id, 'newest');

  insert into public.users(id, first_name, last_name, email)
  values (new.id, NULL, NULL, new.email);
  
  return new;
end;$function$;

CREATE TRIGGER "User_AfterInsert"
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public."User_AfterInsert"();

GRANT ALL ON FUNCTION public."User_AfterInsert"() TO anon;

GRANT ALL ON FUNCTION public."User_AfterInsert"() TO authenticated;

GRANT ALL ON FUNCTION public."User_AfterInsert"() TO service_role;

CREATE FUNCTION public."Users_Read" (
  p_user_id uuid
)
  RETURNS json
  LANGUAGE sql
  STABLE
  AS $function$
select to_json(u)
from (
  select
    users.*,
    (
      select count(*)
      from recipes
      where recipes.user_id = users.id and (recipes.request is not null)
    ) as imported_recipe_count,
    (
      select count(*)
      from followers
      where followers.follows_user_id = users.id
      and followers.follow_type = 'user'
    ) as follower_count,
    (
      select count(*)
      from followers
      where followers.user_id = users.id
      and followers.follow_type = 'user'
    ) as following_count,
    (
      select count(*)
      from recipes
      where recipes.user_id = users.id
    ) as recipe_count
  from users
  where users.id = p_user_id
  limit 1
) u;
$function$;

GRANT ALL ON FUNCTION public."Users_Read"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Users_Read"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Users_Read"(uuid) TO service_role;

CREATE FUNCTION public."Users_ReadAll"()
  RETURNS json
  LANGUAGE sql
  STABLE
  AS $function$
select coalesce(json_agg(u), '[]'::json)
from (
  select
    users.*,
    0 as imported_recipe_count,
    (
      select count(*) from followers 
      where followers.follows_user_id = users.id 
      and followers.follow_type = 'user'
    ) as follower_count,
    (
      select count(*) from followers 
      where followers.user_id = users.id 
      and followers.follow_type = 'user'
    ) as following_count,
    (
      select count(*) from recipes 
      where recipes.user_id = users.id
    ) as recipe_count
  from users
) u;
$function$;

GRANT ALL ON FUNCTION public."Users_ReadAll"() TO anon;

GRANT ALL ON FUNCTION public."Users_ReadAll"() TO authenticated;

GRANT ALL ON FUNCTION public."Users_ReadAll"() TO service_role;

CREATE FUNCTION public."Users_ReadAllFollowing" (
  p_user_id uuid
)
  RETURNS json
  LANGUAGE sql
  STABLE
  AS $function$
select coalesce(json_agg(u), '[]'::json)
from (
  select
    users.*,
    0 as imported_recipe_count,
    (
      select count(*) from followers 
      where followers.follows_user_id = users.id 
      and followers.follow_type = 'user'
    ) as follower_count,
    (
      select count(*) from followers 
      where followers.user_id = users.id 
      and followers.follow_type = 'user'
    ) as following_count,
    (
      select count(*) from recipes 
      where recipes.user_id = users.id
    ) as recipe_count
  from users
  join followers on followers.follows_user_id = users.id
  where followers.user_id = p_user_id
  and followers.follow_type = 'user'
) u;
$function$;

GRANT ALL ON FUNCTION public."Users_ReadAllFollowing"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Users_ReadAllFollowing"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Users_ReadAllFollowing"(uuid) TO service_role;

CREATE FUNCTION public."Users_ReadAllFollowingCookbooks" (
  p_user_id uuid
)
  RETURNS json
  LANGUAGE sql
  STABLE
  AS $function$
select coalesce(json_agg(u), '[]'::json)
from (
  select distinct on (users.id)
    users.*,
    0 as imported_recipe_count,
    (
      select count(*) from followers 
      where followers.follows_user_id = users.id 
      and followers.follow_type = 'user'
    ) as follower_count,
    (
      select count(*) from followers 
      where followers.user_id = users.id 
      and followers.follow_type = 'user'
    ) as following_count,
    (
      select count(*) from recipes 
      where recipes.user_id = users.id
    ) as recipe_count
  from users
  join followers 
    on followers.follows_user_id = users.id
  where followers.user_id = p_user_id
    and followers.follow_type = 'cookbook'
  order by users.id
) u;
$function$;

GRANT ALL ON FUNCTION public."Users_ReadAllFollowingCookbooks"(uuid) TO anon;

GRANT ALL ON FUNCTION public."Users_ReadAllFollowingCookbooks"(uuid) TO authenticated;

GRANT ALL ON FUNCTION public."Users_ReadAllFollowingCookbooks"(uuid) TO service_role;

CREATE TABLE public.android_waitlist (
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  email      text                     NOT NULL
);

ALTER TABLE public.android_waitlist
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.android_waitlist
  ADD CONSTRAINT android_waitlist_pkey PRIMARY KEY (email);

GRANT ALL ON public.android_waitlist TO anon;

GRANT ALL ON public.android_waitlist TO authenticated;

GRANT ALL ON public.android_waitlist TO service_role;

CREATE TABLE public.cookbook_thumbnail_mapping (
  id          bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  cookbook_id bigint,
  recipe_id   bigint                   NOT NULL,
  "order"     smallint                 NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  user_id     uuid                     NOT NULL
);

ALTER TABLE public.cookbook_thumbnail_mapping
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cookbook_thumbnail_mapping
  ADD CONSTRAINT cookbook_thumbnail_mapping_pkey PRIMARY KEY (id);

ALTER TABLE public.cookbook_thumbnail_mapping
  ADD CONSTRAINT cookbook_thumbnail_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.cookbook_thumbnail_mapping TO anon;

GRANT ALL ON public.cookbook_thumbnail_mapping TO authenticated;

GRANT ALL ON public.cookbook_thumbnail_mapping TO service_role;

CREATE POLICY "Enable read access for all users" ON public.cookbook_thumbnail_mapping
  FOR SELECT
  USING (true);

CREATE TABLE public.cookbooks (
  id         bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  user_id    uuid                     NOT NULL,
  title      character varying        NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sort_order smallint                 DEFAULT '0'::smallint NOT NULL
);

CREATE POLICY "Only the cookbook owner can insert, update, and delete" ON public.cookbook_thumbnail_mapping
  TO authenticated
  USING ((cookbook_id IN ( SELECT cookbooks.id
   FROM public.cookbooks
  WHERE (cookbooks.user_id = auth.uid()))))
  WITH CHECK ((cookbook_id IN ( SELECT cookbooks.id
   FROM public.cookbooks
  WHERE (cookbooks.user_id = auth.uid()))));

ALTER TABLE public.cookbooks
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cookbooks
  ADD CONSTRAINT cookbooks_pkey PRIMARY KEY (id);

ALTER TABLE public.cookbook_thumbnail_mapping
  ADD CONSTRAINT cookbook_thumbnail_mapping_cookbook_id_fkey FOREIGN KEY (cookbook_id) REFERENCES public.cookbooks(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.cookbooks TO anon;

GRANT ALL ON public.cookbooks TO authenticated;

GRANT ALL ON public.cookbooks TO service_role;

CREATE TRIGGER cookbooks_afterdelete
  AFTER DELETE ON public.cookbooks
  FOR EACH ROW
  EXECUTE FUNCTION public."cookbooks_AFTERDELETE"();

CREATE TRIGGER cookbooks_afterinsert
  AFTER INSERT ON public.cookbooks
  FOR EACH ROW
  EXECUTE FUNCTION public."cookbooks_AFTERINSERT"();

CREATE POLICY "Authenticated users can read cookbooks" ON public.cookbooks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own cookbooks" ON public.cookbooks
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can delete their own cookbooks" ON public.cookbooks
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update their own cookbooks" ON public.cookbooks
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.directions (
  id         bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  recipe_id  bigint                   NOT NULL,
  "order"    integer                  NOT NULL,
  "desc"     character varying        NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  is_heading boolean
);

ALTER TABLE public.directions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.directions
  ADD CONSTRAINT directions_pkey PRIMARY KEY (id);

GRANT ALL ON public.directions TO anon;

GRANT ALL ON public.directions TO authenticated;

GRANT ALL ON public.directions TO service_role;

CREATE POLICY "Authenticated users can read directions" ON public.directions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE public.exception_log (
  id            bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  error_message text,
  error_details jsonb,
  context       text,
  file          text,
  function      text,
  line          integer,
  created_at    timestamp with time zone DEFAULT now() NOT NULL,
  source        text,
  user_id       uuid
);

ALTER TABLE public.exception_log
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exception_log
  ADD CONSTRAINT exception_log_pkey PRIMARY KEY (id);

GRANT ALL ON public.exception_log TO anon;

GRANT ALL ON public.exception_log TO authenticated;

GRANT ALL ON public.exception_log TO service_role;

CREATE TABLE public.followers (
  id                  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id             uuid                     NOT NULL,
  follows_user_id     uuid                     NOT NULL,
  created_at          timestamp with time zone DEFAULT now() NOT NULL,
  follows_cookbook_id bigint,
  follow_type         text                     DEFAULT ''::text NOT NULL
);

ALTER TABLE public.followers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.followers
  ADD CONSTRAINT followers_follows_cookbook_id_fkey FOREIGN KEY (follows_cookbook_id) REFERENCES public.cookbooks(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.followers
  ADD CONSTRAINT followers_pkey PRIMARY KEY (id);

GRANT ALL ON public.followers TO anon;

GRANT ALL ON public.followers TO authenticated;

GRANT ALL ON public.followers TO service_role;

CREATE POLICY "Users can add users to their following" ON public.followers
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can read the followers of any user" ON public.followers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can remove users from their following" ON public.followers
  FOR DELETE
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.grocery_list (
  id         bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  user_id    uuid                     DEFAULT gen_random_uuid(),
  name       character varying        NOT NULL,
  checked    boolean                  DEFAULT false NOT NULL,
  checked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  keyword    character varying,
  quantity   character varying
);

ALTER TABLE public.grocery_list
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.grocery_list
  ADD CONSTRAINT grocery_list_pkey PRIMARY KEY (id);

ALTER TABLE public.grocery_list
  ADD CONSTRAINT grocery_list_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.grocery_list TO anon;

GRANT ALL ON public.grocery_list TO authenticated;

GRANT ALL ON public.grocery_list TO service_role;

CREATE POLICY "Users can add items to their own grocery list" ON public.grocery_list
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can read grocery list items from their household" ON public.grocery_list
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE public.households (
  id         bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  owner_id   uuid                     NOT NULL,
  member_id  uuid                     NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "Users can delete grocery items that belong to household members" ON public.grocery_list
  FOR DELETE
  TO authenticated
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.households
  WHERE
    (((households.owner_id = grocery_list.user_id) OR (households.member_id = grocery_list.user_id)) AND ((auth.uid() = households.owner_id) OR (auth.uid() =
    households.member_id)))))));

CREATE POLICY "Users can update grocery items that belong to a household membe" ON public.grocery_list
  FOR UPDATE
  TO authenticated
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.households
  WHERE
    (((households.owner_id = grocery_list.user_id) OR (households.member_id = grocery_list.user_id)) AND ((auth.uid() = households.owner_id) OR (auth.uid() =
    households.member_id)))))))
  WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.households
  WHERE
    (((households.owner_id = grocery_list.user_id) OR (households.member_id = grocery_list.user_id)) AND ((auth.uid() = households.owner_id) OR (auth.uid() =
    households.member_id)))))));

ALTER TABLE public.households
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.households
  ADD CONSTRAINT households_member_id_fkey FOREIGN KEY (member_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.households
  ADD CONSTRAINT households_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.households
  ADD CONSTRAINT households_pkey PRIMARY KEY (id);

GRANT ALL ON public.households TO anon;

GRANT ALL ON public.households TO authenticated;

GRANT ALL ON public.households TO service_role;

CREATE POLICY "Household members can remove themselves from their household" ON public.households
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = member_id));

CREATE POLICY "Household owners can remove anyone from their household" ON public.households
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY "Users can add themselves to a household" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));

CREATE POLICY "Users can read users in their household" ON public.households
  FOR SELECT
  TO authenticated
  USING (((( SELECT auth.uid() AS uid) = owner_id) OR (( SELECT auth.uid() AS uid) = member_id)));

CREATE TABLE public.ingredients (
  id          bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  recipe_id   bigint                   NOT NULL,
  "order"     integer                  NOT NULL,
  "desc"      character varying        NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  is_heading  boolean,
  keyword     character varying,
  measurement character varying
);

ALTER TABLE public.ingredients
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);

GRANT ALL ON public.ingredients TO anon;

GRANT ALL ON public.ingredients TO authenticated;

GRANT ALL ON public.ingredients TO service_role;

CREATE POLICY "Users can read ingredients from any recipe" ON public.ingredients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE public.mealplan_recipe_mapping (
  id         bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  user_id    uuid                     NOT NULL,
  recipe_id  integer                  NOT NULL,
  date       date                     NOT NULL,
  type       public."Meal Plan Types" NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE FUNCTION public."MealPlanRecipes_ReadAll" (
  p_user_id    uuid,
  p_start_date date,
  p_end_date   date
)
  RETURNS SETOF public.mealplan_recipe_mapping
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
  select *
  from public.mealplan_recipe_mapping
  where user_id = p_user_id
    and date between p_start_date and p_end_date
  order by date, type;
$function$;

GRANT ALL ON FUNCTION public."MealPlanRecipes_ReadAll"(uuid, date, date) TO anon;

GRANT ALL ON FUNCTION public."MealPlanRecipes_ReadAll"(uuid, date, date) TO authenticated;

GRANT ALL ON FUNCTION public."MealPlanRecipes_ReadAll"(uuid, date, date) TO service_role;

ALTER TABLE public.mealplan_recipe_mapping
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mealplan_recipe_mapping
  ADD CONSTRAINT mealplan_recipe_mapping_pkey PRIMARY KEY (id);

ALTER TABLE public.mealplan_recipe_mapping
  ADD CONSTRAINT mealplan_recipe_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.mealplan_recipe_mapping TO anon;

GRANT ALL ON public.mealplan_recipe_mapping TO authenticated;

GRANT ALL ON public.mealplan_recipe_mapping TO service_role;

CREATE POLICY "Users can add recipes to their meal plan" ON public.mealplan_recipe_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can read their own meal plans" ON public.mealplan_recipe_mapping
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can remove recipes from their meal plan" ON public.mealplan_recipe_mapping
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.recipes (
  id          bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  user_id     uuid                     NOT NULL,
  name        character varying        NOT NULL,
  thumbnail   text,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  source_url  character varying,
  request     text,
  response    text,
  rating      integer                  DEFAULT 0,
  notes       text,
  source_text text                     DEFAULT ''::text NOT NULL
);

CREATE POLICY "Users can create directions for their own recipes" ON public.directions
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = directions.recipe_id) AND (recipes.user_id = auth.uid())))));

CREATE POLICY "Users can delete directions from their own recipes" ON public.directions
  FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = directions.recipe_id) AND (recipes.user_id = auth.uid())))));

CREATE POLICY "Users can update directions for their own recipes" ON public.directions
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = directions.recipe_id) AND (recipes.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = directions.recipe_id) AND (recipes.user_id = auth.uid())))));

CREATE POLICY "Users can add ingredients to their own recipes" ON public.ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = ingredients.recipe_id) AND (recipes.user_id = auth.uid())))));

CREATE POLICY "Users can delete ingredients from their own recipes" ON public.ingredients
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = ingredients.recipe_id) AND (recipes.user_id = auth.uid())))));

CREATE POLICY "Users can update ingredients in their own recipes" ON public.ingredients
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = ingredients.recipe_id) AND (recipes.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.recipes
  WHERE ((recipes.id = ingredients.recipe_id) AND (recipes.user_id = auth.uid())))));

ALTER TABLE public.recipes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);

ALTER TABLE public.cookbook_thumbnail_mapping
  ADD CONSTRAINT cookbook_thumbnail_mapping_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.directions
  ADD CONSTRAINT directions_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.mealplan_recipe_mapping
  ADD CONSTRAINT mealplan_recipe_mapping_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.recipes TO anon;

GRANT ALL ON public.recipes TO authenticated;

GRANT ALL ON public.recipes TO service_role;

CREATE POLICY "Authenticated users can read any recipe" ON public.recipes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own recipes" ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can delete their own recipes" ON public.recipes
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update their own recipes" ON public.recipes
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.recipes_mapping (
  id          bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  cookbook_id bigint                   NOT NULL,
  recipe_id   bigint                   NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.recipes_mapping
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recipes_mapping
  ADD CONSTRAINT recipes_mapping_cookbook_id_fkey FOREIGN KEY (cookbook_id) REFERENCES public.cookbooks(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.recipes_mapping
  ADD CONSTRAINT recipes_mapping_pkey PRIMARY KEY (id, cookbook_id, recipe_id);

ALTER TABLE public.recipes_mapping
  ADD CONSTRAINT recipes_mapping_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.recipes_mapping TO anon;

GRANT ALL ON public.recipes_mapping TO authenticated;

GRANT ALL ON public.recipes_mapping TO service_role;

CREATE TRIGGER recipes_mapping_beforedelete
  BEFORE DELETE ON public.recipes_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public."recipes_mapping_BEFOREDELETE"();

CREATE POLICY "Users can add recipes to their own cookbooks" ON public.recipes_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cookbooks
  WHERE ((cookbooks.id = recipes_mapping.cookbook_id) AND (cookbooks.user_id = auth.uid())))));

CREATE POLICY "Users can read recipes for any cookbook" ON public.recipes_mapping
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can remove recipes from their own cookbook" ON public.recipes_mapping
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.cookbooks
  WHERE ((cookbooks.id = recipes_mapping.cookbook_id) AND (cookbooks.user_id = auth.uid())))));

CREATE TABLE public.subscriptions (
  user_id                 uuid                     NOT NULL,
  original_transaction_id text                     NOT NULL,
  product_id              text                     NOT NULL,
  status                  text                     NOT NULL,
  expiration_date         timestamp with time zone NOT NULL,
  created_at              timestamp with time zone DEFAULT now() NOT NULL,
  updated_at              timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (user_id);

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

GRANT ALL ON public.subscriptions TO anon;

GRANT ALL ON public.subscriptions TO authenticated;

GRANT ALL ON public.subscriptions TO service_role;

CREATE POLICY "Users can read their own subscription record" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.subscriptions_family (
  user_id            uuid                     NOT NULL,
  subscribed_user_id uuid                     NOT NULL,
  created_at         timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "Users can read the subscription if they are part of the family " ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.subscriptions_family sf
  WHERE ((sf.user_id = auth.uid()) AND (sf.subscribed_user_id = subscriptions.user_id)))));

ALTER TABLE public.subscriptions_family
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions_family
  ADD CONSTRAINT subscriptions_family_pkey PRIMARY KEY (user_id);

GRANT ALL ON public.subscriptions_family TO anon;

GRANT ALL ON public.subscriptions_family TO authenticated;

GRANT ALL ON public.subscriptions_family TO service_role;

CREATE POLICY "Enable user to delete their own data" ON public.subscriptions_family
  FOR DELETE
  TO authenticated
  USING (((( SELECT auth.uid() AS uid) = subscribed_user_id) OR (( SELECT auth.uid() AS uid) = user_id)));

CREATE POLICY "Enable users to view their own data only" ON public.subscriptions_family
  FOR SELECT
  TO authenticated
  USING (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.uid() AS uid) = subscribed_user_id)));

CREATE TABLE public.user_settings (
  id               integer                    GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at       timestamp with time zone   DEFAULT now() NOT NULL,
  sort_type_recipe public."Recipe Sort Types" DEFAULT 'newest'::public."Recipe Sort Types",
  user_id          uuid                       NOT NULL
);

COMMENT ON COLUMN public.user_settings.sort_type_recipe IS '0 = Newest, 1 = Oldest, 2 = Highest Rated';

ALTER TABLE public.user_settings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.user_settings TO anon;

GRANT ALL ON public.user_settings TO authenticated;

GRANT ALL ON public.user_settings TO service_role;

CREATE POLICY "Users can read their own settings" ON public.user_settings
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.users (
  id              uuid                     NOT NULL,
  display_name    character varying        NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  email           character varying        NOT NULL,
  profile_pic_url text,
  username        text                     NOT NULL
);

ALTER TABLE public.users
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.followers
  ADD CONSTRAINT followers_follows_user_id_fkey1 FOREIGN KEY (follows_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.followers
  ADD CONSTRAINT followers_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.subscriptions_family
  ADD CONSTRAINT subscriptions_family_subscribed_user_id_fkey FOREIGN KEY (subscribed_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.subscriptions_family
  ADD CONSTRAINT subscriptions_family_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.users TO anon;

GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.users TO service_role;

CREATE POLICY "Authenticated users can read all users" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own user record" ON public.users
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Users cannot be created from the client" ON public.users
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Users cannot be deleted from the client" ON public.users
  FOR DELETE
  USING (false);
