import Link from "next/link";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { MOVE_IN, PROGRAMS, STATUS_LABEL, type Program, type Status } from "@/lib/labels";
import { Page, Card, Empty, StatusPill } from "../ui";

const COLUMNS: Status[] = ["NEW", "CONTACTED", "TOUR", "APPROVED"];
const HINT: Record<string, string> = {
  NEW: "Call these back first.",
  CONTACTED: "Spoken to. Book a tour next.",
  TOUR: "Tour is on the calendar.",
  APPROVED: "Ready to move in.",
};

export default async function Requests({ searchParams }: { searchParams: Promise<{ view?: string; s?: string }> }) {
  const { view, s } = await searchParams;
  const all = await db.request.findMany({ orderBy: { createdAt: "desc" }, include: { room: true } });
  const closed = all.filter((r) => r.status === "MOVED_IN" || r.status === "DECLINED");
  const by = (col: Status) => all.filter((r) => r.status === col);
  // on a phone one step shows at a time; start on the first step that has anyone in it
  const tab = (COLUMNS.includes(s as Status) ? s : (COLUMNS.find((c) => by(c).length) ?? "NEW")) as Status;
  const isClosed = view === "closed";

  const card = (r: (typeof all)[number]) => (
    <Link
      href={`/admin/requests/${r.id}`}
      className="press block rounded-xl bg-paper p-4 ring-1 ring-line transition-shadow duration-200 hover:shadow-[0_10px_24px_-14px_rgb(15_17_16/.35)] hover:ring-line-strong"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium leading-snug">{r.name}</span>
        <span className="mono shrink-0 pt-0.5 text-[0.72rem] uppercase text-moss">{timeAgo(r.createdAt)}</span>
      </span>
      <span className="mt-1 block text-[0.86rem] text-moss">
        {PROGRAMS[r.program as Program]?.long} · {r.room?.name.replace("The ", "") ?? "Any room"}
      </span>
      <span className="mt-3 flex flex-wrap gap-1.5 text-[0.76rem]">
        <span className="rounded-md bg-ink/[.05] px-1.5 py-0.5">{MOVE_IN[r.moveIn as keyof typeof MOVE_IN] ?? r.moveIn}</span>
        {r.referrerOrg && <span className="max-w-full truncate rounded-md bg-ink/[.05] px-1.5 py-0.5">via {r.referrerOrg}</span>}
      </span>
    </Link>
  );

  return (
    <Page
      wide
      title="Requests"
      eyebrow={`${all.length - closed.length} open · ${closed.length} closed`}
      actions={
        <div className="flex rounded-full bg-ink/[.06] p-1 text-[0.88rem]">
          {[
            ["board", "Open", "/admin/requests"],
            ["closed", "Closed", "/admin/requests?view=closed"],
          ].map(([v, l, href]) => (
            <Link
              key={v}
              href={href}
              className={`grid h-9 place-items-center rounded-full px-4 transition-colors ${(isClosed ? "closed" : "board") === v ? "bg-paper font-medium shadow-[0_1px_2px_rgb(15_17_16/.15)]" : "text-moss hover:text-ink"}`}
            >
              {l}
            </Link>
          ))}
        </div>
      }
    >
      {isClosed ? (
        <Card>
          {closed.length ? (
            <ul className="divide-y divide-line">
              {closed.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/requests/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink/[.025] sm:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-[0.85rem] text-moss">
                        {PROGRAMS[r.program as Program]?.long} · {timeAgo(r.createdAt)}
                      </span>
                    </span>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing closed yet. Requests land here once someone moves in or isn&apos;t a fit.</Empty>
          )}
        </Card>
      ) : !all.length ? (
        <Card>
          <Empty>No requests yet. When someone asks for a room on the site, it shows up here and in your email.</Empty>
        </Card>
      ) : (
        <>
          {/* Phone and tablet: one step at a time */}
          <div className="lg:hidden">
            <nav aria-label="Step" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
              {COLUMNS.map((col) => {
                const on = col === tab;
                return (
                  <Link
                    key={col}
                    href={`/admin/requests?s=${col}`}
                    aria-current={on ? "true" : undefined}
                    className={`press flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[0.9rem] ${on ? "bg-ink font-medium text-white" : "bg-paper text-ink ring-1 ring-line"}`}
                  >
                    {STATUS_LABEL[col]}
                    <span className={`mono tabular text-[0.76rem] ${on ? "text-porch" : "text-moss"}`}>{by(col).length}</span>
                  </Link>
                );
              })}
            </nav>
            <p className="mb-3 text-[0.88rem] text-moss">{HINT[tab]}</p>
            {by(tab).length ? (
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {by(tab).map((r) => (
                  <li key={r.id}>{card(r)}</li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-[0.9rem] text-moss">No one at this step.</p>
            )}
          </div>

          {/* Desktop: the whole pipeline side by side */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-4">
            {COLUMNS.map((col, n) => {
              const items = by(col);
              return (
                <section key={col} className="min-w-0">
                  <header className="mb-3 border-t-2 border-ink pt-3">
                    <h2 className="flex items-baseline justify-between text-[0.95rem] font-semibold">
                      <span>
                        <span className="mono mr-2 text-[0.72rem] font-normal text-moss">{n + 1}/4</span>
                        {STATUS_LABEL[col]}
                      </span>
                      <span className={`mono tabular grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.72rem] ${col === "NEW" && items.length ? "bg-porch text-ink" : "text-moss"}`}>{items.length}</span>
                    </h2>
                    <p className="mt-0.5 text-[0.8rem] text-moss">{HINT[col]}</p>
                  </header>
                  <ul className="space-y-2.5">
                    {items.map((r) => (
                      <li key={r.id}>{card(r)}</li>
                    ))}
                    {!items.length && <li className="rounded-xl border border-dashed border-line-strong px-4 py-7 text-center text-[0.84rem] text-moss">No one here</li>}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </Page>
  );
}
