import Link from "next/link";
import { getCamps, getInterestOptions, type CampFilters } from "@/lib/camps";
import { SF_NEIGHBORHOODS } from "@/data/sf-neighborhoods";
import { getCurrentGuardian } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocode";

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 25];
const NEIGHBORHOOD_NAMES = Object.keys(SF_NEIGHBORHOODS).sort((a, b) => a.localeCompare(b));

// Bounds are offset by 1 cent at each boundary so bands don't overlap --
// e.g. a camp priced exactly $200 belongs to "$0-$200", not also "$200-$400".
// "Free" stays min=max=0, which naturally means "exactly $0" with the same
// gte/lte filter logic, no special-casing needed.
const BUDGET_BANDS: { value: string; label: string; minCents: number; maxCents?: number }[] = [
  { value: "free", label: "Free", minCents: 0, maxCents: 0 },
  { value: "0-200", label: "$0 - $200/wk", minCents: 1, maxCents: 20000 },
  { value: "200-400", label: "$200 - $400/wk", minCents: 20001, maxCents: 40000 },
  { value: "400-600", label: "$400 - $600/wk", minCents: 40001, maxCents: 60000 },
  { value: "600-800", label: "$600 - $800/wk", minCents: 60001, maxCents: 80000 },
  { value: "800-1000", label: "$800 - $1000/wk", minCents: 80001, maxCents: 100000 },
  { value: "1000+", label: "$1000+/wk", minCents: 100001 },
];

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

