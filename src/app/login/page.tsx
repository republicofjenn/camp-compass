import { redirect } from "next/navigation";
import { getCurrentGuardian } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const guardian = await getCurrentGuardian();
  if (guardian) redirect("/kids");

  const sp = await props.searchParams;
  const confirmError = sp.confirm_error === "1";

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-emerald">Camp Compass</h1>
        {confirmError && (
          <p className="mb-6 max-w-sm rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-800">
            That confirmation link didn&apos;t work -- it may have expired. Sign up again, or sign in if you&apos;ve
            already confirmed.
          </p>
        )}
        <LoginForm />
      </main>
    </div>
  );
}
