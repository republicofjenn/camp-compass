import Link from "next/link";
import { getCamps, getInterestOptions, type CampFilters } from "@/lib/camps";
import { SF_NEIGHBORHOODS } from "@/data/sf-neighborhoods";
import { getCurrentGuardian } from "@/lib/auth";

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 25];
const NEIGHBORHOOD_NAMES = Object.keys(SF_NEIGHBORHOODS).sort((a, b) => a.localeCompare(b));

function formatLabel(format: string) {
  if (format === "in_person") return "In Person";
  if (format === "remote") return "Remote";
  if (format === "both") return "In Person & Remote";
  return format;
}

function ageLabel(ageMin: number | null, ageMax: number | null) {
  if (ageMin === null && ageMax === null) return "All ages";
  if (ageMin !== null && ageMax !== null && ageMin === ageMax) return `Age ${ageMin}`;
  if (ageMin !== null && ageMax !== null) return `Ages ${ageMin}-${ageMax}`;
  if (ageMin !== null) return `Age ${ageMin}+`;
  return `Up to age ${ageMax}`;
}

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;
  const interest = typeof sp.interest === "string" && sp.interest ? sp.interest : undefined;
  const format =
    sp.format === "in_person" || sp.format === "remote" || sp.format === "both"
      ? sp.format
      : undefined;
  const age =
    typeof sp.age === "string" && sp.age.trim() !== "" && !Number.isNaN(Number(sp.age))
      ? Number(sp.age)
      : undefined;
  const nearParam = typeof sp.near === "string" ? sp.near : undefined;
  const near = nearParam && nearParam in SF_NEIGHBORHOODS ? nearParam : undefined;
  const radiusMiles =
    typeof sp.radius === "string" && !Number.isNaN(Number(sp.radius))
      ? Number(sp.radius)
      : undefined;

  const guardian = await getCurrentGuardian();
  const hasHomeLocation = guardian?.homeLat != null && guardian?.homeLng != null;
  const useHome = nearParam === "home" && hasHomeLocation;
  const origin = useHome ? { lat: guardian!.homeLat!, lng: guardian!.homeLng! } : undefined;

  const filters: CampFilters = { q, interest, format, age, near, origin, radiusMiles };
  const [camps, interestOptions] = await Promise.all([getCamps(filters), getInterestOptions()]);

  const grouped = new Map<string, typeof interestOptions>();
  for (const i of interestOptions) {
    const key = i.category ?? "other";
    const list = grouped.get(key) ?? [];
    list.push(i);
    grouped.set(key, list);
  }

  const hasFilters = Boolean(q || interest || format || age !== undefined || near || origin);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:px-10">
        <form
          method="get"
          className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="q" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="text"
              placeholder="Camp name..."
              defaultValue={q ?? ""}
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="interest" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Interest
            </label>
            <select
              id="interest"
              name="interest"
              defaultValue={interest ?? ""}
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]"
            >
              <option value="">All interests</option>
              {[...grouped.entries()].map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="age" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Kid&apos;s age
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min={0}
              max={18}
              placeholder="e.g. 8"
              defaultValue={age ?? ""}
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="format" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Format
            </label>
            <select
              id="format"
              name="format"
              defaultValue={format ?? ""}
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]"
            >
              <option value="">Any format</option>
              <option value="in_person">In Person</option>
              <option value="remote">Remote</option>
              <option value="both">In Person & Remote</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="near" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Near
            </label>
            <select
              id="near"
              name="near"
              defaultValue={useHome ? "home" : (near ?? "")}
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]"
            >
              <option value="">Anywhere in SF</option>
              {hasHomeLocation && <option value="home">My Home</option>}
              {NEIGHBORHOOD_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {!hasHomeLocation && (
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                <Link href="/profile" className="underline underline-offset-2">
                  Set your home address
                </Link>{" "}
                to search from there.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="radius" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Within
            </label>
            <select
              id="radius"
              name="radius"
              defaultValue={radiusMiles ?? 5}
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} miles
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Search
            </button>
            {hasFilters && (
              <Link
                href="/"
                className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Clear filters
              </Link>
            )}
          </div>
        </form>

        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {camps.length} {camps.length === 1 ? "camp" : "camps"} found
        </p>

        {camps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/[.15] p-8 text-center text-sm text-zinc-600 dark:border-white/[.2] dark:text-zinc-400">
            No camps match those filters. Try widening your search.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {camps.map((camp) => (
              <li
                key={camp.id}
                className="flex flex-col gap-2 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950"
              >
                <Link
                  href={`/camps/${camp.id}`}
                  className="text-lg font-semibold leading-snug text-black hover:underline dark:text-zinc-50"
                >
                  {camp.name}
                </Link>

                <div className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {camp.neighborhood && <span>{camp.neighborhood}</span>}
                  <span>&middot;</span>
                  <span>{ageLabel(camp.ageMin, camp.ageMax)}</span>
                  <span>&middot;</span>
                  <span>{formatLabel(camp.format)}</span>
                  {camp.distanceMiles !== null && (
                    <>
                      <span>&middot;</span>
                      <span>{camp.distanceMiles.toFixed(1)} mi away</span>
                    </>
                  )}
                </div>

                {camp.description && (
                  <p className="line-clamp-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {camp.description}
                  </p>
                )}

                {camp.session?.priceText && (
                  <p className="text-sm font-medium text-black dark:text-zinc-50">
                    {camp.session.priceText.split("\n")[0]}
                  </p>
                )}

                {camp.interestTags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {camp.interestTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-black/[.06] px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {camp.interestTags.length > 4 && (
                      <span className="rounded-full bg-black/[.06] px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300">
                        +{camp.interestTags.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