const inputClass =
  "rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-emerald";

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;
  const selectedInterests = (Array.isArray(sp.interests) ? sp.interests : sp.interests ? [sp.interests] : []).filter(
    (i): i is string => typeof i === "string" && i.length > 0,
  );
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
  const addressInput = typeof sp.address === "string" ? sp.address.trim() : "";
  const radiusMiles =
    typeof sp.radius === "string" && !Number.isNaN(Number(sp.radius))
      ? Number(sp.radius)
      : undefined;
  const budgetParam = typeof sp.budget === "string" ? sp.budget : undefined;
  const budgetBand = BUDGET_BANDS.find((b) => b.value === budgetParam);

  const guardian = await getCurrentGuardian();
  const hasHomeLocation = guardian?.homeLat != null && guardian?.homeLng != null;
  const useHome = nearParam === "home" && hasHomeLocation;

  // Priority: a typed address (works with no account at all) > saved home
  // location > a quick-pick neighborhood. Nobody should have to sign up
  // just to see what's nearby.
  let origin: { lat: number; lng: number } | undefined;
  let addressNotFound = false;
  if (addressInput) {
    const coords = await geocodeAddress(addressInput);
    if (coords) origin = coords;
    else addressNotFound = true;
  } else if (useHome) {
    origin = { lat: guardian!.homeLat!, lng: guardian!.homeLng! };
  } else if (near) {
    origin = SF_NEIGHBORHOODS[near];
  }

  const filters: CampFilters = {
    q,
    interests: selectedInterests,
    format,
    age,
    origin,
    radiusMiles,
    budgetMinCents: budgetBand?.minCents,
    budgetMaxCents: budgetBand?.maxCents,
  };
  const [camps, interestOptions] = await Promise.all([getCamps(filters), getInterestOptions()]);

  const grouped = new Map<string, typeof interestOptions>();
  for (const i of interestOptions) {
    const key = i.category ?? "other";
    const list = grouped.get(key) ?? [];
    list.push(i);
    grouped.set(key, list);
  }

  const hasFilters = Boolean(
    q || selectedInterests.length > 0 || format || age !== undefined || near || addressInput || budgetBand,
  );

  return (
    <div className="flex flex-1 flex-col bg-background">
      <section className="border-b border-border bg-emerald-soft px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald">
            Summer camp shouldn&apos;t feel like the Hunger Games
          </p>
          <h1 className="mb-3 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Find the right camp for your kid, fast.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Browse real SF summer camps that fit your kid&apos;s interests, age, and your budget &mdash; no account
            needed. When you&apos;re ready, connect with other parents to carpool and see where your kid&apos;s
            friends are headed this summer.{" "}
            <strong className="text-foreground">Your info stays private unless you say otherwise.</strong>
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:px-10">
        <form
          method="get"
          className="mb-8 flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-1">
              <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
                Search
              </label>
              <input
                id="q"
                name="q"
                type="text"
                placeholder="Camp name..."
                defaultValue={q ?? ""}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="age" className="text-xs font-medium text-muted-foreground">
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
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="format" className="text-xs font-medium text-muted-foreground">
                Format
              </label>
              <select id="format" name="format" defaultValue={format ?? ""} className={inputClass}>
                <option value="">Any format</option>
                <option value="in_person">In Person</option>
                <option value="remote">Remote</option>
                <option value="both">In Person & Remote</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="radius" className="text-xs font-medium text-muted-foreground">
                Within
              </label>
              <select id="radius" name="radius" defaultValue={radiusMiles ?? 5} className={inputClass}>
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} miles
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="budget" className="text-xs font-medium text-muted-foreground">
                Weekly budget
              </label>
              <select id="budget" name="budget" defaultValue={budgetParam ?? ""} className={inputClass}>
                <option value="">Any budget</option>
                {BUDGET_BANDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="address" className="text-xs font-medium text-muted-foreground">
                Your address (optional, no account needed)
              </label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="e.g. 123 Main St, San Francisco, CA"
                defaultValue={addressInput}
                className={inputClass}
              />
              {addressNotFound && (
                <p className="text-xs text-red-600">
                  Couldn&apos;t find that address -- try adding city/state, or use the neighborhood picker instead.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="near" className="text-xs font-medium text-muted-foreground">
                Or pick a neighborhood
              </label>
              <select
                id="near"
                name="near"
                defaultValue={useHome ? "home" : (near ?? "")}
                disabled={Boolean(addressInput)}
                className={`${inputClass} disabled:opacity-40`}
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
                <p className="text-xs text-muted-foreground">
                  <Link href="/login" className="underline underline-offset-2">
                    Create an account
                  </Link>{" "}
                  to save your address and search from it every time.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Interests (pick any that apply)</p>
            <div className="flex flex-col gap-2">
              {[...grouped.entries()].map(([category, items]) => (
                <div key={category} className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                    {category}
                  </span>
                  {items.map((i) => {
                    const checked = selectedInterests.includes(i.name);
                    return (
                      <label
                        key={i.id}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          checked
                            ? "border-emerald bg-emerald text-white"
                            : "border-border bg-white text-foreground hover:border-emerald"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="interests"
                          value={i.name}
                          defaultChecked={checked}
                          className="sr-only"
                        />
                        {i.name}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-emerald px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-strong"
            >
              Search
            </button>
            {hasFilters && (
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Clear filters
              </Link>
            )}
          </div>
        </form>

        <p className="mb-4 text-sm text-muted-foreground">
          {camps.length} {camps.length === 1 ? "camp" : "camps"} found
        </p>

        {camps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No camps match those filters. Try widening your search.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {camps.map((camp) => (
              <li
                key={camp.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 shadow-sm"
              >
                <Link
                  href={`/camps/${camp.id}`}
                  className="text-lg font-semibold leading-snug text-foreground hover:text-emerald hover:underline"
                >
                  {camp.name}
                </Link>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                  <p className="line-clamp-3 text-sm text-foreground/80">{camp.description}</p>
                )}

                {camp.session?.priceText && (
                  <p className="text-sm font-medium text-foreground">{camp.session.priceText.split("\n")[0]}</p>
                )}

                {camp.interestTags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {camp.interestTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-medium text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {camp.interestTags.length > 4 && (
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted-foreground">
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
