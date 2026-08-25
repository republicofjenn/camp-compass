-- Fixes a Supabase security scanner alert: _sql_migrations (internal
-- bookkeeping for scripts/apply-sql.mjs, tracking which files in
-- src/db/sql/ have been applied) had no RLS, meaning it was exposed
-- read/write via Supabase's auto-generated REST API to anyone with the
-- public anon key. Not sensitive data (just filenames + timestamps), but
-- still a real hole -- no client or app code should ever touch this table,
-- only our own scripts connecting as the superuser (which bypasses RLS
-- regardless). Enabling RLS with zero policies makes it default-deny for
-- every other role.

alter table _sql_migrations enable row level security;
