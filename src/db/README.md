# Database

Schema lives in [`schema.ts`](./schema.ts) as Drizzle ORM table definitions.
Row-Level Security policies (the privacy/consent enforcement) live separately
in [`policies/0001_rls_policies.sql`](./policies/0001_rls_policies.sql) as raw
SQL, since Drizzle Kit manages tables/columns but not RLS.

## First-time setup against a Supabase project

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase
   project's connection string and keys.
2. Push the schema (creates tables from `schema.ts`):
   ```bash
   npm run db:push
   ```
3. Apply RLS policies:
   ```bash
   npm run db:policies
   ```
   Re-run this any time `src/db/policies/*.sql` changes -- it's not run
   automatically by `db:push`.
4. (Optional) Browse/edit data locally:
   ```bash
   npm run db:studio
   ```

## Changing the schema later

Edit `schema.ts`, then either `npm run db:push` (POC-friendly, applies
directly) or `npm run db:generate` (produces a versioned migration file under
`src/db/migrations/` -- switch to this once there's real data worth
preserving across changes).
