# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

There is no test suite configured in this project.

## Architecture

This is the Next.js + Supabase Starter Kit (App Router), using cookie-based Supabase Auth via `@supabase/ssr`.

### Supabase client pattern

There are three separate Supabase client constructors, each for a different execution context — always use the one matching where the code runs:

- [lib/supabase/client.ts](lib/supabase/client.ts) — `createClient()` for Client Components (browser).
- [lib/supabase/server.ts](lib/supabase/server.ts) — async `createClient()` for Server Components/Actions/Route Handlers; reads/writes cookies via `next/headers`.
- [lib/supabase/proxy.ts](lib/supabase/proxy.ts) — `updateSession()`, called from the Next.js proxy layer to refresh the auth session on every request.

Never cache/reuse a Supabase client in a module-level variable — each is constructed fresh per request (required for Fluid compute compatibility).

### Auth session refresh via `proxy.ts`

Despite the name, [proxy.ts](proxy.ts) (project root) is this template's Next.js middleware entry point — it wraps `updateSession()` from `lib/supabase/proxy.ts`. That function calls `supabase.auth.getClaims()` to refresh the session and redirects unauthenticated users to `/auth/login` (except for `/`, `/login*`, and `/auth*` paths). Do not add logic between `createServerClient()` and `getClaims()` in that file — the surrounding comments explain this is a common source of hard-to-debug session bugs. If you modify the response object, the cookies must be copied over exactly as documented in the file's inline comments, or client/server sessions can desync.

### Env vars

Supabase config uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not the `NEXT_PUBLIC_` prefix Supabase's dashboard shows by default — both anon and publishable key formats work here). `hasEnvVars` in [lib/utils.ts](lib/utils.ts) gates whether auth UI or an `EnvVarWarning` is shown, and is checked in `updateSession` to no-op the proxy before Supabase is configured.

### MCP setup

[.mcp.json](.mcp.json) configures the Supabase MCP server via `${SUPABASE_PROJECT_REF}` — this keeps the project ref out of git (this repo is public) while still letting the config file itself be committed. Before starting Claude Code, export it in your shell:

```bash
export SUPABASE_PROJECT_REF=qopqoiphwsufpynuzilx
```

(Find the ref in the Supabase dashboard URL, or in `supabase/.temp/project-ref` after `supabase link`.) Without it set, `claude mcp list` will warn that the variable is unset and the Supabase MCP tools won't connect.

### Routes

- `/` — marketing/tutorial landing page ([app/page.tsx](app/page.tsx)).
- `/auth/*` — login, sign-up, forgot/update password, email confirmation route handler, error page.
- `/protected` — example authenticated page; redirects to `/auth/login` server-side if there's no session.

### UI components

shadcn/ui (`new-york` style, neutral base color) — see [components.json](components.json) for aliases (`@/components`, `@/components/ui`, `@/lib`, etc.). Primitives live in `components/ui/`; feature/auth components live directly in `components/`; onboarding/tutorial-only components live in `components/tutorial/` and are meant to be deleted once real app content replaces the starter tutorial.

## Skills

This project uses installed Supabase skills (`.claude/skills/`, tracked via [skills-lock.json](skills-lock.json)) — `supabase` and `supabase-postgres-best-practices`. Load these before any task touching Supabase Auth, Database, RLS policies, migrations, Edge Functions, or Postgres schema/query work.
