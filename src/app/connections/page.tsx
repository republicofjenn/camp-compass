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
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Family Connections
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Connect with other parents to see which camps your kids&apos; friends are attending -- only once both
          sides agree, and only for the specific kids you choose to share.
        </p>

        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Requests for you</h2>
            <ul className="flex flex-col gap-3">
              {incoming.map((c) => (
                <li
                  key={c.connectionId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
                >
                  <span className="text-sm text-foreground">
                    <strong>{c.partnerName}</strong> wants to connect
                  </span>
                  <div className="flex gap-2">
                    <form action={respondToConnection}>
                      <input type="hidden" name="connectionId" value={c.connectionId} />
                      <input type="hidden" name="status" value="accepted" />
                      <button
                        type="submit"
                        className="rounded-full bg-emerald px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-strong"
                      >
                        Accept
                      </button>
                    </form>
                    <form action={respondToConnection}>
                      <input type="hidden" name="connectionId" value={c.connectionId} />
                      <input type="hidden" name="status" value="declined" />
                      <button
                        type="submit"
                        className="rounded-full bg-surface-muted px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-emerald-soft"
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
            <h2 className="mb-3 text-lg font-semibold text-foreground">Sent requests</h2>
            <ul className="flex flex-col gap-3">
              {outgoing.map((c) => (
                <li
                  key={c.connectionId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
                >
                  <span className="text-sm text-muted-foreground">
                    Waiting for <strong className="text-foreground">{c.partnerName}</strong> to
                    respond
                  </span>
                  <form action={respondToConnection}>
                    <input type="hidden" name="connectionId" value={c.connectionId} />
                    <input type="hidden" name="status" value="declined" />
                    <button
                      type="submit"
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-emerald"
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
            <h2 className="mb-3 text-lg font-semibold text-foreground">Connected families</h2>
            <ul className="flex flex-col gap-4">
              {accepted.map((c) => (
                <li
                  key={c.connectionId}
                  className="rounded-xl border border-border bg-surface p-4 shadow-sm"
                >
                  <p className="mb-2 font-medium text-foreground">{c.partnerName}</p>
                  {myKids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Add a kid to share their schedule.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-muted-foreground">
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
                                  ? "bg-gold-soft text-foreground"
                                  : "bg-surface-muted text-muted-foreground hover:bg-emerald-soft"
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
