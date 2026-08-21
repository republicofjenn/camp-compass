"use client";

import { useActionState, useRef } from "react";
import { addKid } from "@/app/actions/kids";
import { monthName } from "@/lib/age";

const inputClass =
  "rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-emerald";

type InterestOption = { id: string; name: string; category: string | null };

export default function AddKidForm({ interestOptions }: { interestOptions: InterestOption[] }) {
  const [state, action, pending] = useActionState(addKid, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const grouped = new Map<string, InterestOption[]>();
  for (const i of interestOptions) {
    const key = i.category ?? "other";
    const list = grouped.get(key) ?? [];
    list.push(i);
    grouped.set(key, list);
  }

  const years = Array.from({ length: 19 }, (_, i) => new Date().getFullYear() - i);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-foreground">Add a kid</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input id="name" name="name" type="text" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="birthMonth" className="text-xs font-medium text-muted-foreground">
            Birth month
          </label>
          <select id="birthMonth" name="birthMonth" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select month
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="birthYear" className="text-xs font-medium text-muted-foreground">
            Birth year
          </label>
          <select id="birthYear" name="birthYear" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select year
            </option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Interests</p>
        <div className="flex flex-col gap-3">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {items.map((i) => (
                  <label key={i.id} className="flex items-center gap-1.5 text-sm text-foreground/85">
                    <input type="checkbox" name="interests" value={i.id} className="h-4 w-4 accent-emerald" />
                    {i.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-strong disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add Kid"}
      </button>
    </form>
  );
}
