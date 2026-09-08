-- Drops the temporary policy added in 20260908003000 now that the one-off
-- orphan cleanup has run: 153 unreferenced files (~28 MB) were removed from the
-- `recipes` bucket, taking it from 281 objects / 40 MB to 128 objects / 12 MB,
-- with all 127 referenced files verified intact.
--
-- Ongoing cleanup no longer needs a broad grant. deleteRecipe() removes a
-- recipe's files before deleting the row, authorized by the narrowly scoped
-- "Recipe owners can delete their recipe files" policy from 20260908001805.

drop policy if exists "tmp_cleanup_unreferenced_recipe_files" on storage.objects;
