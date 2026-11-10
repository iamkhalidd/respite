"use client";
import { useState } from "react";
import { Plus } from "lucide-react";

export function Faq({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <li key={q}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-6 text-left text-[1.2rem] font-medium tracking-[-0.03em] sm:text-[1.45rem]"
            >
              {q}
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ring-line-strong transition-[transform,background-color] duration-300 ease-[var(--ease-out)] ${
                  isOpen ? "rotate-45 bg-porch text-ink ring-porch" : ""
                }`}
              >
                <Plus size={16} strokeWidth={2.4} />
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out)]"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-7 text-[1.05rem] text-moss">{a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
