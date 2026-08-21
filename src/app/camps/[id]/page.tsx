import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampById } from "@/lib/camps";
import { getCurrentGuardian, getGuardianKids } from "@/lib/auth";
import { getFavoritedKidIdsForSession } from "@/lib/favorites";
import { toggleFavorite } from "@/app/actions/favorites";

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
      return { text: "Registration open", className: "bg-emerald-soft text-emerald-strong" };
    case "not_yet_open":
      return { text: "Registration not yet open", className: "bg-gold-soft text-foreground" };
    case "waitlist":
      return { text: "Waitlist only", className: "bg-gold-soft text-foreground" };
    case "full":
      return { text: "Full", className: "bg-red-100 text-red-800" };
    default:
      return { text: "Registration status unknown", className: "bg-surface-muted text-muted-foreground" };
  }
}

export default async function CampDetailPage(props: PageProps<"/camps/[id]">) {
  const { id } = await props.params;
  const camp = await getCampById(id);
  if (!camp) notFound();

  const guardian = await getCurrentGuardian();
  const guardianKidsList = guardian ? await getGuardianKids(guardian.id) : [];
  const favoritedBySession = new Map<string, Set<string>>();
  if (guardian) {
    await Promise.all(
      camp.sessions.map(async (session) => {
        favoritedBySession.set(session.id, await getFavoritedKidIdsForSession(guardian.id, session.id));
      }),
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <Link href="/" className="mb-6 inline-block text-sm font-medium text-muted-foreground hover:text-emerald">
          &larr; Back to search
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-foreground">{camp.name}</h1>

        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {camp.neighborhood && <span>{camp.neighborhood}</span>}
          <span>&middot;</span>
          <span>{ageLabel(camp.ageMin, camp.ageMax)}</span>
          <span>&middot;</span>
          <span>{formatLabel(camp.format)}</span>
        </div>

        {camp.interestTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {camp.interestTags.map((tag) => (
              <span key={tag} className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-medium text-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {camp.description && (
          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground/85">
            {camp.description}
          </p>
        )}

        <section className="mt-8 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Sessions</h2>
          {camp.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No session details available yet.</p>
          ) : (
            camp.sessions.map((session) => {
              const reg = registrationLabel(session.registrationStatus);
              return (
                <div key={session.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {session.startDate ?? "Dates not listed"}
                      {session.endDate ? ` – ${session.endDate}` : ""}
                    </p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${reg.className}`}>
                      {reg.text}
                    </span>
                  </div>
                  {session.hoursText && <p className="mt-1 text-sm text-muted-foreground">{session.hoursText}</p>}
                  {session.priceText && (
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{session.priceText}</p>
                  )}
                  {(session.ageMin !== null || session.ageMax !== null) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {ageLabel(session.ageMin, session.ageMax)}
                      {session.level ? ` · ${session.level}` : ""}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    {!guardian ? (
                      <Link
                        href="/login"
                        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-emerald"
                      >
                        Sign in to favorite this for your kid
                      </Link>
                    ) : guardianKidsList.length === 0 ? (
                      <Link
                        href="/kids"
                        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-emerald"
                      >
                        Add a kid to start favoriting
                      </Link>
                    ) : (
                      guardianKidsList.map((kid) => {
                        const isFavorited = favoritedBySession.get(session.id)?.has(kid.id) ?? false;
                        return (
                          <form key={kid.id} action={toggleFavorite}>
                            <input type="hidden" name="kidId" value={kid.id} />
                            <input type="hidden" name="sessionId" value={session.id} />
                            <input type="hidden" name="campId" value={camp.id} />
                            <button
                              type="submit"
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                isFavorited
                                  ? "bg-gold-soft text-foreground"
                                  : "bg-surface-muted text-muted-foreground hover:bg-emerald-soft"
                              }`}
                            >
                              {isFavorited ? "★" : "☆"} {kid.name}
                            </button>
                          </form>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {(camp.dropoffPickupInfo || camp.packingList) && (
          <section className="mt-8 flex flex-col gap-4">
            {camp.dropoffPickupInfo && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Drop-off &amp; pickup</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{camp.dropoffPickupInfo}</p>
              </div>
            )}
            {camp.packingList && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">What to pack</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{camp.packingList}</p>
              </div>
            )}
          </section>
        )}

        {camp.website && (
          <a
            href={camp.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-strong"
          >
            Visit camp website to start sign-up &rarr;
          </a>
        )}
      </main>
    </div>
  );
}
