-- Pre-launch hardening, ahead of opening the web app to the public.
--
-- Every change here closes a cross-user access gap without altering any RPC's
-- signature or result shape: the shipped iOS app calls the same functions and
-- reads the same tables, and must keep working unchanged.

-- ---------------------------------------------------------------------------
-- 1. Storage: no overwriting other people's images
-- ---------------------------------------------------------------------------
-- The old UPDATE policy only checked the bucket, so any signed-in user could
-- upsert over any object in it. Limit it to objects the caller uploaded. Files
-- written by the service role (import-recipe) have no owner and so become
-- immutable from the client, which is what we want.
drop policy if exists "Authenticated users can replace app images" on storage.objects;

create policy "Users can replace their own app images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('recipes', 'profiles')
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id in ('recipes', 'profiles')
    and owner_id = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 2. Storage: no deleting a file another user still uses
-- ---------------------------------------------------------------------------
-- Both delete policies prove ownership by "a row of mine references this
-- object". A row's thumbnail / avatar column is user-writable, so pointing it
-- at a victim's file used to be enough to delete that file.
--
-- An owner_id check can't replace this: imported recipe images are uploaded by
-- the service role and have no owner. And references can't be made unique,
-- because a recipe saved from another user legitimately shares its thumbnail.
-- So: a file may only be deleted once nobody *else* references it. That blocks
-- the attack, and also stops deleting a saved copy from deleting the
-- original's image.
--
-- Security definer because recipe_source_images is only readable by its owner;
-- under the caller's RLS the "anyone else?" check would always see nothing.
create or replace function public.storage_object_shared_with_others(
  p_bucket text,
  p_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_bucket
    when 'recipes' then
      exists (
        select 1 from public.recipes r
        where r.thumbnail = p_name
          and r.user_id is distinct from (select auth.uid())
      )
      or exists (
        select 1
        from public.recipe_source_images s
        join public.recipes r on r.id = s.recipe_id
        where s.storage_path = p_name
          and r.user_id is distinct from (select auth.uid())
      )
    when 'profiles' then
      exists (
        select 1 from public.users u
        where u.id is distinct from (select auth.uid())
          and right(u.profile_pic_url, length(p_name) + 1) = '/' || p_name
      )
    else false
  end;
$$;

revoke all on function public.storage_object_shared_with_others(text, text) from public, anon;
grant execute on function public.storage_object_shared_with_others(text, text) to authenticated;

drop policy if exists "Recipe owners can delete their recipe files" on storage.objects;

create policy "Recipe owners can delete their recipe files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'recipes'
    and (
      exists (
        select 1
        from public.recipes r
        where r.user_id = (select auth.uid())
          and r.thumbnail = storage.objects.name
      )
      or exists (
        select 1
        from public.recipe_source_images s
        join public.recipes r on r.id = s.recipe_id
        where r.user_id = (select auth.uid())
          and s.storage_path = storage.objects.name
      )
    )
    and not public.storage_object_shared_with_others('recipes', storage.objects.name)
  );

drop policy if exists "Users can delete their own profile image" on storage.objects;

create policy "Users can delete their own profile image"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profiles'
    and exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())
        and u.profile_pic_url like '%/storage/v1/object/public/profiles/%'
        -- Suffix compare rather than LIKE on the name: object names are not
        -- escaped, and `_` in a LIKE pattern would match any character.
        and right(u.profile_pic_url, length(storage.objects.name) + 1)
            = '/' || storage.objects.name
    )
    and not public.storage_object_shared_with_others('profiles', storage.objects.name)
  );

-- ---------------------------------------------------------------------------
-- 3. Storage: images only
-- ---------------------------------------------------------------------------
-- Both buckets are public, so an uploaded text/html or image/svg+xml file would
-- be served -- and rendered -- from the storage origin. Existing objects are
-- unaffected. application/octet-stream stays allowed because older iOS builds
-- uploaded with it; browsers download that type rather than render it.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/octet-stream'
]
where id in ('recipes', 'profiles');

-- ---------------------------------------------------------------------------
-- 4. Grocery lists: own and household only
-- ---------------------------------------------------------------------------
-- The SELECT policy was `true` despite its name, so every signed-in user could
-- read every grocery list. Mirror the UPDATE/DELETE policies, which already
-- scope to "mine, or someone in my household" -- iOS household sharing relies
-- on exactly that.
drop policy if exists "Users can read grocery list items from their household" on public.grocery_list;

