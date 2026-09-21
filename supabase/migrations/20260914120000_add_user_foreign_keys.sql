-- `recipes.user_id` and `cookbooks.user_id` were the only user-scoped columns in
-- the schema without a foreign key, so nothing stopped a deleted user's content
-- from outliving them. Because the recipes SELECT policy is `USING (true)`, such
-- rows keep surfacing in Discover and search attributed to an owner that no
-- longer resolves.
--
-- They point at `public.users` rather than `auth.users` -- matching `followers`
-- -- which also registers the relationship with PostgREST, so recipe owners can
-- be fetched as an embed instead of a second round trip.

-- Clear the rows that already got into that state, otherwise the constraint
-- cannot validate. At the time of writing this was 2 recipes (ids 140 and 178)
-- belonging to a user absent from both `public.users` and `auth.users`.
-- Their thumbnails stay behind in the `recipes` bucket and are deleted by hand.
delete from public.recipes r
where not exists (
  select 1 from public.users u where u.id = r.user_id
);

alter table public.recipes
  add constraint recipes_user_id_fkey foreign key (user_id)
  references public.users(id) on update cascade on delete cascade;

alter table public.cookbooks
  add constraint cookbooks_user_id_fkey foreign key (user_id)
  references public.users(id) on update cascade on delete cascade;

-- Postgres does not index foreign key columns automatically, and an unindexed
-- FK turns every cascading delete into a sequential scan.
create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists cookbooks_user_id_idx on public.cookbooks (user_id);
