import { eq, and, inArray } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { sessionEnrollments, sessions, camps, kids } from "@/db/schema";

// Which of the guardian's kids have this session favorited -- used to render
// favorite-toggle state on the camp detail page.
export async function getFavoritedKidIdsForSession(guardianId: string, sessionId: string) {
  return withAuthenticatedDb(guardianId, async (tx) => {
    const rows = await tx
      .select({ kidId: sessionEnrollments.kidId })
      .from(sessionEnrollments)
      .where(and(eq(sessionEnrollments.sessionId, sessionId), eq(sessionEnrollments.status, "favorited")));
    return new Set(rows.map((r) => r.kidId));
  });
}

export async function getFavoritesForGuardian(guardianId: string, kidIds: string[]) {
  if (kidIds.length === 0) return [];

  return withAuthenticatedDb(guardianId, (tx) =>
    tx
      .select({
        enrollmentId: sessionEnrollments.id,
        kidId: sessionEnrollments.kidId,
        kidName: kids.name,
        session: sessions,
        camp: camps,
      })
      .from(sessionEnrollments)
      .innerJoin(sessions, eq(sessionEnrollments.sessionId, sessions.id))
      .innerJoin(camps, eq(sessions.campId, camps.id))
      .innerJoin(kids, eq(sessionEnrollments.kidId, kids.id))
      .where(and(inArray(sessionEnrollments.kidId, kidIds), eq(sessionEnrollments.status, "favorited"))),
  );
}
