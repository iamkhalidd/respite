import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { getBeds } from "@/lib/availability";
import { money, timeAgo, shortDate } from "@/lib/format";
import { PROGRAMS, type Program } from "@/lib/labels";
import { House } from "@/components/house";
import { Page, StatusPill, ChargePill } from "./ui";

export default async function Overview() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [beds, newReqs, due, paidThisMonth] = await Promise.all([
    getBeds(),
    db.request.findMany({ where: { status: { in: ["NEW", "CONTACTED", "TOUR"] } }, orderBy: { createdAt: "desc" }, take: 6, include: { room: true } }),
    db.charge.findMany({ where: { status: "DUE" }, include: { resident: true }, orderBy: { dueDate: "asc" } }),
    db.charge.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountCents: true } }),
  ]);
  const open = beds.filter((b) => b.state === "open").length;
  const owed = due.reduce((n, c) => n + c.amountCents, 0);
  const hour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Page title={greeting} crumb={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" })}>
      {/* Numbers that matter this month */}
      <section className="grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-4">
        {[
          ["Open beds", `${open} of ${beds.length}`, "/admin/rooms"],
          ["Active requests", String(newReqs.length), "/admin/requests"],
          ["Rent owed", money(owed), "/admin/payments"],
          ["Collected this month", money(paidThisMonth._sum.amountCents ?? 0), "/admin/payments?tab=paid"],
        ].map(([k, v, href]) => (
          <Link key={k} href={href} className="group bg-[#fbfaf7] p-5 transition-colors hover:bg-white">
            <p className="flex items-center justify-between text-[0.85rem] text-ink/55">
              {k} <ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
            <p className="tabular mt-2 text-[1.6rem] font-semibold tracking-tight">{v}</p>
          </Link>
        ))}
      </section>

      <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-12">
          <section>
            <h2 className="mb-3 flex items-baseline justify-between text-[0.95rem] font-semibold">
              Requests to follow up <Link href="/admin/requests" className="text-[0.85rem] font-normal text-ink/50 hover:text-ink">See all</Link>
            </h2>
            {newReqs.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {newReqs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/requests/${r.id}`} className="flex items-center gap-4 px-1 py-3 transition-colors hover:bg-ink/[.025]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block truncate text-[0.85rem] text-ink/55">
                          {PROGRAMS[r.program as Program]?.long} · {r.room?.name ?? "Any room"}
                          {r.referrerOrg ? ` · via ${r.referrerOrg}` : ""}
                        </span>
                      </span>
                      <StatusPill status={r.status} />
                      <span className="hidden w-24 text-right text-[0.82rem] text-ink/45 sm:block">{timeAgo(r.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-ink/55">You&apos;re all caught up.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-baseline justify-between text-[0.95rem] font-semibold">
              Unpaid charges <Link href="/admin/payments" className="text-[0.85rem] font-normal text-ink/50 hover:text-ink">Payments</Link>
            </h2>
            {due.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {due.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/residents/${c.residentId}`} className="flex items-center gap-4 px-1 py-3 hover:bg-ink/[.025]">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{c.resident.name}</span>
                        <span className="block text-[0.85rem] text-ink/55">{c.label} · due {shortDate(c.dueDate)}</span>
                      </span>
                      <ChargePill status={c.status} dueDate={c.dueDate} />
                      <span className="tabular w-20 text-right font-medium">{money(c.amountCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-ink/55">Everyone is paid up.</p>
            )}
          </section>
        </div>

        <aside className="min-w-0">
          <h2 className="mb-3 text-[0.95rem] font-semibold">The house</h2>
          <div className="rounded-xl bg-oat p-4 ring-1 ring-line">
            <House states={beds.map((b) => b.state)} animate={false} showLabels />
          </div>
          <ul className="mt-4 divide-y divide-line text-[0.9rem]">
            {beds.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-ink/55">
                  {b.label} · {b.roomName.replace("The ", "")}
                </span>
                <span className={`text-right ${b.state === "open" ? "font-medium text-pine" : ""}`}>
                  {b.state === "open" ? "Open" : b.residentName}
                  {b.state === "soon" && <span className="text-ink/45"> → {shortDate(b.availableFrom!)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Page>
  );
}
