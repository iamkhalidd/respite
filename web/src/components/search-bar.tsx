"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Check } from "lucide-react";

type Field = "program" | "kind" | "when";
const OPTIONS: Record<Field, { label: string; placeholder: string; items: [string, string, string?][] }> = {
  program: {
    label: "Who it's for",
    placeholder: "Anyone",
    items: [
      ["", "Anyone", "Show every room"],
      ["VETERAN", "A veteran", "Close to the Richmond VA"],
      ["RECOVERY", "Someone in recovery", "Sober living"],
      ["SENIOR", "An independent senior", "Ground-floor rooms first"],
    ],
  },
  kind: {
    label: "Room",
    placeholder: "Private or shared",
    items: [
      ["", "Any room"],
      ["PRIVATE", "Private room", "Your own room"],
      ["SHARED", "Shared room", "Lower rent, one roommate"],
    ],
  },
  when: {
    label: "Move in",
    placeholder: "Any time",
    items: [
      ["", "Any time"],
      ["now", "Right away", "Beds open today"],
      ["soon", "Within 60 days", "Includes beds opening soon"],
    ],
  },
};

export function SearchBar({ initial = {}, compact = false }: { initial?: Partial<Record<Field, string>>; compact?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({ program: "", kind: "", when: "", ...initial });
  const [open, setOpen] = useState<Field | null>(null);
  // near the bottom of the screen (as in the hero) the menu opens upward, so nobody has to scroll to reach it
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  function toggle(f: Field, el: HTMLElement) {
    if (open === f) return setOpen(null);
    const r = el.getBoundingClientRect();
    const need = 50 + OPTIONS[f].items.length * 64; // menu height, roughly
    setUp(window.innerHeight - r.bottom < need && r.top > need);
    setOpen(f);
  }

  useEffect(() => {
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  function go(next = values) {
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    setOpen(null);
    router.push(`/rooms${q.size ? `?${q}` : ""}`);
  }

  return (
    <div ref={root} className={`relative w-full ${compact ? "max-w-3xl" : "max-w-[680px]"}`}>
      <div
        className={`flex flex-col rounded-[28px] bg-paper p-1.5 shadow-[0_1px_0_rgb(23_33_28/.06),0_12px_40px_-12px_rgb(23_33_28/.25)] ring-1 ring-line sm:flex-row sm:items-center sm:rounded-full ${
          open ? "sm:bg-[#f1f1ee]" : ""
        }`}
      >
        {(Object.keys(OPTIONS) as Field[]).map((f, i) => {
          const o = OPTIONS[f];
          const current = o.items.find(([v]) => v === values[f]);
          const active = open === f;
          return (
            <div key={f} className="relative flex-1">
              {i > 0 && !active && open !== (Object.keys(OPTIONS) as Field[])[i - 1] && (
                <span className="absolute left-0 top-1/2 hidden h-7 w-px -translate-y-1/2 bg-line sm:block" />
              )}
              <button
                type="button"
                aria-expanded={active}
                aria-haspopup="listbox"
                onClick={(e) => toggle(f, e.currentTarget)}
                className={`press w-full rounded-full px-5 py-2.5 text-left transition-colors ${
                  active ? "bg-paper shadow-[0_6px_24px_-8px_rgb(23_33_28/.3)]" : "hover:bg-ink/5"
                }`}
              >
                <span className="mono block text-[0.68rem] uppercase tracking-[0.02em] text-ink/55">{o.label}</span>
                <span className={`block truncate text-[0.92rem] ${values[f] ? "text-ink" : "text-ink/50"}`}>
                  {values[f] ? current?.[1] : o.placeholder}
                </span>
              </button>
              {active && (
                <ul
                  role="listbox"
                  aria-label={o.label}
                  className={`absolute left-0 z-30 w-[min(320px,calc(100vw-2rem))] ${up ? "bottom-[calc(100%+10px)] origin-bottom-left" : "top-[calc(100%+10px)] origin-top-left"} rounded-3xl bg-paper p-2 shadow-[0_24px_60px_-16px_rgb(23_33_28/.35)] ring-1 ring-line [animation:pop_180ms_var(--ease-out)]`}
                >
                  {o.items.map(([v, label, hint]) => (
                    <li key={v || "any"}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={values[f] === v}
                        onClick={() => {
                          const next = { ...values, [f]: v };
                          setValues(next);
                          const nextField = (Object.keys(OPTIONS) as Field[])[i + 1];
                          setOpen(nextField ?? null);
                        }}
                        className="press flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-ink/5"
                      >
                        <span>
                          <span className="block font-medium">{label}</span>
                          {hint && <span className="block text-sm text-ink/55">{hint}</span>}
                        </span>
                        {values[f] === v && <Check size={18} className="text-ink" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => go()}
          className="press mt-1.5 flex h-12 items-center justify-center gap-2 rounded-full bg-porch px-6 font-medium text-ink hover:bg-porch-glow sm:ml-1 sm:mt-0 sm:w-auto"
        >
          <Search size={18} strokeWidth={2.4} />
          <span>Find a bed</span>
        </button>
      </div>
      <style>{`@keyframes pop{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
