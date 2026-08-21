"use client";

import { useActionState } from "react";
import { requestConnection } from "@/app/actions/connections";

export default function ConnectionRequestForm() {
  const [state, action, pending] = useActionState(requestConnection, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Connect with another family</h2>
      <p className="text-sm text-muted-foreground">
        Enter the other parent&apos;s Camp Compass email. They&apos;ll need to accept before anything is shared --
        your home address and budget are never shared, even after connecting.
      </p>
      <div className="flex gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="parent@example.com"
          className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-emerald"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-strong disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send Request"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
