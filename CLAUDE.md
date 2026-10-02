# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                    # Dev server (localhost:3000)
npm run build                  # Production build
npm run lint                   # ESLint
npm run db:types               # Regenerate lib/database.types.ts from the linked project
npm run functions:deploy       # Deploy the import-recipe edge function
npm run functions:deploy:stripe # Deploy the stripe-webhook edge function
npm run functions:deploy:transfer # Deploy the transfer-subscription edge function
```

There is no test suite. Verification is done by running the app and checking
behaviour directly.

Before every deploy, `npm run lint` and `npm run build` must both pass. The
build also runs the typecheck.

## What this is

Kitch: a recipe manager with an iOS app and this web app sharing one Supabase
project. The repo began as the Next.js + Supabase Starter Kit; its demo pages have been
removed.

**The iOS app hits the same database and the same edge functions.** Changing a
shared RPC's signature, or the behaviour of `import-recipe`, changes the shipped
app. Treat those as public API.

## Architecture

### Supabase client pattern

Three client constructors, one per execution context — always use the matching one:

- [lib/supabase/client.ts](lib/supabase/client.ts) — `createClient()` for Client Components. Used only for auth forms and storage uploads.
- [lib/supabase/server.ts](lib/supabase/server.ts) — async `createClient()` for Server Components/Actions/Route Handlers; cookies via `next/headers`. This is the default.
- [lib/supabase/proxy.ts](lib/supabase/proxy.ts) — `updateSession()`, called from the middleware layer to refresh the session on every request.

Never cache a Supabase client in a module-level variable — construct one per
request (required for Fluid compute).

### Auth session refresh via `proxy.ts`

Despite the name, [proxy.ts](proxy.ts) (project root) is the Next.js middleware
entry point; it wraps `updateSession()`. That function calls
`supabase.auth.getClaims()` and redirects unauthenticated users to
`/auth/login`, except for `/`, `/login*`, `/auth*` and `/legal*`.

Do not add logic between `createServerClient()` and `getClaims()` — the inline
comments explain why this causes hard-to-debug session bugs. If you modify the
response object, copy the cookies exactly as documented there or client and
server sessions desync.

### Data fetching conventions

- **Pages are Server Components** that read via `lib/supabase/server.ts`, usually with `Promise.all` for parallel queries, wrapped in `<Suspense>`.
- **Mutations and search-as-you-type go through `"use server"` action files** (`app/(dashboard)/*/actions.ts`), called from Client Components inside `useTransition`.
- **Every action returns the same discriminated union**: `{ ok: true, ... } | { ok: false, error: string }`. Follow this.
- **Actions are public endpoints**, so validate inputs server-side: length and list caps live in [lib/validation/limits.ts](lib/validation/limits.ts). Never accept a storage path or image URL from the client unless it is one the uploader just produced — the storage delete policies trust those columns.
- **`public.users.email` is always `''`**: every signed-in user can read that table. Get the caller's email from claims or `getUser()`, and other users' emails only through a `security definer` function reading `auth.users` (as `Households_ReadAllMembers` and `FamilyPlan_ReadAllMembers` do). The column stays `NOT NULL` because iOS decodes it as a non-optional `String`.
- Identity comes from `supabase.auth.getClaims()` → `claims.sub`. `getUser()` is used in exactly one place ([settings/page.tsx](app/(dashboard)/settings/page.tsx)), which documents why.
- No SWR/React Query. `hooks/` holds one hook and it does no fetching.

### Routes

- `/` — no marketing page. The proxy redirects it to the dashboard or
  `/auth/login`; [app/page.tsx](app/page.tsx) must stay free of request data, or
  the Cache Components prerender fails the build.
- `/auth/*` — login, sign-up, forgot/update password, callback + confirm route handlers, error page.
- `/legal/*` — terms, privacy. Public.
- `(dashboard)` group — authenticated app behind [app/(dashboard)/layout.tsx](app/(dashboard)/layout.tsx): `/cookbooks` (the home screen, labelled "Recipes"), `/recipes/[id]` and `/recipes/[id]/edit`, `/meal-prep`, `/grocery-list`, `/discover`, `/users/[id]`, `/settings`, `/premium`.

Nav items are defined in one place: `navItems` in
[components/cookbooks/cookbook-sidebar.tsx](components/cookbooks/cookbook-sidebar.tsx).

### UI conventions

shadcn/ui (`new-york`, neutral base) — but `components/ui/` is a **thin** set:
avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label,
textarea. There is no `tabs`, `alert`, `table`, `select`, `tooltip`, `popover`,
`sheet`, `switch`, `skeleton` or `toast`. Don't reach for one without installing
it; the codebase uses `border-t border-kitch-charcoal/10` dividers and
hand-written `<Suspense>` fallbacks instead.

Brand tokens are `kitch-*` colours in [tailwind.config.ts](tailwind.config.ts),
backed by HSL vars in `app/globals.css`. Recurring idioms:

- Headings: `font-literata` (Literata via `--font-literata`; body is Geist)
- Cards: `rounded-3xl border border-kitch-charcoal/10 bg-white`
- Primary buttons: `rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white`
- Icon tiles: same gradient, `bg-gradient-to-br`

Tailwind v3, `darkMode: ["class"]` — but the dashboard hardcodes light cream
surfaces, so dark mode is vestigial outside the starter pages.

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

None of these have client write policies — that is deliberate. A counter the
user can `PATCH` is not a limit. (`public.users` grants `authenticated`
table-wide UPDATE with no column-level restriction, which is why usage lives in
its own table rather than as a column there.)

**Reading entitlement:**

- `Subscriptions_GetStatus(uuid)` — **iOS calls this; its shape is frozen.** Returns zero rows when not entitled. It resolves Apple → Apple family → Stripe → Stripe family, mapping a Stripe plan back to the equivalent `com.kitch.*` id so iOS honours web purchases with no app update. Never add, rename or reorder its columns.
- `entitlement_get_status()` — the web's richer view (source, plan, renewal, cancel-at-period-end, trial, family seats). Always returns exactly one row.
- `has_active_premium()` — the single boolean source of truth, used by the above.

From TypeScript, go through [lib/subscription/entitlement.ts](lib/subscription/entitlement.ts)
(`getEntitlement()`, `getImportUsage()`) rather than querying the tables.
`getEntitlement` fails **closed**; `getImportUsage` fails **open**, because the
real gate is server-side and a hiccup must not block a paying user.

**Where Stripe lives, and why it's split:**

- **Checkout and billing portal → Next.js server action** ([app/(dashboard)/premium/actions.ts](app/(dashboard)/premium/actions.ts)). Only calls Stripe's API and reads the caller's own row via RLS, so it needs no public URL and no service role.
- **Webhook → Supabase edge function** ([supabase/functions/stripe-webhook](supabase/functions/stripe-webhook)). Stripe cannot reach localhost and writing `subscriptions_stripe` needs the service role; an edge function gets both for free. Deployed `verify_jwt = false` (see [supabase/config.toml](supabase/config.toml)) — the Stripe signature is what authenticates it, and it is verified.

Plan identity lives in one place: [lib/subscription/plans.ts](lib/subscription/plans.ts)
(Apple product id ↔ Stripe price env var ↔ trial ↔ feature list). Clients send a
plan key, never a price id.

> Stripe SDK v18+ **removed `current_period_end` from `Subscription`** — it is on
> each `SubscriptionItem`. Reading it off the subscription silently yields
> undefined and stores a null renewal date.

**Free tier: 10 recipe imports.** Enforced inside `import-recipe` (before the
BrightData scrape and OpenAI call), with a UX pre-check in
[app/(dashboard)/recipes/actions.ts](app/(dashboard)/recipes/actions.ts). The
server action is *not* the gate — the edge function is a public endpoint that
any authenticated caller can hit directly, and it is also the iOS import path.
Gated by the `ENFORCE_IMPORT_LIMIT` function secret (**currently on**) so it can
be deployed dark first; unset it to roll back, and counting continues either
way. Note it is read at module scope, so changing the secret needs a redeploy to
take effect deterministically. `import_usage` was deliberately never backfilled,
which is what keeps the server counter more permissive than the iOS client-side
guard rather than stricter. Recipes written from scratch are always free and
never counted.

### Environment / secrets

`.env.local` (Next, all server-only): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ENABLE_APPLE_SIGN_IN`,
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY` / `_ANNUAL` / `_FAMILY`,
`SITE_URL`.

`supabase secrets set` (edge functions): `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, the three `STRIPE_PRICE_ID_*`, `ENFORCE_IMPORT_LIMIT`,
plus the existing Apple/BrightData/OpenAI keys. `SUPABASE_SERVICE_ROLE_KEY` is
injected automatically — never add it to `.env.local`.

`hasEnvVars` in [lib/utils.ts](lib/utils.ts) gates the auth UI and no-ops the
proxy before Supabase is configured.

## Deployment

Production is Vercel at `https://www.cookwithkitch.com` (apex redirects to www);
pushes to `main` deploy it. Preview deployments and local dev all hit the
**same production Supabase project**. Security headers are set in
[next.config.ts](next.config.ts). `SITE_URL` must be set in Vercel —
`getSiteUrl()` throws in production without it. Stripe env vars are
deliberately **absent from Vercel Production** until Stripe goes live: with
test keys, anyone could check out with a test card and receive real Premium on
web and iOS.

## Edge functions

**In the repo:** `import-recipe` (BrightData scrape → OpenAI → `Recipe_Write`),
`stripe-webhook`, `transfer-subscription` (re-keys an Apple subscription to
the caller's own account, and moves a Family plan's seats and pending invites
with it via `family_transfer_owner()`).

**Deployed but NOT in the repo** — read them with the Supabase MCP
`get_edge_function` tool, and never assume the repo is the full picture:
`verify-subscription`, `apple-subscription-webhook`, `log-exception`.

## Database workflow

The MCP connection authenticates as `supabase_read_only_user`: `execute_sql`
reads anything, every write fails with `42501`. The linked project is
**production**, with real users and a live iOS app — there is no staging branch.

Write a migration with `supabase migration new <name>`, verify with
`npx supabase db push --dry-run`, then **hand `npx supabase db push` to the
user** to run. Regenerate types afterwards with `npm run db:types`.

Conventions for new SQL: lowercase `snake_case` identifiers (the mixed-case
quoted names like `"Subscriptions_GetStatus"` are legacy and iOS depends on
them); `(select auth.uid())` in policies, not bare `auth.uid()`; `security
definer` functions get `set search_path = ''` and an explicit identity check,
then `revoke all ... from public, anon` and `grant execute ... to authenticated`.

## Skills

Installed Supabase skills (`.claude/skills/`, tracked via
[skills-lock.json](skills-lock.json)) — `supabase` and
`supabase-postgres-best-practices`. Load these before any task touching Supabase
Auth, Database, RLS policies, migrations, Edge Functions, or Postgres
schema/query work.
