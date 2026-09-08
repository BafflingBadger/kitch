-- Require authentication to write to Storage.
--
-- `storage.objects` carried two catch-all policies granted to the `public` role:
--
--   INSERT "Enable read access for all users"   with check (true)
--   UPDATE "Enable update access for all users" using (true)
--
-- Granted to `public` with an unconditional predicate, these let an
-- unauthenticated caller holding only the anon key (which ships in every client)
-- upload objects into any bucket and overwrite any existing object -- including
-- replacing users' recipe photos with arbitrary content. The INSERT one is
-- misnamed; it governs writes, not reads.
--
-- Also dropped: the generated "Give anon users access to JPG images..." policies
-- that grant anon INSERT/UPDATE/DELETE. Their `storage.extension(name) = 'jpg'`
-- test never matched anything -- every file written by the edge function and the
-- importer is `.jpeg` -- but the web uploader preserves whatever extension the
-- user's file had, so a `photo.jpg` upload would land squarely in their scope and
-- become anonymously overwritable and deletable. Nothing legitimate acts as
-- `anon` here, so the grants have no consumer to lose.
--
-- Their SELECT counterparts are deliberately left in place: both buckets are
-- public, so readability is intended, and revoking read is a separate decision
-- with a much larger blast radius.
--
-- Safe for current clients, verified against live data before writing this:
--   * The edge function uploads with the service role, which bypasses RLS.
--   * The web uploader (components/recipes/edit/recipe-image-upload.tsx) uses the
--     browser client, so it is `authenticated`, and passes upsert: false, so it
--     needs INSERT only.
--   * iOS uploads have recorded an owner on every object since 2025-04-17,
--     meaning they are authenticated. The 23 owner-less iOS objects all predate
--     that cutover (2025-03-08 to 2025-04-10) and are historical.

drop policy if exists "Enable read access for all users" on storage.objects;
drop policy if exists "Enable update access for all users" on storage.objects;

drop policy if exists "Give anon users access to JPG images in folder 1ige2ga_1" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder hwfxr9_1" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1ige2ga_3" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder hwfxr9_2" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1ige2ga_2" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder hwfxr9_3" on storage.objects;

-- Replacements: same capability, but only for signed-in callers and only in the
-- two buckets this app owns. Objects here are named `public/<uuid>.<ext>` with no
-- per-user prefix, so ownership cannot be expressed in the path; requiring
-- authentication is the meaningful boundary available without renaming history.
create policy "Authenticated users can upload app images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id in ('recipes', 'profiles'));

-- Retained so client-side upsert keeps working. WITH CHECK mirrors USING so a
-- row cannot be moved into a different bucket by an update.
create policy "Authenticated users can replace app images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id in ('recipes', 'profiles'))
  with check (bucket_id in ('recipes', 'profiles'));
