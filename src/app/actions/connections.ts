"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, or, and } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { familyConnections, connectionKidShares } from "@/db/schema";
import { getCurrentGuardian } from "@/lib/auth";
import { findGuardianByEmail } from "@/lib/connections";

export type ConnectionFormState = { error: string } | undefined;

export async function requestConnection(
  _prevState: ConnectionFormState,
  formData: FormData,
): Promise<ConnectionFormState> {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const targetEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!targetEmail) return { error: "Email is required." };
  if (targetEmail === guardian.email.toLowerCase()) {
    return { error: "You can't connect with yourself." };
  }

  const target = await findGuardianByEmail(guardian.id, targetEmail);
  if (!target) {
    return { error: "No Camp Compass account found with that email." };
  }

  // Normalize so the pair is always stored the same way regardless of who
  // requests -- lets the DB's unique index catch duplicates in either
  // direction (A requests B, then B tries to request A).
  const [guardianAId, guardianBId] =
    guardian.id < target.id ? [guardian.id, target.id] : [target.id, guardian.id];

  const result = await withAuthenticatedDb(guardian.id, async (tx) => {
    const [existing] = await tx
      .select()
      .from(familyConnections)
      .where(and(eq(familyConnections.guardianAId, guardianAId), eq(familyConnections.guardianBId, guardianBId)));

    if (existing?.status === "pending") return { error: "A request is already pending with this family." };
    if (existing?.status === "accepted") return { error: "You're already connected with this family." };

    if (existing?.status === "declined") {
      // Allow re-requesting after a decline -- otherwise the unique index
      // on (guardian_a_id, guardian_b_id) would permanently lock this pair
      // out with no way to retry.
      await tx
        .update(familyConnections)
        .set({ status: "pending", requestedByGuardianId: guardian.id, respondedAt: null })
        .where(eq(familyConnections.id, existing.id));
      return undefined;
    }

    await tx.insert(familyConnections).values({
      guardianAId,
      guardianBId,
      requestedByGuardianId: guardian.id,
      status: "pending",
    });
    return undefined;
  });

  if (result?.error) return result;

  revalidatePath("/connections");
}

export async function respondToConnection(formData: FormData) {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!connectionId || (status !== "accepted" && status !== "declined")) return;

  // RLS backstops this too (family_connections_update's WITH CHECK blocks a
  // requester from setting their own request to 'accepted'), but checking
  // here as well gives a clean no-op instead of a thrown DB error.
  await withAuthenticatedDb(guardian.id, (tx) =>
    tx
      .update(familyConnections)
      .set({ status, respondedAt: new Date() })
      .where(
        and(
          eq(familyConnections.id, connectionId),
          or(eq(familyConnections.guardianAId, guardian.id), eq(familyConnections.guardianBId, guardian.id)),
        ),
      ),
  );

  revalidatePath("/connections");
}

export async function setKidShare(formData: FormData) {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const kidId = String(formData.get("kidId") ?? "");
  const shared = formData.get("shared") === "true";
  if (!connectionId || !kidId) return;

  await withAuthenticatedDb(guardian.id, (tx) =>
    tx
      .insert(connectionKidShares)
      .values({ connectionId, kidId, shared })
      .onConflictDoUpdate({
        target: [connectionKidShares.connectionId, connectionKidShares.kidId],
        set: { shared },
      }),
  );

  revalidatePath("/connections");
}
