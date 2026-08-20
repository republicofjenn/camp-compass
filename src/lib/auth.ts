import { cache } from "react";
import { eq } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { guardians, guardianKids, kids } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

// cache() memoizes per-request so multiple components calling this don't
// each trigger a separate auth round trip.
export const getCurrentGuardian = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return withAuthenticatedDb(user.id, async (tx) => {
    const [guardian] = await tx.select().from(guardians).where(eq(guardians.id, user.id));
    return guardian ?? null;
  });
});

export const getGuardianKids = cache(async (guardianId: string) => {
  return withAuthenticatedDb(guardianId, (tx) =>
    tx
      .select({ kid: kids })
      .from(guardianKids)
      .innerJoin(kids, eq(guardianKids.kidId, kids.id))
      .where(eq(guardianKids.guardianId, guardianId))
      .then((rows) => rows.map((r) => r.kid)),
  );
});
