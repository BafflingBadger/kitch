-- Let a recipe's owner delete that recipe's files from the `recipes` bucket, so
-- deleting a recipe can also remove its thumbnail and source images instead of
-- orphaning them.
--
-- The pre-existing DELETE policy on this bucket cannot serve that purpose: it
-- matches only `.jpg` (every file we write is `.jpeg`), only the `public/`
-- folder (source images live under `source/`), and only `auth.role() = 'anon'`
-- (which excludes signed-in users). It is left untouched here.
--
-- Ownership is proven by joining back to `recipes`, which means the recipe row
-- must still exist when the object is deleted. Callers therefore delete storage
-- objects BEFORE deleting the recipe row. The failure mode of that ordering --
-- files removed, then the row delete fails -- leaves a recipe with a missing
-- image, which is recoverable by retrying the delete. The reverse ordering
-- would be unrecoverable: the row is gone and the policy can no longer
-- authorize removing the now-unreferenced files.

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
  );
