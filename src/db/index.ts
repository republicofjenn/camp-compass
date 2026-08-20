import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);

// IMPORTANT: this connects as the `postgres` role, which has BYPASSRLS.
// Fine for camps/sessions/interests (public-read data, RLS doesn't restrict
// it anyway), but NEVER use this directly for guardians/kids/enrollments/
// connections queries -- use withAuthenticatedDb below instead, or RLS is
// silently a no-op. See docs/database-access.md.
export const db = drizzle(client, { schema });

/**
 * Runs `fn` inside a transaction where the Postgres role is switched to
 * `authenticated` and `request.jwt.claims` is set to the given guardian's
 * id -- the same GUC Supabase's own API (PostgREST) sets from a verified
 * JWT, which `auth.uid()` and our RLS policies read. This makes RLS
 * actually apply, instead of running as the RLS-bypassing superuser.
 *
 * `guardianId` MUST come from a verified session (supabase.auth.getUser()),
 * never from unvalidated user input.
 */
export async function withAuthenticatedDb<T>(
  guardianId: string,
  fn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: guardianId, role: "authenticated" })}, true)`,
    );
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
