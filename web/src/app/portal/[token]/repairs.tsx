"use client";
import { useActionState, useEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { reportRepair } from "./actions";
import type { Repair } from "@/lib/types";

// same list the API accepts; anything else is filed as Other
const AREAS = ["Bedroom", "Bathroom", "Kitchen", "Laundry", "Heat or air", "Outside", "Other"];
const STATUS = { OPEN: "Sent", DOING: "Being fixed", DONE: "Fixed" } as const;
const field =
  "w-full rounded-xl bg-paper px-3.5 text-[1rem] ring-1 ring-line-strong outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-ink";
const day = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

/** Something broken? Residents tell the house here instead of hunting for the manager. */
export function Repairs({ token, repairs, phone }: { token: string; repairs: Repair[]; phone: { label: string; href: string } }) {
  const [state, action, pending] = useActionState(reportRepair.bind(null, token), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <section className="mt-10" aria-labelledby="repairs">
      <h2 id="repairs" className="eyebrow">
        Something broken?
      </h2>
      <form ref={form} action={action} className="mt-3 grid gap-3 rounded-2xl bg-paper p-5 ring-1 ring-line">
        <label>
          <span className="mb-1.5 block text-[0.86rem] font-medium text-ink/75">Where</span>
          <select name="area" defaultValue="Bedroom" className={`${field} h-11`}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[0.86rem] font-medium text-ink/75">What needs fixing</span>
          <textarea name="body" required minLength={3} maxLength={2000} rows={3} placeholder="The bathroom sink drips all night." className={`${field} resize-y py-2.5`} />
        </label>
        <label className="flex items-start gap-3 text-[0.92rem]">
          <input name="urgent" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--ember)]" />
          <span>
            <span className="font-medium">It&apos;s urgent</span>
            <span className="block text-[0.84rem] text-moss">
              No heat, a leak, a broken lock. For anything dangerous, call{" "}
              <a href={phone.href} className="font-medium text-ink underline decoration-line-strong underline-offset-4">
                {phone.label}
              </a>{" "}
              now.
            </span>
          </span>
        </label>
        {state?.error && (
          <p role="alert" className="rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={pending}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-[0.95rem] font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#2a2d2b] active:scale-[0.97] disabled:opacity-60"
          >
            {pending && <Loader2 size={15} className="animate-spin" />} Send to the house
          </button>
          <span className="flex items-center gap-1.5 text-[0.86rem] text-moss" aria-live="polite">
            {!pending && state?.ok && (
              <>
                <Check size={14} strokeWidth={3} /> {state.ok}
              </>
            )}
          </span>
        </div>
      </form>

      {repairs.length > 0 && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
          {repairs.map((x) => (
            <li key={x.id} className="px-5 py-3.5">
              <p className="flex items-center justify-between gap-3 text-[0.82rem] text-moss">
                <span>
                  {x.area} · {day(x.createdAt)}
                </span>
                <span className={`mono rounded-full px-2 py-0.5 text-[0.66rem] font-medium uppercase ${x.status === "DONE" ? "bg-ink/[.06] text-ink" : "bg-porch-glow text-ink"}`}>
                  {STATUS[x.status]}
                </span>
              </p>
              <p className="mt-1 line-clamp-3 text-[0.93rem]">{x.body}</p>
              {x.status === "DONE" && x.ownerNote && <p className="mt-1 text-[0.86rem] text-moss">From the house: {x.ownerNote}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
