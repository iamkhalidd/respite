"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, ArrowLeft, Check, User, Users, Briefcase, Medal, Sprout, Armchair, Loader2 } from "lucide-react";
import { submitRequest, type RequestInput } from "./actions";
import { House, WindowRow } from "@/components/house";
import type { BedState } from "@/lib/availability";
import { money, shortDate } from "@/lib/format";

type RoomOpt = { slug: string; name: string; kind: string; floor: string; rentCents: number; tone: string; states: BedState[]; open: number; soon: string | null };
type Data = Partial<RequestInput>;
type StepId = "forWhom" | "referrer" | "program" | "room" | "moveIn" | "payment" | "contact" | "message";

export function Flow({ rooms, initialRoom, initialFor, phone }: { rooms: RoomOpt[]; initialRoom?: string; initialFor?: "PROFESSIONAL"; phone: { label: string; href: string } }) {
  const [data, setData] = useState<Data>({ room: initialRoom, forWhom: initialFor });
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const reduce = useReducedMotion();

  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ["forWhom"];
    if (data.forWhom === "PROFESSIONAL") s.push("referrer");
    s.push("program", "room", "moveIn", "payment", "contact", "message");
    return s;
  }, [data.forWhom]);
  const step = steps[i];
  const progress = done ? 1 : i / steps.length;

  const set = (patch: Data) => setData((d) => ({ ...d, ...patch }));
  const go = (delta: number) => {
    setError(null);
    setDir(delta);
    setI((n) => Math.max(0, Math.min(steps.length - 1, n + delta)));
  };
  const pick = (patch: Data) => {
    set(patch);
    // Let the selected state register before moving on
    setTimeout(() => go(1), reduce ? 0 : 260);
  };

  const who = data.forWhom === "SELF" ? "you" : "them";
  const whose = data.forWhom === "SELF" ? "your" : "their";

  const canContinue: Record<StepId, boolean> = {
    forWhom: !!data.forWhom,
    referrer: !!data.referrerName?.trim() && !!(data.referrerPhone?.trim() || data.referrerEmail?.trim()),
    program: !!data.program,
    room: data.room !== undefined,
    moveIn: !!data.moveIn,
    payment: !!data.payment,
    contact: !!data.name?.trim() && (data.phone?.replace(/\D/g, "").length ?? 0) >= 7,
    message: true,
  };

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitRequest({ ...(data as RequestInput), room: data.room || undefined });
      if (res.ok) setDone(res.firstName);
      else setError(res.error);
    });
  }

  const isLast = i === steps.length - 1;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {/* Top bar: close + progress */}
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-5 sm:px-6">
        <Link href="/" aria-label="Close and go home" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink">
          <X size={22} />
        </Link>
        <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-porch"
            initial={false}
            animate={{ width: `${Math.max(progress * 100, 4)}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.6, bounce: 0.25 }}
          >
            <span className="absolute inset-x-2 top-[3px] h-[3px] rounded-full bg-paper/30" />
          </motion.div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-10 sm:px-6 sm:pt-16">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          {done ? (
            <Done key="done" name={done} rooms={rooms} phone={phone} />
          ) : (
            <motion.div
              key={step}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40, filter: "blur(4px)" }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            >
              {step === "forWhom" && (
                <Q title="Who's looking for a room?" hint="We'll tailor the next few questions.">
                  <Choices
                    value={data.forWhom}
                    onPick={(v) => pick({ forWhom: v as RequestInput["forWhom"] })}
                    options={[
                      ["SELF", "Me", "I'm looking for a place to live", User],
                      ["FAMILY", "A family member", "A parent, sibling, child or friend", Users],
                      ["PROFESSIONAL", "A client", "I'm a case manager, social worker or discharge planner", Briefcase],
                    ]}
                  />
                </Q>
              )}

              {step === "referrer" && (
                <Q title="First, a bit about you." hint="So we know who to call back about this referral.">
                  <Fields>
                    <Field label="Your name" value={data.referrerName} onChange={(v) => set({ referrerName: v })} autoComplete="name" autoFocus />
                    <Field label="Organization" value={data.referrerOrg} onChange={(v) => set({ referrerOrg: v })} autoComplete="organization" placeholder="e.g. Richmond VA Medical Center" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Phone" type="tel" value={data.referrerPhone} onChange={(v) => set({ referrerPhone: v })} autoComplete="tel" />
                      <Field label="Email" type="email" value={data.referrerEmail} onChange={(v) => set({ referrerEmail: v })} autoComplete="email" />
                    </div>
                  </Fields>
                </Q>
              )}

              {step === "program" && (
                <Q title={data.forWhom === "SELF" ? "Which describes you best?" : "Which describes them best?"}>
                  <Choices
                    value={data.program}
                    onPick={(v) => pick({ program: v as RequestInput["program"] })}
                    options={[
                      ["VETERAN", "Veteran", "Served in the military", Medal],
                      ["RECOVERY", "In recovery", "Looking for a sober living home", Sprout],
                      ["SENIOR", "Independent senior", "Wants support without living alone", Armchair],
                    ]}
                  />
                </Q>
              )}

              {step === "room" && (
                <Q title="Any room in mind?" hint="Lit windows are open beds.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rooms.map((r) => {
                      const on = data.room === r.slug;
                      return (
                        <button
                          key={r.slug}
                          type="button"
                          onClick={() => pick({ room: r.slug })}
                          aria-pressed={on}
                          className={tile(on)}
                        >
                          <span className="flex w-full items-start justify-between gap-3">
                            <span>
                              <span className="block text-[1.05rem] font-semibold">{r.name}</span>
                              <span className="block text-[0.9rem] text-ink/60">
                                {r.kind === "PRIVATE" ? "Private" : "Shared"} · {r.floor === "Ground" ? "No stairs" : "Upstairs"} · {money(r.rentCents)}/mo
                              </span>
                            </span>
                            <WindowRow states={r.states} size={9} />
                          </span>
                          <span className={`mt-3 block text-[0.85rem] font-medium ${r.open ? "text-pine" : "text-ink/50"}`}>
                            {r.open ? `${r.open} open now` : r.soon ? `Opens ${shortDate(r.soon)}` : "Full — waitlist"}
                          </span>
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => pick({ room: "" })} aria-pressed={data.room === ""} className={`${tile(data.room === "")} sm:col-span-2`}>
                      <span className="text-[1.05rem] font-semibold">No preference</span>
                      <span className="block text-[0.9rem] text-ink/60">We&apos;ll suggest the best fit.</span>
                    </button>
                  </div>
                </Q>
              )}

              {step === "moveIn" && (
                <Q title={`When would ${who} like to move in?`}>
                  <Choices
                    value={data.moveIn}
                    onPick={(v) => pick({ moveIn: v as RequestInput["moveIn"] })}
                    options={[
                      ["ASAP", "As soon as possible", "Within the next couple of weeks"],
                      ["30_DAYS", "Within 30 days"],
                      ["60_DAYS", "In 1–2 months"],
                      ["EXPLORING", "Just exploring", "Planning ahead"],
                    ]}
                  />
                </Q>
              )}

              {step === "payment" && (
                <Q title="How will rent be paid?" hint="There's no wrong answer. Many residents use benefits.">
                  <Choices
                    value={data.payment}
                    onPick={(v) => pick({ payment: v as RequestInput["payment"] })}
                    options={[
                      ["VA", "VA benefits"],
                      ["SSI", "SSI or SSDI"],
                      ["PRIVATE", "Personal or family funds"],
                      ["OTHER", "Another program"],
                      ["UNSURE", "Not sure yet", "We can help figure it out"],
                    ]}
                  />
                </Q>
              )}

              {step === "contact" && (
                <Q
                  title={data.forWhom === "SELF" ? "How can we reach you?" : "Who's moving in?"}
                  hint={data.forWhom === "SELF" ? "We'll call within one business day." : `${whose[0].toUpperCase() + whose.slice(1)} name and the best number to reach ${who}.`}
                >
                  <Fields>
                    <Field label={data.forWhom === "SELF" ? "Your name" : "Their name"} value={data.name} onChange={(v) => set({ name: v })} autoComplete={data.forWhom === "SELF" ? "name" : "off"} autoFocus />
                    <Field label="Phone" type="tel" value={data.phone} onChange={(v) => set({ phone: v })} autoComplete={data.forWhom === "SELF" ? "tel" : "off"} />
                    <Field label="Email (optional)" type="email" value={data.email} onChange={(v) => set({ email: v })} autoComplete={data.forWhom === "SELF" ? "email" : "off"} />
                  </Fields>
                </Q>
              )}

              {step === "message" && (
                <Q title="Anything else we should know?" hint="Optional. Please don't include medical records here — we'll talk by phone.">
                  <textarea
                    value={data.message ?? ""}
                    onChange={(e) => set({ message: e.target.value })}
                    rows={5}
                    maxLength={1500}
                    placeholder={data.forWhom === "PROFESSIONAL" ? "Discharge date, mobility needs, best time to call…" : "Questions, timing, anything that would help…"}
                    className="w-full resize-none rounded-[22px] bg-paper p-5 text-[1.05rem] ring-1 ring-line outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-pine"
                  />
                  <Summary data={data} rooms={rooms} />
                </Q>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom action bar */}
      {!done && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <button type="button" onClick={() => go(-1)} disabled={i === 0} className="btn btn-ghost press disabled:invisible">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
              {error && (
                <p role="alert" className="truncate text-[0.9rem] font-medium text-ember">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={isLast ? submit : () => go(1)}
                disabled={!canContinue[step] || pending}
                className="btn press !h-12 min-w-[9.5rem] bg-ink text-white shadow-[0_4px_0_#000] transition-[transform,box-shadow,opacity] active:translate-y-[3px] active:shadow-[0_1px_0_#000] disabled:opacity-35 disabled:shadow-none"
              >
                {pending ? <Loader2 size={18} className="animate-spin" /> : isLast ? "Send request" : "Continue"}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

const tile = (on: boolean) =>
  `press group flex w-full flex-col items-start rounded-2xl bg-paper p-5 text-left ring-1 transition-[box-shadow,background-color] duration-200 ${
    on ? "ring-2 ring-ink bg-[#fff8ea] shadow-[0_3px_0_var(--ink)]" : "ring-line shadow-[0_3px_0_rgb(23_33_28/.12)] hover:ring-line-strong"
  }`;

function Q({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="display-2 text-[clamp(2.1rem,5.4vw,3.4rem)]">{title}</h1>
      {hint && <p className="mt-3 text-[1.05rem] text-ink/60">{hint}</p>}
      <div className="mt-9">{children}</div>
    </section>
  );
}

function Choices({ value, onPick, options }: { value?: string; onPick: (v: string) => void; options: [string, string, string?, React.ComponentType<{ size?: number; className?: string }>?][] }) {
  return (
    <div className="grid gap-3">
      {options.map(([v, label, sub, Icon]) => {
        const on = value === v;
        return (
          <button key={v} type="button" onClick={() => onPick(v)} aria-pressed={on} className={`${tile(on)} !flex-row !items-center gap-4`}>
            {Icon && (
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors ${on ? "bg-porch text-ink" : "bg-oat text-ink"}`}>
                <Icon size={22} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[1.08rem] font-semibold">{label}</span>
              {sub && <span className="block text-[0.92rem] text-ink/60">{sub}</span>}
            </span>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-[transform,opacity] duration-200 ease-[var(--ease-out)] ${on ? "scale-100 bg-pine text-paper opacity-100" : "scale-75 opacity-0"}`}>
              <Check size={15} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Fields({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}

function Field({ label, value, onChange, type = "text", ...rest }: { label: string; value?: string; onChange: (v: string) => void; type?: string; autoComplete?: string; autoFocus?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.92rem] font-medium text-ink/75">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl bg-paper px-5 text-[1.05rem] ring-1 ring-line outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-pine"
        {...rest}
      />
    </label>
  );
}

function Summary({ data, rooms }: { data: Data; rooms: RoomOpt[] }) {
  const room = rooms.find((r) => r.slug === data.room);
  const rows = [
    ["Moving in", data.name],
    ["Room", room?.name ?? "No preference"],
    ["Phone", data.phone],
    data.referrerName ? ["Referred by", `${data.referrerName}${data.referrerOrg ? `, ${data.referrerOrg}` : ""}`] : null,
  ].filter(Boolean) as [string, string][];
  return (
    <dl className="mt-6 divide-y divide-line rounded-[22px] bg-paper/60 px-5 ring-1 ring-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-3 text-[0.95rem]">
          <dt className="text-ink/55">{k}</dt>
          <dd className="truncate font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Done({ name, rooms, phone }: { name: string; rooms: RoomOpt[]; phone: { label: string; href: string } }) {
  const states = rooms.flatMap((r) => r.states);
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
      className="flex flex-col items-center text-center"
    >
      {/* Every window lights up for the celebration */}
      <House states={states.map(() => "open")} className="w-64 sm:w-80" />
      <h1 className="display-2 mt-6 text-[clamp(2.4rem,6vw,3.8rem)]">Request sent, {name}.</h1>
      <p className="mt-4 max-w-md text-[1.08rem] text-ink/70">
        We&apos;ll call within one business day. If it&apos;s urgent, call us at{" "}
        <a href={phone.href} className="font-semibold text-ink underline underline-offset-4">
          {phone.label}
        </a>
        .
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary press !h-12 !px-6">Back to home</Link>
        <Link href="/rooms" className="btn btn-ghost press !h-12 !px-6">Look at rooms</Link>
      </div>
    </motion.section>
  );
}
