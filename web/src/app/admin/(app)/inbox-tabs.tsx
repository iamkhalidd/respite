import Link from "next/link";

const TABS = [
  ["requests", "Requests", "/admin/requests"],
  ["tours", "Tours", "/admin/tours"],
  ["waitlist", "Waitlist", "/admin/waitlist"],
] as const;

/** Everyone who's asked about the house, in three lists: room requests, tours and the waitlist. */
export function InboxTabs({ on, counts = {} }: { on: (typeof TABS)[number][0]; counts?: Partial<Record<(typeof TABS)[number][0], number>> }) {
  return (
    <nav aria-label="People asking" className="no-scrollbar -mx-4 mb-6 flex gap-6 overflow-x-auto border-b border-line px-4 sm:-mx-0 sm:px-0">
      {TABS.map(([key, label, href]) => {
        const active = key === on;
        const n = counts[key];
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 text-[0.95rem] transition-colors ${active ? "border-ink font-medium text-ink" : "border-transparent text-moss hover:text-ink"}`}
          >
            {label}
            {n ? <span className="mono tabular text-[0.74rem] text-moss">{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
