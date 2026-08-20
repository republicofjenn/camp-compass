import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentGuardian, getGuardianKids } from "@/lib/auth";
import { getFavoritesForGuardian } from "@/lib/favorites";

export default async function FavoritesPage() {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const kidsList = await getGuardianKids(guardian.id);
  const favorites = await getFavoritesForGuardian(guardian.id, kidsList.map((k) => k.id));

  const byKid = new Map<string, typeof favorites>();
  for (const fav of favorites) {
    const list = byKid.get(fav.kidId) ?? [];
    list.push(fav);
    byKid.set(fav.kidId, list);
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Favorites</h1>

        {kidsList.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/kids" className="underline underline-offset-2">
              Add a kid
            </Link>{" "}
            to start favoriting camps.
          </p>
        ) : favorites.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No favorites yet.{" "}
            <Link href="/" className="underline underline-offset-2">
              Browse camps
            </Link>{" "}
            and favorite one for your kid.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {kidsList.map((kid) => {
              const kidFavorites = byKid.get(kid.id) ?? [];
              if (kidFavorites.length === 0) return null;
              return (
                <section key={kid.id}>
                  <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">{kid.name}</h2>
                  <ul className="flex flex-col gap-3">
                    {kidFavorites.map((fav) => (
                      <li
                        key={fav.enrollmentId}
                        className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.1] dark:bg-zinc-950"
                      >
                        <Link
                          href={`/camps/${fav.camp.id}`}
                          className="font-medium text-black hover:underline dark:text-zinc-50"
                        >
                          {fav.camp.name}
                        </Link>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {fav.session.startDate ?? "Dates not listed"}
                          {fav.session.endDate ? ` – ${fav.session.endDate}` : ""}
                          {fav.camp.neighborhood ? ` · ${fav.camp.neighborhood}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
