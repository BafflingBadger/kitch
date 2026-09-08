-- TEMPORARY. Paired with a follow-up migration that drops this policy again as
-- soon as the one-off orphan cleanup has run. Do not leave this in place.
--
-- 153 files (~28 MB) in the `recipes` bucket are unreferenced: thumbnails and
-- source images left behind by recipes deleted before storage cleanup existed.
-- They cannot be removed through the Storage API because no DELETE policy
-- matches them -- the pre-existing policy requires `.jpg` (these are `.jpeg`),
-- and the owner policy added in 20260908001805 requires the file to still be
-- referenced by one of the caller's recipes, which is exactly what an orphan
-- is not.
--
-- This policy is deliberately written so that it CANNOT authorize deleting a
-- file that is still in use: both NOT EXISTS clauses must hold, so any object
-- referenced by recipes.thumbnail or recipe_source_images.storage_path stays
-- protected regardless of what the caller asks to delete. The placeholder that
-- keeps the `public/` folder visible in the dashboard is also excluded.

create policy "tmp_cleanup_unreferenced_recipe_files"
  on storage.objects
  for delete
  to public
  using (
    bucket_id = 'recipes'
    and name <> 'public/.emptyFolderPlaceholder'
    and not exists (
      select 1 from public.recipes r
      where r.thumbnail = storage.objects.name
    )
    and not exists (
      select 1 from public.recipe_source_images s
      where s.storage_path = storage.objects.name
    )
  );
