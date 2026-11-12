"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus, X, Loader2, Check } from "lucide-react";
import type { TourSettings } from "@/lib/types";
import { clock, longDay, WEEKDAYS_MON_FIRST } from "@/lib/when";
import { bookTourForCaller, saveTourSettings, type FormState } from "../../actions";
import { Card, CardHead, Label, btnPrimary, btnQuiet, input } from "../ui";
import { SubmitButton } from "../submit";

const chip = "inline-flex h-7 items-center gap-1 rounded-full bg-ink/[.06] pl-2.5 pr-1 text-[0.8rem]";
const chipX = "grid h-5 w-5 place-items-center rounded-full text-moss hover:bg-ink/10 hover:text-ink";

/** The weekly times visitors can pick from, plus days the house is closed for tours. */
export function ScheduleEditor({ initial }: { initial: TourSettings }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [adding, setAdding] = useState<Record<number, string>>({});
  const [closed, setClosed] = useState("");
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  const set = (patch: Partial<TourSettings>) => {
    setState(null);
    setS({ ...s, ...patch });
  };
  const addSlot = (day: number) => {
    const time = adding[day];
    if (!time) return;
    set({ slots: [...s.slots.filter((x) => !(x.day === day && x.time === time)), { day, time }].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)) });
    setAdding({ ...adding, [day]: "" });
  };
  const save = () =>
    start(async () => {
      const res = await saveTourSettings(s);
      setState(res);
      if (res?.ok) setSaved(s);
    });

  return (
    <Card>
      <CardHead
        title="Weekly schedule"
        hint="Visitors can book these times on the site. All times are house time."
        action={
          <button
            type="button"
            role="switch"
            aria-checked={s.enabled}
            aria-label="Online tour booking"
            onClick={() => set({ enabled: !s.enabled })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${s.enabled ? "bg-ink" : "bg-ink/15"}`}
          >
            <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out)] ${s.enabled ? "translate-x-5" : ""}`} />
          </button>
        }
      />
      <div className="px-5 pb-5 pt-4 sm:px-6">
        <p className="mb-4 text-[0.88rem] font-medium">{s.enabled ? "Online booking is on." : "Online booking is off. The tour page shows your phone number instead."}</p>
        <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
          {WEEKDAYS_MON_FIRST.map((name, day) => {
            const times = s.slots.filter((x) => x.day === day);
            return (
              <li key={name} className="px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.92rem] font-medium">{name}</span>
                  <span className="flex items-center gap-1.5">
                    <input
                      type="time"
                      step={900}
                      aria-label={`New ${name} time`}
                      value={adding[day] ?? ""}
                      onChange={(e) => setAdding({ ...adding, [day]: e.target.value })}
                      className={`${input} !h-9 !w-[7.5rem] !text-[0.88rem]`}
                    />
                    <button type="button" aria-label={`Add ${name} time`} disabled={!adding[day]} onClick={() => addSlot(day)} className={`${btnQuiet} !h-9 !w-9 !px-0 disabled:opacity-40`}>
                      <Plus size={16} />
                    </button>
                  </span>
                </div>
                {times.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {times.map((t) => (
                      <span key={t.time} className={`${chip} mono`}>
                        {clock(t.time)}
                        <button type="button" aria-label={`Remove ${name} ${clock(t.time)}`} onClick={() => set({ slots: s.slots.filter((x) => x !== t) })} className={chipX}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-5">
          <Label>Closed for tours</Label>
          <div className="flex gap-1.5">
            <input type="date" value={closed} onChange={(e) => setClosed(e.target.value)} className={input} aria-label="Day closed for tours" />
            <button
              type="button"
              disabled={!closed}
              onClick={() => {
                set({ closedDays: [...new Set([...s.closedDays, closed])].sort() });
                setClosed("");
              }}
              className={`${btnQuiet} disabled:opacity-40`}
            >
              Add
            </button>
          </div>
          {s.closedDays.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.closedDays.map((d) => (
                <span key={d} className={chip}>
                  {longDay(d)}
                  <button type="button" aria-label={`Open ${longDay(d)} again`} onClick={() => set({ closedDays: s.closedDays.filter((x) => x !== d) })} className={chipX}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label>
            <Label>Days ahead to show</Label>
            <input type="number" min={3} max={90} value={s.daysAhead} onChange={(e) => set({ daysAhead: Number(e.target.value) })} className={input} />
          </label>
          <label>
            <Label>Notice needed (hours)</Label>
            <input type="number" min={0} max={168} value={s.minNoticeHours} onChange={(e) => set({ minNoticeHours: Number(e.target.value) })} className={input} />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={!dirty || pending} className={`${btnPrimary} disabled:opacity-40`}>
            {pending && <Loader2 size={15} className="animate-spin" />}
            Save schedule
          </button>
          {state?.ok && !dirty && (
            <span className="inline-flex items-center gap-1 text-[0.88rem] text-moss">
              <Check size={14} /> Saved
            </span>
          )}
          {state?.error && (
            <span role="alert" className="text-[0.88rem] font-medium text-ember">
              {state.error}
            </span>
          )}
        </div>
        {s.enabled && s.slots.length === 0 && <p className="mt-3 text-[0.85rem] text-moss">Add at least one weekly time. Until then visitors are told every time is taken.</p>}
      </div>
    </Card>
  );
}

/** For someone who called: any date and time, not just the weekly ones. */
export function CallerForm() {
  const [state, action] = useActionState(bookTourForCaller, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHead title="Book for a caller" hint="Any date and time works here. Add an email and they get the confirmation and a reminder." />
      <form ref={form} action={action} className="grid gap-3 px-5 pb-5 pt-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3">
          <label>
            <Label>Date</Label>
            <input name="date" type="date" required className={input} />
          </label>
          <label>
            <Label>Time</Label>
            <input name="time" type="time" step={900} required className={input} />
          </label>
        </div>
        <label>
          <Label>Name</Label>
          <input name="name" required minLength={2} autoComplete="off" className={input} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <Label>Phone</Label>
            <input name="phone" type="tel" required minLength={7} autoComplete="off" className={input} />
          </label>
          <label>
            <Label>Email (optional)</Label>
            <input name="email" type="email" autoComplete="off" className={input} />
          </label>
        </div>
        <label>
          <Label>Note (optional)</Label>
          <input name="note" maxLength={1000} className={input} />
        </label>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <SubmitButton className={btnPrimary}>Book the tour</SubmitButton>
          {state?.ok && <span className="text-[0.88rem] text-moss">{state.ok}</span>}
          {state?.error && (
            <span role="alert" className="text-[0.88rem] font-medium text-ember">
              {state.error}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

/** A private calendar address, so every tour shows up in the owners' own phone calendar. */
export function FeedCard({ url, reset }: { url: string; reset: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  const webcal = url.replace(/^https?:/, "webcal:");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHead title="Your phone calendar" hint="Subscribe once and every booked tour shows up there. Calendar apps check for new ones on their own schedule, which can take a few hours." />
      <div className="space-y-3 px-5 pb-5 pt-4 sm:px-6">
        <input readOnly value={url} aria-label="Calendar address" onFocus={(e) => e.currentTarget.select()} className={`${input} mono !text-[0.8rem]`} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={`${btnPrimary} !h-10 !px-4 !text-[0.88rem]`}>
            {copied ? <Check size={15} strokeWidth={3} /> : null} {copied ? "Copied" : "Copy address"}
          </button>
          <a href={webcal} className={`${btnQuiet} !h-10 !px-4 !text-[0.88rem]`}>
            Open in calendar
          </a>
        </div>
        <p className="text-[0.82rem] leading-relaxed text-moss">
          In Google Calendar, choose Other calendars, then From URL, and paste it. Anyone with this address can see tour names and phone numbers, so keep it to the team.
        </p>
        {sure ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-ink/[.04] p-3 text-[0.84rem]">
            <span className="flex-1">The old address stops working. Everyone subscribed will need the new one.</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => { await reset(); setSure(false); })}
              className={`${btnQuiet} !h-9 !px-3 !text-[0.84rem]`}
            >
              {pending && <Loader2 size={14} className="animate-spin" />} Make a new one
            </button>
            <button type="button" onClick={() => setSure(false)} className="h-9 px-2 text-moss hover:text-ink">
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setSure(true)} className="text-[0.84rem] font-medium text-moss underline decoration-line-strong underline-offset-4 hover:text-ink">
            Shared it by mistake? Get a new address
          </button>
        )}
      </div>
    </Card>
  );
}
