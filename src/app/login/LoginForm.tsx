"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, resendConfirmation } from "@/app/actions/auth";

const inputClass =
  "rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-emerald";

function CheckEmailNotice({ email }: { email: string }) {
  const [resendState, resendAction, resendPending] = useActionState(resendConfirmation, undefined);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
      <p className="text-3xl">📬</p>
      <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
      <p className="text-sm text-muted-foreground">
        We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate
        your account, then come back here to sign in.
      </p>
      <p className="text-xs text-muted-foreground">Didn&apos;t get it? Check spam, or resend below.</p>
      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={resendPending}
          className="text-sm font-medium text-emerald underline underline-offset-2 hover:text-emerald-strong disabled:opacity-60"
        >
          {resendPending ? "Resending..." : "Resend confirmation email"}
        </button>
      </form>
      {resendState?.checkEmail && <p className="text-xs text-emerald-strong">Sent again.</p>}
      {resendState?.error && <p className="text-xs text-red-600">{resendState.error}</p>}
    </div>
  );
}

export default function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signInPending] = useActionState(signIn, undefined);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, undefined);

  if (signUpState?.checkEmail) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <CheckEmailNotice email={signUpState.checkEmail} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex gap-2 rounded-full bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            mode === "signin" ? "bg-white text-emerald shadow-sm" : "text-muted-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            mode === "signup" ? "bg-white text-emerald shadow-sm" : "text-muted-foreground"
          }`}
        >
          Create Account
        </button>
      </div>

      {mode === "signin" ? (
        <form action={signInAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <input id="password" name="password" type="password" required className={inputClass} />
          </div>
          {signInState?.error && <p className="text-sm text-red-600">{signInState.error}</p>}
          <button
            type="submit"
            disabled={signInPending}
            className="rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-strong disabled:opacity-60"
          >
            {signInPending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : (
        <form action={signUpAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-xs font-medium text-muted-foreground">
              Your name
            </label>
            <input id="name" name="name" type="text" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input id="signup-email" name="email" type="email" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          {signUpState?.error && <p className="text-sm text-red-600">{signUpState.error}</p>}
          <button
            type="submit"
            disabled={signUpPending}
            className="rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-strong disabled:opacity-60"
          >
            {signUpPending ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
