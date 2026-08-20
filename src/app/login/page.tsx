import { redirect } from "next/navigation";
import { getCurrentGuardian } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const guardian = await getCurrentGuardian();
  if (guardian) redirect("/kids");

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Camp Compass
        </h1>
        <LoginForm />
      </main>
    </div>
  );
}
