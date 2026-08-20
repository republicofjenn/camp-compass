# Database access: two paths, on purpose

The app has two ways to reach the database, and which one to use depends on
what's being queried.

## `db` (from `src/db/index.ts`) -- public data only

Connects via the plain `DATABASE_URL` (the `postgres` role). **This role has
`BYPASSRLS`**, since it's the same connection used by `scripts/seed.ts` and
`scripts/geocode-camps.ts` to load/modify data outright. That means every RLS
policy in `src/db/sql/0001_rls_policies.sql` is silently ignored on this
connection -- it enforces nothing here.

Safe to use for: `camps`, `sessions`, `interests`, `camp_interests` --
anything covered by a `*_public_read` policy, where RLS wouldn't have
restricted the query anyway. That's what `src/lib/camps.ts` uses.

## `withAuthenticatedDb(guardianId, fn)` -- everything guardian/kid-scoped

Wraps a transaction that switches the Postgres role to `authenticated` and
sets the `request.jwt.claims` GUC to `{ sub: guardianId }` -- the same
mechanism Supabase's own API (PostgREST) uses from a verified JWT, and what
`auth.uid()` in our RLS policies reads. Inside this transaction, RLS is
**actually enforced**, not bypassed.

Use this for any query touching `guardians`, `kids`, `guardian_kids`,
`kid_interests`, `session_enrollments`, `family_connections`, or
`connection_kid_shares`. `guardianId` must come from a verified session
(`supabase.auth.getUser()`), never from a query param or form field --
otherwise someone could pass an arbitrary guardian id and read/write as that
user (the RLS policies still gate what that guardian can see, but only the
guardian's *own* verified id should ever be used as the claim).

## Why not just use `db` everywhere and check ownership in app code?

Two independent reasons this project cares about the DB-layer check
specifically, not just an app-code `WHERE guardian_id = ...`:

1. It's child data. A bug in one query's WHERE clause shouldn't be able to
   leak another family's kid's info -- see the privacy model discussion that
   shaped `family_connections`/`connection_kid_shares` in the first place.
2. `auth.uid()`-based RLS is what actually implements the mutual-consent
   sharing rules (a guardian can only ever see their own `home_lat/lng` and
   `budget`, and another guardian's kid's `session_enrollments` only through
   an accepted `family_connections` + explicit `connection_kid_shares`).
   Those rules live in SQL, not app code -- `withAuthenticatedDb` is what
   makes them load-bearing instead of decorative.

## How this was caught

Initially all guardian/kid code (in `src/lib/auth.ts`, `src/lib/kids.ts`,
`src/app/actions/kids.ts`) used the plain `db` client, which meant RLS was
silently doing nothing for any of it -- authorization was only as strong as
each query's own WHERE clause. Caught before shipping by checking
`pg_roles.rolbypassrls` for the connection's role and confirming `true`.
Fixed by adding `withAuthenticatedDb` and routing all of that code through
it. Worth re-checking any time new guardian/kid-touching code is added.
