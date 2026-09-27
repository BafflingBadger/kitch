-- Lifetime count of recipe imports per user, for the free plan's 10-import cap.
--
-- Why a counter and not `select count(*) from recipes`:
--
--   1. Only *imports* count against the cap -- recipes written from scratch are
--      free -- and `public.recipes` has no column that reliably distinguishes
--      them. `request` (the OpenAI call log) looks like a marker but is not: 8
--      of the 133 rows in production are genuine Instagram/Facebook imports
--      with `request is null`, predating request logging, and iOS writes manual
--      recipes through the same `Recipe_Write` RPC with `_request => null`.
--   2. Counting rows would refund a slot every time someone deleted a recipe,
--      which is not what "10 free imports" means.
--
-- Deliberately not backfilled. A missing row reads as zero, so every existing
-- user starts with a full allowance rather than being retroactively charged for
-- recipes they imported before the cap was enforced anywhere.
create table public.import_usage (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  import_count integer not null default 0 check (import_count >= 0),
  updated_at   timestamptz not null default now()
);

alter table public.import_usage enable row level security;

create policy "Users can read their own import usage"
  on public.import_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No write policy: the counter is only ever moved by `public.imports_record()`,
-- a definer function called from the `import-recipe` edge function after a
-- recipe has actually been written. A client that could update this row could
-- give itself unlimited imports.
