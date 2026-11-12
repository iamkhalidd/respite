"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, ArrowLeft, Loader2, CalendarCheck } from "lucide-react";
import { Q, Field, tile } from "../apply/flow";
import { bookTour, tourSlots, type Program } from "./actions";
import { clock, dayChip, longDay } from "@/lib/when";

type Day = { date: string; times: string[] };
type Phone = { label: string; href: string };

const PROGRAMS: [Program, string][] = [
  ["VETERAN", "Veteran"],
  ["RECOVERY", "In recovery"],
  ["SENIOR", "Independent senior"],
];

export function Booking({ days: initialDays, phone, address }: { days: Day[]; phone: Phone; address: string }) {
  const [days, setDays] = useState(initialDays);
  const [date, setDate] = useState(initialDays[0]?.date ?? "");
  const [time, setTime] = useState("");
  const [step, setStep] = useState<"when" | "you">("when");
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });
  const [program, setProgram] = useState<Program | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ firstName: string; when: string; email: boolean } | null>(null);
  const [pending, start] = useTransition();
  const reduce = useReducedMotion();

  const day = days.find((d) => d.date === date);
  const canSend = form.name.trim().length >= 2 && form.phone.replace(/\D/g, "").length >= 7;

  function submit() {
    setError(null);
    start(async () => {
      const res = await bookTour({ date, time, ...form, email: form.email.trim() || undefined, note: form.note.trim() || undefined, program });
      if (res.ok) {
        setDone({ firstName: res.firstName, when: res.when, email: !!form.email.trim() });
        return;
      }
      setError(res.error);
      if (res.taken) {
        // someone else got there first: show what's left and send them back to choose
        const fresh = await tourSlots().catch(() => null);
        if (fresh) setDays(fresh.days);
        setTime("");
        setStep("when");
      }
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-5 sm:px-6">
        <Link href="/" aria-label="Close and go home" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink">
          <X size={22} />
        </Link>
        <p className="mono text-[0.78rem] uppercase text-moss">Book a tour</p>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-10 sm:px-6 sm:pt-16">
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.section
              key="done"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
              className="flex flex-col items-center text-center"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-porch text-ink shadow-[0_0_40px_rgb(240_165_58/.55)]">
                <CalendarCheck size={28} />
              </span>
              <h1 className="display-2 mt-7 text-[clamp(2.2rem,5.6vw,3.6rem)]" style={{ textWrap: "balance" }}>
                See you {done.when}.
              </h1>
              <p className="mt-4 max-w-md text-[1.05rem] text-ink/70" style={{ textWrap: "pretty" }}>
                {done.email ? "We emailed the details and a link to cancel if plans change. You'll get a reminder the day before." : "We'll call the day before to confirm."}{" "}
                The house is at {address}. Questions? Call{" "}
                <a href={phone.href} className="font-semibold text-ink underline underline-offset-4">
                  {phone.label}
                </a>
                .
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/rooms" className="btn btn-primary press !h-12 !px-6">Look at rooms</Link>
                <Link href="/" className="btn btn-ghost press !h-12 !px-6">Back to home</Link>
              </div>
            </motion.section>
          ) : (
            <motion.div
              key={step}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: step === "you" ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: step === "you" ? -40 : 40 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            >
              {step === "when" ? (
                <Q title="When would you like to visit?" hint="A tour takes about half an hour. You'll see the rooms, the kitchen and the porch.">
                  {days.length === 0 ? (
                    <p className="rounded-2xl bg-oat p-5 text-[1.02rem]">
                      Every time is taken right now. Call{" "}
                      <a href={phone.href} className="font-semibold underline underline-offset-4">
                        {phone.label}
                      </a>{" "}
                      and we&apos;ll find one that works.
                    </p>
                  ) : (
                    <>
                      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="radiogroup" aria-label="Day">
                        <div className="flex gap-2.5">
                          {days.map((d) => {
                            const c = dayChip(d.date);
                            const on = d.date === date;
                            return (
                              <button
                                key={d.date}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                aria-label={longDay(d.date)}
                                onClick={() => {
                                  setDate(d.date);
                                  setTime("");
                                }}
                                className={`${tile(on)} !w-[4.6rem] shrink-0 !items-center !px-2 !py-3.5 text-center`}
                              >
                                <span className="mono text-[0.72rem] uppercase text-ink/55">{c.weekday}</span>
                                <span className="mt-0.5 text-[1.5rem] font-semibold leading-none tabular">{c.day}</span>
                                <span className="mt-1 text-[0.78rem] text-ink/55">{c.month}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {day && (
                        <div className="mt-8">
                          <p className="mb-3 text-[0.95rem] font-medium text-ink/75">{longDay(day.date)}</p>
                          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Time">
                            {day.times.map((t) => (
                              <button
                                key={t}
                                type="button"
                                role="radio"
                                aria-checked={time === t}
                                onClick={() => setTime(t)}
                                className={`${tile(time === t)} !items-center !py-4 text-[1.05rem] font-semibold tabular`}
                              >
                                {clock(t)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Q>
              ) : (
                <Q title="Who's coming?" hint={`${longDay(date)} at ${clock(time)}. Bring anyone you like: family, a case manager, a friend.`}>
                  <div className="grid gap-4">
                    <Field label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" autoFocus />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} autoComplete="tel" />
                      <Field label="Email (for the reminder)" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" />
                    </div>
                    <fieldset>
                      <legend className="mb-2 block text-[0.92rem] font-medium text-ink/75">Who&apos;s the room for? (optional)</legend>
                      <div className="flex flex-wrap gap-2">
                        {PROGRAMS.map(([v, label]) => (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={program === v}
                            onClick={() => setProgram(program === v ? undefined : v)}
                            className={`press h-11 rounded-full px-4 text-[0.95rem] font-medium ring-1 transition-colors ${program === v ? "bg-ink text-white ring-ink" : "bg-paper ring-line hover:ring-line-strong"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <label className="block">
                      <span className="mb-2 block text-[0.92rem] font-medium text-ink/75">Anything we should know? (optional)</span>
                      <textarea
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        rows={3}
                        maxLength={1000}
                        placeholder="Coming with a family member, need a ramp, running late…"
                        className="w-full resize-none rounded-2xl bg-paper p-5 text-[1.05rem] ring-1 ring-line outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-pine"
                      />
                    </label>
                  </div>
                </Q>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!done && days.length > 0 && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <button type="button" onClick={() => { setError(null); setStep("when"); }} disabled={step === "when"} className="btn btn-ghost press disabled:invisible">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
              {error && (
                <p role="alert" className="min-w-0 text-right text-[0.9rem] font-medium text-ember">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={step === "when" ? () => { setError(null); setStep("you"); } : submit}
                disabled={(step === "when" ? !time : !canSend) || pending}
                className="btn press !h-12 min-w-[9.5rem] shrink-0 bg-ink text-white shadow-[0_4px_0_#000] transition-[transform,box-shadow,opacity] active:translate-y-[3px] active:shadow-[0_1px_0_#000] disabled:opacity-35 disabled:shadow-none"
              >
                {pending ? <Loader2 size={18} className="animate-spin" /> : step === "when" ? "Continue" : "Book the tour"}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
