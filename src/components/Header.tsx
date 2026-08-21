import Link from "next/link";
import { getCurrentGuardian } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export default async function Header() {
  const guardian = await getCurrentGuardian();

  return (
    <header className="border-b border-border bg-surface px-6 py-4 sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-emerald">
          Camp Compass
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium">
          {guardian ? (
            <>
              <Link href="/kids" className="text-foreground/80 hover:text-emerald">
                My Kids
              </Link>
              <Link href="/favorites" className="text-foreground/80 hover:text-emerald">
                Favorites
              </Link>
              <Link href="/connections" className="text-foreground/80 hover:text-emerald">
                Connections
              </Link>
              <Link href="/profile" className="text-foreground/80 hover:text-emerald">
                Profile
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-emerald px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-strong"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
