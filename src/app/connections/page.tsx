import { redirect } from "next/navigation";
import { getCurrentGuardian, getGuardianKids } from "@/lib/auth";
import { getMyConnections, getKidSharesForConnections } from "@/lib/connections";
import { respondToConnection, setKidShare } from "@/app/actions/connections";
import ConnectionRequestForm from "./ConnectionRequestForm";

export default async function ConnectionsPage() {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");

  const [connections, myKids] = await Promise.all([
    getMyConnections(guardian.id),
    getGuardianKids(guardian.id),
  ]);

  const accepted = connections.filter((c) => c.status === "accepted");
  const incoming = connections.filter((c) => c.status === "pending" && c.requestedByGuardianId !== guardian.id);
  const outgoing = connections.filter((c) => c.status === "pending" && c.requestedByGuardianId === guardian.id);

  const shares = await getKidSharesForConnections(
    guardian.id,
    accepted.map((c) => c.connectionId),
  );
  const sharedSet = new Set(shares.filter((s) => s.shared).map((s) => `${s.connectionId}:${s.kidId}`));

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Family Connections
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Connect with other parents to see which camps your kids&apos; friends are attending -- only once both
          sides agree, and only for the specific kids you choose to share.
        </p>

        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Requests for you</h2>
            <ul className="flex flex-col gap-3">
              {incoming.map((c) => (
                <li
                  key={c.connectionId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.1] dark:bg-zinc-950"
                >
                  <span className="text-sm text-black dark:text-zinc-50">
                    <strong>{c.partnerName}</strong> wants to connect
                  </span>
                  <div className="flex gap-2">
                    <form action={respondToConnection}>
                      <input type="hidden" name="connectionId" value={c.connectionId} />
                      <input type="hidden" name="status" value="accepted" />
                      <button
                        type="submit"
                        className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
                      >
                        Accept
                      </button>
                    </form>
                    <form action={respondToConnection}>
                      <input type="hidden" name="connectionId" value={c.connectionId} />
                      <input type="hidden" name="status" value="declined" />
                      <button
                        type="submit"
                        className="rounded-full bg-black/[.06] px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-black/[.1] dark:bg-white/[.08] dark:text-zinc-300 dark:hover:bg-white/[.14]"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Sent requests</h2>
            <ul className="flex flex-col gap-3">
              {outgoing.map((c) => (
                <li
                  key={c.connectionId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.1] dark:bg-zinc-950"
                >
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Waiting for <strong className="text-black dark:text-zinc-50">{c.partnerName}</strong> to
                    respond
                  </span>
                  <form action={respondToConnection}>
                    <input type="hidden" name="connectionId" value={c.connectionId} />
                    <input type="hidden" name="status" value="declined" />
                    <button
                      type="submit"
                      className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Cancel
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}

        {accepted.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Connected families</h2>
            <ul className="flex flex-col gap-4">
              {accepted.map((c) => (
                <li
                  key={c.connectionId}
                  className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.1] dark:bg-zinc-950"
                >
                  <p className="mb-2 font-medium text-black dark:text-zinc-50">{c.partnerName}</p>
                  {myKids.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Add a kid to share their schedule.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        Share which kid&apos;s camp plans with {c.partnerName}:
                      </p>
                      {myKids.map((kid) => {
                        const isShared = sharedSet.has(`${c.connectionId}:${kid.id}`);
                        return (
                          <form key={kid.id} action={setKidShare} className="flex items-center gap-2">
                            <input type="hidden" name="connectionId" value={c.connectionId} />
                            <input type="hidden" name="kidId" value={kid.id} />
                            <input type="hidden" name="shared" value={(!isShared).toString()} />
                            <button
                              type="submit"
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                isShared
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                  : "bg-black/[.06] text-zinc-700 hover:bg-black/[.1] dark:bg-white/[.08] dark:text-zinc-300 dark:hover:bg-white/[.14]"
                              }`}
                            >
                              {isShared ? "✓ Sharing" : "Share"} {kid.name}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <ConnectionRequestForm />
      </main>
    </div>
  );
}
