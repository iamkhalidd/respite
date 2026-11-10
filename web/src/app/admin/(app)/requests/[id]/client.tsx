"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { setRequestStatus, saveNotes } from "../../../actions";
import { STATUSES, STATUS_LABEL } from "@/lib/labels";
import { StatusPill } from "../../ui";

export function StatusPicker({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-ink/[.05]" aria-haspopup="listbox" aria-expanded={open}>
        <StatusPill status={current} /> <ChevronDown size={14} className="text-ink/40" />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 w-48 origin-top-left rounded-lg bg-white p-1 shadow-[0_12px_32px_-8px_rgb(23_33_28/.3)] ring-1 ring-line [animation:pop_150ms_var(--ease-out)]">
          {STATUSES.filter((s) => s !== "MOVED_IN").map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={current === s}
                onClick={() => {
                  setCurrent(s);
                  setOpen(false);
                  start(() => setRequestStatus(id, s));
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-ink/[.05]"
              >
                <StatusPill status={s} />
                {current === s && <Check size={14} />}
                <span className="sr-only">{STATUS_LABEL[s]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <style>{`@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}`}</style>
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
        rows={4}
        placeholder="Call notes, tour time, anything to remember…"
        className="w-full resize-y rounded-lg bg-transparent p-0 text-[0.98rem] leading-relaxed outline-none placeholder:text-ink/35"
      />
      <p className="h-5 text-[0.8rem] text-ink/40" aria-live="polite">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
      </p>
    </div>
  );
}
