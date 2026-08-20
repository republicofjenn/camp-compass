import { eq, inArray } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { guardianKids, kids, kidInterests, interests } from "@/db/schema";

export async function getKidsWithInterests(guardianId: string) {
  return withAuthenticatedDb(guardianId, async (tx) => {
    const rows = await tx
      .select({ kid: kids })
      .from(guardianKids)
      .innerJoin(kids, eq(guardianKids.kidId, kids.id))
      .where(eq(guardianKids.guardianId, guardianId));

    const kidList = rows.map((r) => r.kid);
    const kidIds = kidList.map((k) => k.id);
    if (kidIds.length === 0) return [];

    const tagRows = await tx
      .select({ kidId: kidInterests.kidId, name: interests.name })
      .from(kidInterests)
      .innerJoin(interests, eq(kidInterests.interestId, interests.id))
      .where(inArray(kidInterests.kidId, kidIds));

    const tagsByKid = new Map<string, string[]>();
    for (const t of tagRows) {
      const list = tagsByKid.get(t.kidId) ?? [];
      list.push(t.name);
      tagsByKid.set(t.kidId, list);
    }

    return kidList.map((kid) => ({ ...kid, interestTags: tagsByKid.get(kid.id) ?? [] }));
  });
}
