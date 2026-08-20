"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";

const inputClass =
  "rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]";

export default function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signInPending] = useActionState(signIn, undefined);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, undefined);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex gap-2 rounded-full bg-black/[.05] p-1 dark:bg-white/[.08]">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Create Account
        </button>
      </div>

      {mode === "signin" ? (
        <form action={signInAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Password
            </label>
            <input id="password" name="password" type="password" required className={inputClass} />
          </div>
          {signInState?.error && <p className="text-sm text-red-600 dark:text-red-400">{signInState.error}</p>}
          <button
            type="submit"
            disabled={signInPending}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
          >
            {signInPending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : (
        <form action={signUpAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Your name
            </label>
            <input id="name" name="name" type="text" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="signup-email" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Email
            </label>
            <input id="signup-email" name="email" type="email" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="signup-password" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={8}
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-500">At least 8 characters.</p>
          </div>
          {signUpState?.error && <p className="text-sm text-red-600 dark:text-red-400">{signUpState.error}</p>}
          <button
            type="submit"
            disabled={signUpPending}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
          >
            {signUpPending ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
