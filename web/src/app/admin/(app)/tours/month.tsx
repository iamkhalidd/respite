import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Tour } from "@/lib/types";
import { clock, dayChip, longDay } from "@/lib/when";
import { Card } from "../ui";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HEAD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const short = (d: string) => {
  const c = dayChip(d);
  return `${c.weekday}, ${c.month} ${c.day}`;
};
const pad = (n: number) => String(n).padStart(2, "0");

/** Today in the house's own time, as "2026-11-13". */
export const houseToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

/** "2026-11" from ?m=, falling back to this month. */
export function pickMonth(m: string | undefined) {
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : houseToday().slice(0, 7);
}

function shift(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Every tour in a month on one grid, so the owners can see busy weeks at a glance. */
export function MonthView({ month, tours }: { month: string; tours: Tour[] }) {
  const [y, m] = month.split("-").map(Number);
  const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = houseToday();
  const cells: (string | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from({ length }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  const byDay = new Map<string, Tour[]>();
  for (const t of tours) byDay.set(t.date, [...(byDay.get(t.date) ?? []), t]);
  const days = [...byDay.keys()].sort();
  const nav = "grid h-9 w-9 place-items-center rounded-full text-moss ring-1 ring-line-strong transition-colors hover:bg-ink/[.04] hover:text-ink";

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">
            {MONTHS[m - 1]} {y}
          </h2>
          <div className="flex items-center gap-2">
            {month !== today.slice(0, 7) && (
              <Link href="/admin/tours?view=calendar" className="mr-1 text-[0.86rem] font-medium text-moss hover:text-ink">
                Today
              </Link>
            )}
            <Link href={`/admin/tours?view=calendar&m=${shift(month, -1)}`} className={nav} aria-label="Previous month">
              <ChevronLeft size={17} />
            </Link>
            <Link href={`/admin/tours?view=calendar&m=${shift(month, 1)}`} className={nav} aria-label="Next month">
              <ChevronRight size={17} />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-7 border-t border-line" role="grid" aria-label={`Tours in ${MONTHS[m - 1]} ${y}`}>
          {HEAD.map((h) => (
            <div key={h} role="columnheader" className="mono border-b border-line py-2 text-center text-[0.66rem] uppercase text-moss">
              {h}
            </div>
          ))}
          {cells.map((d, i) => {
            const list = d ? (byDay.get(d) ?? []) : [];
            const isToday = d === today;
            return (
              <div
                key={d ?? `x${i}`}
                role="gridcell"
                aria-label={d ? `${longDay(d)}, ${list.length ? `${list.length} tour${list.length > 1 ? "s" : ""}` : "no tours"}` : undefined}
                className={`min-h-[72px] border-b border-line p-1.5 sm:min-h-[104px] sm:p-2 ${i % 7 ? "border-l" : ""} ${d ? "" : "bg-ink/[.02]"} ${d && d < today ? "text-moss" : ""}`}
              >
                {d && (
                  <>
                    <span
                      className={`tabular inline-grid h-6 min-w-6 place-items-center rounded-full px-1 text-[0.78rem] ${isToday ? "bg-ink font-semibold text-white" : ""}`}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {list.length > 0 && (
                      <>
                        {/* phones: a dot count; wider screens: the times and names */}
                        <span className="mt-1 flex justify-center sm:hidden" aria-hidden>
                          <span className="mono grid h-5 min-w-5 place-items-center rounded-full bg-porch px-1 text-[0.66rem] font-medium text-ink">{list.length}</span>
                        </span>
                        <ul className="mt-1 hidden space-y-1 sm:block">
                          {list.slice(0, 3).map((t) => (
                            <li
                              key={t.id}
                              title={`${clock(t.time)} ${t.name}`}
                              className={`truncate rounded-md px-1.5 py-0.5 text-[0.72rem] leading-tight ${t.status === "BOOKED" ? "bg-porch-glow text-ink" : "bg-ink/[.05] text-moss"}`}
                            >
                              <span className="mono tabular">{clock(t.time)}</span> {t.name.split(" ")[0]}
                            </li>
                          ))}
                          {list.length > 3 && <li className="px-1.5 text-[0.7rem] text-moss">{list.length - 3} more</li>}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {days.length > 0 ? (
        <Card>
          <ul className="divide-y divide-line">
            {days.flatMap((d) =>
              byDay.get(d)!.map((t) => (
                <li key={t.id} className="flex items-baseline gap-4 px-5 py-3 sm:px-6">
                  <span className="w-24 shrink-0 text-[0.86rem] text-moss">{short(d)}</span>
                  <span className="mono tabular w-16 shrink-0 text-[0.86rem]">{clock(t.time)}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.93rem] font-medium">{t.name}</span>
                  {t.status !== "BOOKED" && <span className="mono text-[0.7rem] uppercase text-moss">{t.status === "DONE" ? "Came" : "No show"}</span>}
                </li>
              )),
            )}
          </ul>
        </Card>
      ) : (
        <p className="text-[0.9rem] text-moss">No tours this month.</p>
      )}
    </div>
  );
}
