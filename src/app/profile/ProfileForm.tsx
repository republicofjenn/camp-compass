"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";

const inputClass =
  "rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.15] dark:text-zinc-50 dark:focus:border-white/[.4]";

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 25];

type Props = {
  hasHomeLocation: boolean;
  radiusMiles: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
};

export default function ProfileForm({ hasHomeLocation, radiusMiles, budgetMin, budgetMax }: Props) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950">
      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Home address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          placeholder="123 Main St, San Francisco, CA"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {hasHomeLocation
            ? "A location is on file. We only ever store an approximate coordinate, never the address text -- enter a new address here to update it."
            : "Used only to calculate distance to camps. We store an approximate coordinate (~100m precision), never the address itself."}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="radiusMiles" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Default search radius
        </label>
        <select id="radiusMiles" name="radiusMiles" defaultValue={radiusMiles ?? 5} className={inputClass}>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r} miles
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="budgetMin" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Budget min ($/week)
          </label>
          <input
            id="budgetMin"
            name="budgetMin"
            type="number"
            min={0}
            step="1"
            defaultValue={budgetMin !== null ? (budgetMin / 100).toFixed(0) : ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="budgetMax" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Budget max ($/week)
          </label>
          <input
            id="budgetMax"
            name="budgetMax"
            type="number"
            min={0}
            step="1"
            defaultValue={budgetMax !== null ? (budgetMax / 100).toFixed(0) : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
