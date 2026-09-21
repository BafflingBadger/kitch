-- The `profiles` bucket had no DELETE policy, so a deleted account left its
-- avatar behind in storage forever.
--
-- Ownership cannot be read off the path: these objects are named `<uuid>.<ext>`
-- at the bucket root, a convention set by the iOS app. What does tie an object
-- to a user is `users.profile_pic_url`, which holds the object's full public
-- URL -- so the policy authorizes deleting exactly the object the caller's own
-- profile currently points at.
--
-- That the check is "currently points at" imposes an ordering on the caller:
-- the object has to be removed while the `public.users` row still references
-- it. Deleting the row first makes its avatar permanently unreachable. Same
-- shape of constraint as the recipes bucket's delete policy.
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
);
