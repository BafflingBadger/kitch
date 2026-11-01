# Kitch backend contract

Shared by both Kitch codebases. Imported by the `CLAUDE.md` in each repo:

- **Web**: `~/Projects/kitch` (Next.js, `https://www.cookwithkitch.com`)
- **iOS**: `~/Projects/kitch-ios` (Swift, supabase-swift)

Both hit **one Supabase project** (`qopqoiphwsufpynuzilx`): the same tables,
RPCs, storage buckets and edge functions.

**The web repo owns the backend.** Migrations live in
`~/Projects/kitch/supabase/migrations` and edge functions in
`~/Projects/kitch/supabase/functions`. The iOS repo has no migrations or
functions of its own. Never add any there.

Paths below are relative to the web repo root.

## Treat the backend as public API

The shipped iOS app can't be changed instantly, since old builds stay in use for
months. So:

- Changing a shared RPC's signature or return shape, or the behaviour of
  `import-recipe`, changes the shipped app.
- A storage, RLS or column change that iOS relies on must be **backwards
  compatible** until an iOS release that handles it has been out long enough.
  Make the change permissive first and tighten it later.
- supabase-swift decodes rows into non-optional Swift types. Dropping a column
  or returning `null` where iOS expects a value breaks decoding. `update()`
  defaults to `returning: .representation`, so a column-level revoke also
  breaks iOS writes.

## Database workflow

The MCP connection authenticates as `supabase_read_only_user`: `execute_sql`
reads anything, every write fails with `42501`. The linked project is
**production**, with real users and a live iOS app. There is no staging branch.

Write a migration with `supabase migration new <name>` (in the web repo),
verify with `npx supabase db push --dry-run`, then **hand `npx supabase db push`
to the user** to run. Regenerate web types afterwards with `npm run db:types`.
For one-off destructive SQL, give the user a statement to paste into the
Supabase SQL Editor, with a guard clause rather than a list of ids so it can't
over-delete.

Reads worth using before proposing changes: `execute_sql`, `get_advisors`,
`query_logs` (`auth_logs` records `/verify`, `/recover`, `/token` with status
codes, which is good for diagnosing auth flows).

Conventions for new SQL: lowercase `snake_case` identifiers (the mixed-case
quoted names like `"Subscriptions_GetStatus"` are legacy and iOS depends on
them); `(select auth.uid())` in policies, not bare `auth.uid()`; `security
definer` functions get `set search_path = ''` and an explicit identity check,
then `revoke all ... from public, anon` and `grant execute ... to authenticated`.

**`public.users.email` is always `''`**: every signed-in user can read that
table. Get the caller's email from claims or `getUser()`, and other users'
emails only through a `security definer` function reading `auth.users` (as
`Households_ReadAllMembers` and `FamilyPlan_ReadAllMembers` do). The column
stays `NOT NULL` because iOS decodes it as a non-optional `String`.

## Subscriptions (Kitch Premium)

**Two billing sources feed one entitlement.** Apple StoreKit on iOS, Stripe on
the web. Plans: `com.kitch.monthly`, `com.kitch.annual`, `com.kitch.family`
(annual, 5 seats). A 7-day free trial applies to **annual only**.

| Table | Written by |
|---|---|
| `subscriptions` | Apple edge functions (service role) |
| `subscriptions_stripe` | `stripe-webhook` (service role) |
| `subscriptions_family` | `FamilyPlan_*` RPCs |
| `import_usage` | `imports_record()` only |
| `macro_estimate_usage` | `macro_estimates_consume()` only |

None of these have client write policies, and that is deliberate. A counter the
user can `PATCH` is not a limit. (`public.users` grants `authenticated`
table-wide UPDATE with no column-level restriction, which is why usage lives in
its own table rather than as a column there.)

**Reading entitlement:**

- `Subscriptions_GetStatus(uuid)`: **iOS calls this; its shape is frozen.**
  Returns zero rows when not entitled. It resolves Apple → Apple family → Stripe
  → Stripe family, mapping a Stripe plan back to the equivalent `com.kitch.*` id
  so iOS honours web purchases with no app update. Never add, rename or reorder
  its columns.
- `entitlement_get_status()`: the web's richer view (source, plan, renewal,
  cancel-at-period-end, trial, family seats). Always returns exactly one row.
- `has_active_premium()`: the single boolean source of truth, used by the above.

From web TypeScript, go through `lib/subscription/entitlement.ts`
(`getEntitlement()`, `getImportUsage()`) rather than querying the tables.
`getEntitlement` fails **closed**; `getImportUsage` fails **open**, because the
real gate is server-side and a hiccup must not block a paying user.

**Where Stripe lives, and why it's split:**

- **Checkout and billing portal → Next.js server action**
  (`app/(dashboard)/premium/actions.ts`). Only calls Stripe's API and reads the
  caller's own row via RLS, so it needs no public URL and no service role.