create policy "Users can read grocery list items from their household"
  on public.grocery_list
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.households h
      where (h.owner_id = grocery_list.user_id or h.member_id = grocery_list.user_id)
        and ((select auth.uid()) = h.owner_id or (select auth.uid()) = h.member_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Legacy definer RPCs: identity checks, and no anonymous callers
-- ---------------------------------------------------------------------------
-- These run as the owner (bypassing RLS) and trusted p_user_id, and the anon
-- key ships in every client. Same signatures and return types; callers asking
-- about someone else now get an empty result.

create or replace function public."MealPlanRecipes_ReadAll"(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns setof public.mealplan_recipe_mapping
language sql
security definer
set search_path = ''
as $$
  select *
  from public.mealplan_recipe_mapping
  where user_id = p_user_id
    and p_user_id = (select auth.uid())
    and date between p_start_date and p_end_date
  order by date, type;
$$;

-- Returns member emails, so callable only for yourself or a member of your own
-- household.
create or replace function public."Households_ReadAllMembers"(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_result json;
begin
  if p_user_id is distinct from (select auth.uid())
     and not exists (
       select 1
       from public.households h
       where ((select auth.uid()) = h.owner_id or (select auth.uid()) = h.member_id)
         and (p_user_id = h.owner_id or p_user_id = h.member_id)
     ) then
    return '[]'::json;
  end if;

  select owner_id into v_owner_id
  from public.households
  where member_id = p_user_id
  limit 1;

  if v_owner_id is null then
    v_owner_id := p_user_id;
  end if;

  select coalesce(json_agg(households_data), '[]'::json)
  into v_result
  from (
    select u.id, u.display_name, u.email, false as is_owner
    from public.households h
    join public.users u on u.id = h.member_id
    where h.owner_id = v_owner_id

    union

    select u.id, u.display_name, u.email, true as is_owner
    from public.users u
    where u.id = v_owner_id
  ) as households_data;

  return coalesce(v_result, '[]'::json);
end;
$$;

revoke execute on function public."MealPlanRecipes_ReadAll"(uuid, date, date) from public, anon;
revoke execute on function public."Households_ReadAllMembers"(uuid) from public, anon;
revoke execute on function public."Cookbooks_ReadAll"(uuid) from public, anon;
revoke execute on function public."Cookbooks_Following_ReadAll"(uuid) from public, anon;
grant execute on function public."MealPlanRecipes_ReadAll"(uuid, date, date) to authenticated;
grant execute on function public."Households_ReadAllMembers"(uuid) to authenticated;
grant execute on function public."Cookbooks_ReadAll"(uuid) to authenticated;
grant execute on function public."Cookbooks_Following_ReadAll"(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Trigger functions are not RPCs
-- ---------------------------------------------------------------------------
-- Exposed at /rest/v1/rpc/* by default. Triggers fire regardless of EXECUTE.
revoke execute on function public."User_AfterInsert"() from public, anon, authenticated;
revoke execute on function public."cookbooks_AFTERINSERT"() from public, anon, authenticated;
revoke execute on function public."cookbooks_AFTERDELETE"() from public, anon, authenticated;
revoke execute on function public."recipes_mapping_BEFOREDELETE"() from public, anon, authenticated;
revoke execute on function public.sync_user_email() from public, anon, authenticated;
revoke execute on function public.unlink_oauth_on_email_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Pin search_path on the remaining legacy functions
-- ---------------------------------------------------------------------------
-- Their bodies use unqualified names that resolve in public today; pinning it
-- keeps that true whatever the caller's search_path is.
alter function public."Cookbooks_Following_ReadAll"(uuid) set search_path = public;
alter function public."Cookbooks_ReadAll"(uuid) set search_path = public;
alter function public."Cookbooks_WriteSortOrder"(jsonb) set search_path = public;
alter function public."Households_JoinHousehold_GetSetupData"(uuid, uuid) set search_path = public;
alter function public."Households_Write"(uuid, uuid) set search_path = public;
alter function public."Recipes_ReadAllFollowing"(uuid) set search_path = public;
alter function public."Recipes_ReadAll"(uuid) set search_path = public;
alter function public."Recipes_Read"(bigint) set search_path = public;
alter function public."Recipe_Write"(integer, uuid, text, text, text, text, text, text, integer, text, text) set search_path = public;
alter function public."Users_ReadAll"() set search_path = public;
alter function public."Users_ReadAllFollowingCookbooks"(uuid) set search_path = public;
alter function public."Users_ReadAllFollowing"(uuid) set search_path = public;
alter function public."Users_Read"(uuid) set search_path = public;
