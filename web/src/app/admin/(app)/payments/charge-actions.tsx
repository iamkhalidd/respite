"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, MoreHorizontal } from "lucide-react";
import type { FormState } from "../../actions";

const OFFLINE = [
  ["CASH", "Cash"],
  ["CHECK", "Check"],
  ["MONEY_ORDER", "Money order"],
  ["VOUCHER", "Voucher / program"],
] as const;

const item = "flex h-11 w-full items-center rounded-lg px-3 text-left text-[0.93rem] transition-colors hover:bg-ink/[.05] sm:h-9 sm:text-[0.9rem]";

/** Menu on an unpaid charge: mark it paid in person, send a reminder, or void it. */
export function ChargeActions({ record, voidIt, remind }: { record: (f: FormData) => Promise<void>; voidIt: () => Promise<void>; remind?: () => Promise<FormState> }) {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const [note, setNote] = useState<FormState>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  useEffect(() => {
    if (!open) setSure(false);
  }, [open]);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3200);
    return () => clearTimeout(t);
  }, [note]);

  const run = (fn: () => Promise<unknown>) => {
    setOpen(false);
    start(async () => {
      await fn();
    });
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        aria-label="Charge options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="press grid h-10 w-10 place-items-center rounded-full text-moss transition-colors hover:bg-ink/[.06] hover:text-ink"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={18} />}
      </button>

      {note && (
        <p
          role="status"
          className={`absolute right-0 top-full z-20 mt-1 flex w-max max-w-[15rem] items-center gap-1.5 rounded-lg px-3 py-2 text-[0.82rem] leading-snug shadow-[0_12px_32px_-12px_rgb(15_17_16/.45)] ${note.error ? "bg-ember text-white" : "bg-ink text-white"}`}
        >
          {note.ok && <Check size={13} strokeWidth={3} className="shrink-0 text-porch" />}
          {note.error ?? note.ok}
        </p>
      )}

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-60 origin-top-right rounded-2xl bg-paper p-1.5 text-left shadow-[0_18px_44px_-14px_rgb(15_17_16/.45)] ring-1 ring-line-strong [animation:menu-pop_150ms_var(--ease-out)]"
        >
          <p className="mono px-3 pb-1 pt-2 text-[0.68rem] uppercase tracking-[0.02em] text-moss">Paid in person with</p>
          {OFFLINE.map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="menuitem"
              className={item}
              onClick={() =>
                run(() => {
                  const f = new FormData();
                  f.set("method", v);
                  return record(f);
                })
              }
            >
              {label}
            </button>
          ))}
          <div className="my-1.5 h-px bg-line" />
          {remind && (
            <button type="button" role="menuitem" className={item} onClick={() => run(async () => setNote(await remind()))}>
              Email a reminder
            </button>
          )}
          {sure ? (
            <button type="button" role="menuitem" className={`${item} bg-ember font-medium text-white hover:bg-[#a83e23]`} onClick={() => run(voidIt)}>
              Yes, void it
            </button>
          ) : (
            <button type="button" role="menuitem" className={`${item} text-ember hover:bg-ember/[.08]`} onClick={() => setSure(true)}>
              Void this charge
            </button>
          )}
        </div>
      )}
      <style>{`@keyframes menu-pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
