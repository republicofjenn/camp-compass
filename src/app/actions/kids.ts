"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { kids, guardianKids, kidInterests } from "@/db/schema";
import { getCurrentGuardian } from "@/lib/auth";

export type KidFormState = { error: string } | undefined;

export async function addKid(_prevState: KidFormState, formData: FormData): Promise<KidFormState> {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const birthMonth = Number(formData.get("birthMonth"));
  const birthYear = Number(formData.get("birthYear"));
  const interestIds = formData.getAll("interests").map(String);

  if (!name) return { error: "Name is required." };
  if (!birthMonth || birthMonth < 1 || birthMonth > 12) return { error: "Birth month is required." };
  if (!birthYear || birthYear < 2000 || birthYear > new Date().getFullYear()) {
    return { error: "Birth year is required." };
  }

  // Generate the id ourselves rather than using .returning() -- RLS's
  // kids_select_own policy checks guardian_kids, which doesn't have a row
  // for this kid until the next insert below, so RETURNING (which implies
  // a SELECT-permission check) would fail with "new row violates row-level
  // security policy" on an otherwise-valid insert.
  const kidId = crypto.randomUUID();

  await withAuthenticatedDb(guardian.id, async (tx) => {
    await tx.insert(kids).values({ id: kidId, name, birthMonth, birthYear });

    await tx.insert(guardianKids).values({
      guardianId: guardian.id,
      kidId,
      relationship: "parent",
      canManage: true,
    });

    if (interestIds.length > 0) {
      await tx.insert(kidInterests).values(
        interestIds.map((interestId) => ({ kidId, interestId })),
      );
    }
  });

  revalidatePath("/kids");
}

export async function removeKid(formData: FormData) {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const kidId = String(formData.get("kidId") ?? "");
  if (!kidId) return;

  // Unlink this guardian from the kid rather than deleting the kid outright
  // -- a kid can have multiple guardians, and removing yourself shouldn't
  // remove the kid for a co-parent.
  await withAuthenticatedDb(guardian.id, (tx) =>
    tx
      .delete(guardianKids)
      .where(and(eq(guardianKids.guardianId, guardian.id), eq(guardianKids.kidId, kidId))),
  );

  revalidatePath("/kids");
}
