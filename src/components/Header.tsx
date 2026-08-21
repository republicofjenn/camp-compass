import Link from "next/link";
import { getCurrentGuardian } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export default async function Header() {
  const guardian = await getCurrentGuardian();

  return (
    <header className="border-b border-black/[.08] bg-white px-6 py-5 dark:border-white/[.1] dark:bg-black sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div>
          <Link href="/" className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Camp Compass
          </Link>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Find SF Bay Area summer camps that match your kid&apos;s interests, age, and budget.
          </p>
        </div>

        <nav className="flex items-center gap-4 text-sm font-medium">
          {guardian ? (
            <>
              <Link href="/kids" className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50">
                My Kids
              </Link>
              <Link
                href="/favorites"
                className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Favorites
              </Link>
              <Link
                href="/connections"
                className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Connections
              </Link>
              <Link
                href="/profile"
                className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Profile
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-zinc-600 underline underline-offset-2 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-foreground px-4 py-2 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
