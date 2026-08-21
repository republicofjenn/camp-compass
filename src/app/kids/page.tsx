import { redirect } from "next/navigation";
import { getCurrentGuardian } from "@/lib/auth";
import { getKidsWithInterests } from "@/lib/kids";
import { getInterestOptions } from "@/lib/camps";
import { calculateAge, monthName } from "@/lib/age";
import { removeKid } from "@/app/actions/kids";
import AddKidForm from "./AddKidForm";

export default async function KidsPage(props: PageProps<"/kids">) {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const sp = await props.searchParams;
  const justConfirmed = sp.confirmed === "1";

  const [kidList, interestOptions] = await Promise.all([
    getKidsWithInterests(guardian.id),
    getInterestOptions(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        {justConfirmed && (
          <p className="mb-6 rounded-lg bg-emerald-soft px-4 py-3 text-sm text-emerald-strong">
            ✓ Email confirmed -- your account is ready to go.
          </p>
        )}
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">My Kids</h1>

        {kidList.length === 0 ? (
          <p className="mb-6 text-sm text-muted-foreground">No kids added yet. Add one below to start favoriting camps.</p>
        ) : (
          <ul className="mb-8 flex flex-col gap-3">
            {kidList.map((kid) => (
              <li
                key={kid.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {kid.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      &middot; Age {calculateAge(kid.birthMonth, kid.birthYear)} (born {monthName(kid.birthMonth)}{" "}
                      {kid.birthYear})
                    </span>
                  </p>
                  {kid.interestTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {kid.interestTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <form action={removeKid}>
                  <input type="hidden" name="kidId" value={kid.id} />
                  <button
                    type="submit"
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-red-600"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <AddKidForm interestOptions={interestOptions} />
      </main>
    </div>
  );
}
