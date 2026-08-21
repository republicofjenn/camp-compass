"use client";

import { useActionState } from "react";
import { requestConnection } from "@/app/actions/connections";

export default function ConnectionRequestForm() {
  const [state, action, pending] = useActionState(requestConnection, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Connect with another family</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter the other parent&apos;s Camp Compass email. They&apos;ll need to accept before anything is shared --
        your home address and budget are never shared, even after connecting.
      </p>
      <div className="flex gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="parent@example.com"
          className="flex-1 rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {pending ? "Sending..." : "Send Request"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
