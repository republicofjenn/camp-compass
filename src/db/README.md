# Database

Schema lives in [`schema.ts`](./schema.ts) as Drizzle ORM table definitions.
RLS policies and triggers (privacy/consent enforcement, the guardian-on-signup
trigger) live separately as raw SQL in [`sql/`](./sql), numbered and applied
in order, since Drizzle Kit manages tables/columns but not RLS or triggers.

**See also [docs/database-access.md](../../docs/database-access.md)** --
critical reading before writing any query that touches guardians, kids, or
their data. There are two different ways to reach the database in this
codebase and using the wrong one silently bypasses RLS.

## First-time setup against a Supabase project

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase
   project's connection string and keys.
2. Push the schema (creates tables from `schema.ts`):
   ```bash
   npm run db:push
   ```
3. Apply SQL files (RLS policies + triggers):
   ```bash
   npm run db:sql
   ```
   Tracks what's already applied in a `_sql_migrations` table, so it's safe
   to re-run -- only new files in `src/db/sql/` get applied. Add a new
   numbered file rather than editing an already-applied one.
4. (Optional) Browse/edit data locally:
   ```bash
   npm run db:studio
   ```

## Connection mode

Currently using Supabase's **session pooler** (`aws-0-us-west-1.pooler.supabase.com:5432`)
in `.env.local`, not the direct connection -- the direct host
(`db.<ref>.supabase.co`) is IPv6-only and wasn't reachable from local dev.

**When deploying to Vercel (or any serverless host): switch to the
transaction pooler instead** (same host, port 6543). Serverless functions open
many short-lived connections, which the transaction pooler is built for;
session pooler doesn't scale the same way there. Session pooler is fine for
local dev and for anything long-running (scripts, a persistent server).

## Changing the schema later

Edit `schema.ts`, then either `npm run db:push` (POC-friendly, applies
directly) or `npm run db:generate` (produces a versioned migration file under
`src/db/migrations/` -- switch to this once there's real data worth
preserving across changes).