- **Webhook → Supabase edge function** (`supabase/functions/stripe-webhook`).
  Stripe cannot reach localhost and writing `subscriptions_stripe` needs the
  service role; an edge function gets both for free. Deployed
  `verify_jwt = false` (see `supabase/config.toml`): the Stripe signature is
  what authenticates it, and it is verified.

Plan identity lives in one place: `lib/subscription/plans.ts` (Apple product id
↔ Stripe price env var ↔ trial ↔ feature list). Clients send a plan key, never
a price id.

> Stripe SDK v18+ **removed `current_period_end` from `Subscription`**. It is on
> each `SubscriptionItem`. Reading it off the subscription silently yields
> undefined and stores a null renewal date.

**Free tier: 10 recipe imports.** Enforced inside `import-recipe` (before the
BrightData scrape and OpenAI call), with a UX pre-check in the web's
`app/(dashboard)/recipes/actions.ts`. The server action is *not* the gate: the
edge function is a public endpoint that any authenticated caller can hit
directly, and it is also the iOS import path. Gated by the
`ENFORCE_IMPORT_LIMIT` function secret (**currently on**), so it can be deployed
dark first; unset it to roll back, and counting continues either way. Flipping
it is never a web-only change: it starts returning 402s to iOS users who never
opened the web app. It is read at module scope, so changing the secret needs a
redeploy to take effect deterministically. `import_usage` was deliberately never
backfilled, which is what keeps the server counter more permissive than the iOS
client-side guard rather than stricter. Recipes written from scratch are always
free and never counted.

## Edge functions

**In the web repo:** `import-recipe` (BrightData scrape → OpenAI →
`Recipe_Write`), `stripe-webhook`, `estimate-macros` (Quick Add: text →
per-food macros via OpenAI, 3 a day free / unlimited Premium, counted by
`macro_estimates_consume()`), `transfer-subscription` (re-keys an Apple
subscription to the caller's own account, and moves a Family plan's seats and
pending invites with it via `family_transfer_owner()`).

**Deployed but NOT in the web repo:** `verify-subscription`,
`apple-subscription-webhook`, `log-exception`. These run the whole live StoreKit
flow. Read them with the Supabase MCP `get_edge_function` tool and never assume
the repo is the full picture. The iOS repo's git history has old copies under
`supabase/functions/`, but the deployed version is the truth. Redeploying any of
them from a stale copy would silently replace what is live.

## Open items blocked on an iOS release

**Drop `public.users.email`.** It is blanked
(`20261002072554_hide_user_emails`), not dropped, because iOS decodes
`UserDetails.email` as a non-optional `String` from `Users_Read` /
`Users_ReadAll` / `Users_ReadAllFollowing` / `Users_ReadAllFollowingCookbooks`
(which return `users.*`). Order: (1) in iOS, make `UserDetails.email` optional or
remove it (nothing displays it); (2) once old builds have aged out, or right
away if those four RPCs emit `'' as email` explicitly, drop the column and stop
`User_AfterInsert` from inserting it.

**Households self-join gap (security, open).** The `households` INSERT policy
only checks `member_id = auth.uid()`, so anyone who knows an owner's user id can
join their household and then read and edit that owner's grocery list
(`grocery_list` policies scope to "own or same household"). Households are
iOS-only and stay off the web for now. The fix needs an invite/approval step in
the iOS join flow (`Households_Write`,
`Households_JoinHousehold_GetSetupData`), like the web family invites
(`family_invite_*`). Raise this whenever iOS households are being worked on.

**Per-user storage folders (deferred feature, not started).** Goal: every
user's images (recipe photos and avatars) under a per-user folder. Open
questions: one folder per user in each bucket (`recipes/<user_id>/…`,
`profiles/<user_id>/…`) or one merged bucket (`<user_id>/recipes/…`); migrate
existing files or only new uploads. Constraints (researched 2026-09-15):

- Current layout: `recipes` stores `public/<uuid>.<ext>` and `recipes.thumbnail`
  holds the **path**; `profiles` stores `<uuid>.<ext>` at the bucket root and
  `users.profile_pic_url` holds the **full URL**. About 130 objects exist.
- Renaming is not a SQL update: a migration must call the storage `move()` API
  per object, then rewrite both columns. Moving other users' files needs the
  service-role key.
- **iOS uploads to both buckets** with the current conventions. An INSERT policy
  that requires `<user_id>/` as the first folder breaks iOS uploads until iOS
  ships a matching change. Adopt the scheme for new uploads with permissive
  policies first; tighten once iOS matches.
- `import-recipe` also uploads to `recipes` and would need the owner's folder,
  plus a redeploy.
- Reads are safe: a catch-all `SELECT USING (true)` policy exists and both
  buckets are public.
- Payoff: the `profiles` DELETE policy
  (`20260915120000_add_profile_image_delete_policy.sql`) proves ownership via
  `users.profile_pic_url`; a per-user layout lets it become the standard
  `(storage.foldername(name))[1] = auth.uid()` check, and would close the open
  gap where replacing an avatar orphans the old file.
