"use client";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

const OFFLINE = [
  ["CASH", "Cash"],
  ["CHECK", "Check"],
  ["MONEY_ORDER", "Money order"],
  ["VOUCHER", "Voucher / program"],
] as const;

/** "Mark paid" menu for payments received in person, plus void. */
export function ChargeActions({ record, voidIt }: { record: (f: FormData) => Promise<void>; voidIt: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} aria-label="Charge options" aria-expanded={open} className="press grid h-8 w-8 place-items-center rounded-md text-ink/50 hover:bg-ink/[.05] hover:text-ink">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 origin-top-right rounded-lg bg-white p-1 text-left shadow-[0_12px_32px_-8px_rgb(23_33_28/.3)] ring-1 ring-line [animation:menu-pop_150ms_var(--ease-out)]">
          <p className="px-2 pb-1 pt-1.5 text-[0.75rem] text-ink/45">Mark paid with…</p>
          {OFFLINE.map(([v, label]) => (
            <form key={v} action={record}>
              <input type="hidden" name="method" value={v} />
              <button className="w-full rounded-md px-2 py-1.5 text-left text-[0.88rem] hover:bg-ink/[.05]">{label}</button>
            </form>
          ))}
          <div className="my-1 h-px bg-line" />
          <form action={voidIt}>
            <button className="w-full rounded-md px-2 py-1.5 text-left text-[0.88rem] text-ember hover:bg-ember/[.07]">Void charge</button>
          </form>
        </div>
      )}
      <style>{`@keyframes menu-pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
