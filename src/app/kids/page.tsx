import { redirect } from "next/navigation";
import { getCurrentGuardian } from "@/lib/auth";
import { getKidsWithInterests } from "@/lib/kids";
import { getInterestOptions } from "@/lib/camps";
import { calculateAge, monthName } from "@/lib/age";
import { removeKid } from "@/app/actions/kids";
import AddKidForm from "./AddKidForm";

export default async function KidsPage() {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const [kidList, interestOptions] = await Promise.all([
    getKidsWithInterests(guardian.id),
    getInterestOptions(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">My Kids</h1>

        {kidList.length === 0 ? (
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            No kids added yet. Add one below to start favoriting camps.
          </p>
        ) : (
          <ul className="mb-8 flex flex-col gap-3">
            {kidList.map((kid) => (
              <li
                key={kid.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950"
              >
                <div>
                  <p className="font-medium text-black dark:text-zinc-50">
                    {kid.name}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      &middot; Age {calculateAge(kid.birthMonth, kid.birthYear)} (born {monthName(kid.birthMonth)}{" "}
                      {kid.birthYear})
                    </span>
                  </p>
                  {kid.interestTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {kid.interestTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-black/[.06] px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300"
                        >
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
                    className="text-sm text-zinc-500 underline underline-offset-2 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
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
