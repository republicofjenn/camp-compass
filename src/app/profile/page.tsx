import { redirect } from "next/navigation";
import { getCurrentGuardian } from "@/lib/auth";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Profile & Search Preferences</h1>

        <ProfileForm
          hasHomeLocation={guardian.homeLat !== null && guardian.homeLng !== null}
          radiusMiles={guardian.searchRadiusMiles}
          budgetMin={guardian.budgetMinCents}
          budgetMax={guardian.budgetMaxCents}
        />
      </main>
    </div>
  );
}
