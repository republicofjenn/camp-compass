"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { sessionEnrollments } from "@/db/schema";
import { getCurrentGuardian } from "@/lib/auth";

export async function toggleFavorite(formData: FormData) {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const kidId = String(formData.get("kidId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const campId = String(formData.get("campId") ?? "");
  if (!kidId || !sessionId) return;

  await withAuthenticatedDb(guardian.id, async (tx) => {
    const [existing] = await tx
      .select()
      .from(sessionEnrollments)
      .where(
        and(
          eq(sessionEnrollments.kidId, kidId),
          eq(sessionEnrollments.sessionId, sessionId),
          eq(sessionEnrollments.status, "favorited"),
        ),
      );

    if (existing) {
      await tx.delete(sessionEnrollments).where(eq(sessionEnrollments.id, existing.id));
    } else {
      await tx.insert(sessionEnrollments).values({
        kidId,
        sessionId,
        status: "favorited",
        createdByGuardianId: guardian.id,
      });
    }
  });

  if (campId) revalidatePath(`/camps/${campId}`);
  revalidatePath("/favorites");
}
