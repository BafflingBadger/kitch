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
npm run functions:deploy:macros # Deploy the estimate-macros edge function
```

There is no test suite. Verification is done by running the app and checking
behaviour directly.

Before every deploy, `npm run lint` and `npm run build` must both pass. The
build also runs the typecheck.

## What this is

Kitch: a recipe manager with an iOS app and this web app sharing one Supabase
project. The repo began as the Next.js + Supabase Starter Kit; its demo pages have been
removed.

**The iOS app hits the same database and the same edge functions.** The shared
backend rules (public-API RPCs, subscriptions and entitlement, edge functions,
database workflow, SQL conventions, open items blocked on iOS) live in
[supabase/backend-contract.md](supabase/backend-contract.md), which the iOS repo's
`CLAUDE.md` imports too. Keep backend facts there, not here:

@supabase/backend-contract.md

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
- Identity comes from `supabase.auth.getClaims()` → `claims.sub`. `getUser()` is used in exactly one place ([settings/page.tsx](app/(dashboard)/settings/page.tsx)), which documents why.
- No SWR/React Query. `hooks/` holds one hook and it does no fetching.

### Routes

- `/` — the public landing page ([app/(landing)/page.tsx](app/(landing)/page.tsx),
  sections in `components/landing/`). The proxy redirects signed-in users to the
  dashboard; the page must stay free of request data, or the Cache Components
  prerender fails the build. Its Android waitlist goes through
  `android_waitlist_join()`, a security definer RPC open to `anon`.
- `/auth/*` — login, sign-up, forgot/update password, callback + confirm route handlers, error page.
- `/legal/*` — terms, privacy. Public.
- `(dashboard)` group — authenticated app behind [app/(dashboard)/layout.tsx](app/(dashboard)/layout.tsx): `/cookbooks` (the home screen, labelled "Recipes"), `/recipes/[id]` and `/recipes/[id]/edit`, `/meal-prep` (recipes plus Quick Add foods in `mealplan_food_entries`, with a
  library in `food_items` for recents and favourites; the iOS-facing
  `mealplan_recipe_mapping` stays recipe-only), `/grocery-list`, `/discover`, `/users/[id]`, `/settings`, `/premium`.

Nav items are defined in one place: `navItems` in
[components/cookbooks/cookbook-sidebar.tsx](components/cookbooks/cookbook-sidebar.tsx).

### UI conventions

shadcn/ui (`new-york`, neutral base) — but `components/ui/` is a **thin** set:
accordion, avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label,
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

## Environment / secrets

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


## Skills

Installed Supabase skills (`.claude/skills/`, tracked via
[skills-lock.json](skills-lock.json)) — `supabase` and
`supabase-postgres-best-practices`. Load these before any task touching Supabase
Auth, Database, RLS policies, migrations, Edge Functions, or Postgres
schema/query work.
