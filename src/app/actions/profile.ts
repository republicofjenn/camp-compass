"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { withAuthenticatedDb } from "@/db";
import { guardians } from "@/db/schema";
import { getCurrentGuardian } from "@/lib/auth";
import { geocodeAddress, roundCoordinate } from "@/lib/geocode";

export type ProfileFormState = { error: string } | undefined;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const address = String(formData.get("address") ?? "").trim();
  const radiusMiles = Number(formData.get("radiusMiles"));
  const budgetMinRaw = String(formData.get("budgetMin") ?? "").trim();
  const budgetMaxRaw = String(formData.get("budgetMax") ?? "").trim();

  const budgetMinCents = budgetMinRaw ? Math.round(parseFloat(budgetMinRaw) * 100) : null;
  const budgetMaxCents = budgetMaxRaw ? Math.round(parseFloat(budgetMaxRaw) * 100) : null;

  let homeLat: number | null = null;
  let homeLng: number | null = null;

  if (address) {
    const coords = await geocodeAddress(address);
    if (!coords) {
      return { error: "Couldn't find that address. Try being more specific (include city/state)." };
    }
    homeLat = roundCoordinate(coords.lat);
    homeLng = roundCoordinate(coords.lng);
  }

  await withAuthenticatedDb(guardian.id, (tx) =>
    tx
      .update(guardians)
      .set({
        homeLat,
        homeLng,
        searchRadiusMiles: radiusMiles || null,
        budgetMinCents,
        budgetMaxCents,
      })
      .where(eq(guardians.id, guardian.id)),
  );

  revalidatePath("/profile");
  revalidatePath("/");
}
