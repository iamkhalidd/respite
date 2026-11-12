"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { moveIn, setRequestStatus, saveNotes } from "../../../actions";
import { STATUS_LABEL, type Status } from "@/lib/labels";
import { money } from "@/lib/format";
import { Label, btnPrimary, input } from "../../ui";

const STEPS: Status[] = ["NEW", "CONTACTED", "TOUR", "APPROVED"];
const STEP_HINT: Record<string, string> = {
  NEW: "Just came in",
  CONTACTED: "You have spoken",
  TOUR: "Visit is booked",
  APPROVED: "Ready to move in",
};

/** The four steps as a tappable list. The current one is lit. */
export function StatusSteps({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [pending, start] = useTransition();
  const set = (s: Status) => {
    if (s === current) return;
    setCurrent(s);
    start(() => setRequestStatus(id, s));
  };
  const at = STEPS.indexOf(current as Status);
  const declined = current === "DECLINED";
  return (
    <div>
      <ol className="grid gap-1">
        {STEPS.map((s, i) => {
          const on = s === current;
          const done = !declined && i < at;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => set(s)}
                aria-pressed={on}
                className={`press flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors duration-150 ${on ? "bg-ink text-white" : "hover:bg-ink/[.05]"}`}
              >
                <span
                  className={`mono grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.72rem] font-medium ${on ? "bg-porch text-ink" : done ? "bg-ink/[.08] text-ink" : "text-moss ring-1 ring-line-strong"}`}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.93rem] font-medium leading-tight">{STATUS_LABEL[s]}</span>
                  <span className={`block text-[0.78rem] leading-tight ${on ? "text-white/60" : "text-moss"}`}>{STEP_HINT[s]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <button
          type="button"
          onClick={() => set(declined ? "NEW" : "DECLINED")}
          className="press h-10 rounded-full px-3 text-[0.88rem] text-moss transition-colors hover:bg-ink/[.05] hover:text-ink"
        >
          {declined ? "Reopen this request" : "Mark as not a fit"}
        </button>
        <span className="mono pr-2 text-[0.72rem] uppercase text-moss" aria-live="polite">
          {pending ? "Saving" : declined ? "Not a fit" : ""}
        </span>
      </div>
    </div>
  );
}

export function Notes({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function onChange(v: string) {
    setValue(v);
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveNotes(id, v);
      setState("saved");
    }, 700);
  }
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        aria-label="Your notes"
        placeholder="Call notes, tour time, anything to remember"
        className="block w-full resize-y rounded-xl bg-oat p-3.5 text-[1rem] leading-relaxed outline-none ring-1 ring-transparent transition-shadow placeholder:text-ink/35 focus:bg-paper focus:ring-2 focus:ring-ink sm:text-[0.95rem]"
      />
      <p className="mono mt-2 h-4 text-[0.72rem] uppercase text-moss" aria-live="polite">
        {state === "saving" ? "Saving" : state === "saved" ? "Saved" : "Only you can see this"}
      </p>
    </div>
  );
}

export type BedOption = { id: string; label: string; roomName: string; rent: number; deposit: number; blocked?: string };

/** Picks the bed, fills in that room's rent and deposit, and shows what gets billed. */
export function MoveInForm({ requestId, firstName, beds, preferredId, today, hasEmail }: { requestId: string; firstName: string; beds: BedOption[]; preferredId?: string; today: string; hasEmail: boolean }) {
  const free = beds.filter((b) => !b.blocked);
  const first = free.find((b) => b.id === preferredId) ?? free[0];
  const [state, action, pending] = useActionState(moveIn.bind(null, requestId), null);
  const [bedId, setBedId] = useState(first?.id ?? "");
  const [rent, setRent] = useState(String(first?.rent ?? ""));
  const [deposit, setDeposit] = useState(String(first?.deposit ?? ""));
  const total = (Number(rent) || 0) + (Number(deposit) || 0);

  function pick(id: string) {
    setBedId(id);
    const b = beds.find((x) => x.id === id);
    if (b) {
      setRent(String(b.rent));
      setDeposit(String(b.deposit));
    }
  }

  return (
    <form action={action} className="grid gap-4">
      <fieldset>
        <legend className="mb-1.5 block text-[0.86rem] font-medium text-ink/75">Bed</legend>
        <div className="grid gap-1.5">
          {beds.map((b) => {
            const on = b.id === bedId;
            return (
              <label
                key={b.id}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 ring-1 transition-[background-color,box-shadow] duration-150 ${b.blocked ? "cursor-not-allowed opacity-55 ring-line" : on ? "cursor-pointer bg-porch-glow/45 ring-2 ring-ink" : "cursor-pointer ring-line-strong hover:bg-ink/[.03]"}`}
              >
                <input type="radio" name="bedId" value={b.id} checked={on} disabled={!!b.blocked} onChange={() => pick(b.id)} className="sr-only" />
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${on ? "bg-ink text-white" : "ring-1 ring-line-strong"}`}>{on && <Check size={11} strokeWidth={3.5} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.93rem] font-medium leading-tight">
                    {b.label} <span className="font-normal text-moss">· {b.roomName.replace("The ", "")}</span>
                  </span>
                  {b.blocked && <span className="block text-[0.78rem] leading-tight text-moss">{b.blocked}</span>}
                </span>
                <span className="mono tabular shrink-0 text-[0.8rem] text-moss">{money(b.rent * 100)}/mo</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label>
        <Label>Move-in date</Label>
        <input type="date" name="moveInDate" defaultValue={today} required className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <Label>Monthly rent ($)</Label>
          <input type="number" inputMode="decimal" name="rent" min={1} step="1" required value={rent} onChange={(e) => setRent(e.target.value)} className={`${input} mono tabular`} />
        </label>
        <label>
          <Label>Deposit ($)</Label>
          <input type="number" inputMode="decimal" name="deposit" min={0} step="1" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={`${input} mono tabular`} />
        </label>
      </div>

      <div className="flex items-baseline justify-between rounded-xl bg-oat px-4 py-3">
        <span className="text-[0.88rem] text-moss">Billed at move-in</span>
        <span className="mono tabular text-[1.15rem] font-medium tracking-[-0.03em]">{money(total * 100)}</span>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-ember/10 px-4 py-3 text-[0.9rem] leading-snug text-ember ring-1 ring-ember/25">
          {state.error}
        </p>
      )}

      <button disabled={pending || !bedId} className={`${btnPrimary} !h-12 w-full disabled:opacity-60`}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        Move in {firstName}
      </button>
      <p className="text-[0.82rem] leading-snug text-moss">
        Assigns the bed, bills the deposit and first month, and {hasEmail ? "emails them a link to pay online." : "makes a pay link you can text them. There is no email on file."}
      </p>
    </form>
  );
}
