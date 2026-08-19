import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampById } from "@/lib/camps";

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

function registrationLabel(status: string) {
  switch (status) {
    case "open":
      return { text: "Registration open", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" };
    case "not_yet_open":
      return { text: "Registration not yet open", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
    case "waitlist":
      return { text: "Waitlist only", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
    case "full":
      return { text: "Full", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" };
    default:
      return { text: "Registration status unknown", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" };
  }
}

export default async function CampDetailPage(props: PageProps<"/camps/[id]">) {
  const { id } = await props.params;
  const camp = await getCampById(id);
  if (!camp) notFound();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          &larr; Back to search
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {camp.name}
        </h1>

        <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          {camp.neighborhood && <span>{camp.neighborhood}</span>}
          <span>&middot;</span>
          <span>{ageLabel(camp.ageMin, camp.ageMax)}</span>
          <span>&middot;</span>
          <span>{formatLabel(camp.format)}</span>
        </div>

        {camp.interestTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {camp.interestTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-black/[.06] px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {camp.description && (
          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
            {camp.description}
          </p>
        )}

        <section className="mt-8 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Sessions</h2>
          {camp.sessions.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No session details available yet.</p>
          ) : (
            camp.sessions.map((session) => {
              const reg = registrationLabel(session.registrationStatus);
              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-black dark:text-zinc-50">
                      {session.startDate ?? "Dates not listed"}
                      {session.endDate ? ` – ${session.endDate}` : ""}
                    </p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${reg.className}`}>
                      {reg.text}
                    </span>
                  </div>
                  {session.hoursText && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{session.hoursText}</p>
                  )}
                  {session.priceText && (
                    <p className="mt-1 whitespace-pre-line text-sm text-zinc-800 dark:text-zinc-200">
                      {session.priceText}
                    </p>
                  )}
                  {(session.ageMin !== null || session.ageMax !== null) && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {ageLabel(session.ageMin, session.ageMax)}
                      {session.level ? ` · ${session.level}` : ""}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </section>

        {(camp.dropoffPickupInfo || camp.packingList) && (
          <section className="mt-8 flex flex-col gap-4">
            {camp.dropoffPickupInfo && (
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Drop-off &amp; pickup</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-800 dark:text-zinc-200">
                  {camp.dropoffPickupInfo}
                </p>
              </div>
            )}
            {camp.packingList && (
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">What to pack</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-800 dark:text-zinc-200">
                  {camp.packingList}
                </p>
              </div>
            )}
          </section>
        )}

        {camp.website && (
          <a
            href={camp.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Visit camp website to start sign-up &rarr;
          </a>
        )}
      </main>
    </div>
  );
}
