-- Retain the original photos / PDF pages used for an AI recipe import.
--
-- Link and social imports keep their provenance for free via recipes.source_url,
-- so a bad extraction can always be re-imported from the original. Photo imports
-- have no such fallback: once the model's output is written, the source is gone.
-- These rows keep the uploaded images addressable so an import can be re-checked
-- or re-parsed later.
--
-- Deliberately NOT used as the recipe thumbnail: a photo of a recipe card is text
-- on paper and reads poorly next to food photography in the cookbook grid.

-- No explicit ordering column: these rows are immutable (there is no update
-- policy below), so page order is fixed at insert time and `order by id`
-- recovers it. created_at cannot serve that role -- now() is transaction-time,
-- so every image from one import shares a timestamp.
create table public.recipe_source_images (
  id bigint generated always as identity primary key,
  recipe_id bigint not null references public.recipes (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

comment on table public.recipe_source_images is
  'Original uploaded photos/PDF pages behind an AI recipe import, kept for provenance and re-parsing. Not the recipe thumbnail.';

-- Every read of this table is by recipe_id (both directly and inside the RLS
-- policies below), and the FK is not indexed implicitly by Postgres.
create index recipe_source_images_recipe_id_idx
  on public.recipe_source_images (recipe_id);

alter table public.recipe_source_images enable row level security;

-- Unlike recipes/ingredients/directions -- which are readable by any authenticated
-- user to support the social "Following" feed -- source images are owner-only.
-- They can be handwritten cards or personal notes, and are not feed content.
create policy "Users can read source images for their own recipes"
  on public.recipe_source_images
  for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_source_images.recipe_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "Users can add source images to their own recipes"
  on public.recipe_source_images
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_source_images.recipe_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "Users can delete source images from their own recipes"
  on public.recipe_source_images
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_source_images.recipe_id
        and r.user_id = (select auth.uid())
    )
  );
