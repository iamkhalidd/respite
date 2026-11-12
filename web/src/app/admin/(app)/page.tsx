import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { admin } from "@/lib/api";
import type { BedView, Charge, Request, Resident, Room } from "@/lib/types";
import { money, timeAgo, shortDate } from "@/lib/format";
import { PROGRAMS, type Program } from "@/lib/labels";
import { HouseNight } from "@/components/house";
import { Card, CardHead, Empty, StatusPill, ChargePill, isOverdue } from "./ui";

export default async function Overview() {
  const now = new Date();
  const { beds, requests: active, due, collectedThisMonthCents } = await admin.get<{
    beds: BedView[];
    requests: (Request & { room: Room | null })[];
    due: (Charge & { resident: Resident })[];
    collectedThisMonthCents: number;
  }>("/admin/overview");
  const open = beds.filter((b) => b.state === "open").length;
  const fresh = active.filter((r) => r.status === "NEW").length;
  const owed = due.reduce((n, c) => n + c.amountCents, 0);
  const late = due.filter(isOverdue);
  const lateTotal = late.reduce((n, c) => n + c.amountCents, 0);
  const hour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const today = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

  // one plain sentence about what needs attention, most urgent first
  const next = fresh
    ? { text: `${fresh} new ${fresh === 1 ? "request is" : "requests are"} waiting for a call back.`, href: "/admin/requests", cta: "Open requests" }
    : late.length
      ? { text: `${money(lateTotal)} is past due from ${new Set(late.map((c) => c.residentId)).size === 1 ? late[0].resident.name.split(" ")[0] : `${new Set(late.map((c) => c.residentId)).size} residents`}.`, href: "/admin/payments", cta: "Open payments" }
      : open
        ? { text: `${open} ${open === 1 ? "bed is" : "beds are"} open and showing on the site.`, href: "/admin/rooms", cta: "Rooms & beds" }
        : { text: "The house is full and everyone is paid up.", href: "/admin/residents", cta: "Residents" };

  const facts: [string, string, string][] = [
    ["Open beds", `${open}/${beds.length}`, "/admin/rooms"],
    ["Active requests", String(active.length), "/admin/requests"],
    ["Waiting to be paid", money(owed), "/admin/payments"],
    ["Collected this month", money(collectedThisMonthCents), "/admin/payments?tab=paid"],
  ];

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-4 sm:px-8 md:pt-8">
      {/* The house tonight */}
      <section className="relative overflow-hidden rounded-3xl bg-night text-white">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(55%_80%_at_78%_100%,rgb(240_165_58/0.14),transparent_70%)]" />
        <div className="relative grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
          <div className="p-6 sm:p-9 md:pb-10">
            <p className="mono text-[0.72rem] uppercase tracking-[0.02em] text-white/45">{today}</p>
            <h1 className="display-2 mt-4 text-[clamp(2.2rem,5vw,3.6rem)]">{greeting}</h1>
            <p className="mt-4 max-w-md text-[1.08rem] leading-snug text-white/70">{next.text}</p>
            <Link href={next.href} className="press mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-porch px-5 text-[0.93rem] font-medium text-ink hover:bg-porch-glow">
              {next.cta} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="flex items-end px-6 md:px-0 md:pr-9">
            <HouseNight states={beds.map((b) => b.state)} labels className="w-full" />
          </div>
        </div>
        <dl className="relative grid grid-cols-2 border-t border-white/10 md:grid-cols-4">
          {facts.map(([k, v, href], i) => (
            <Link
              key={k}
              href={href}
              className={`group p-5 transition-colors hover:bg-white/[.04] sm:px-9 ${i % 2 ? "border-l border-white/10" : ""} ${i > 1 ? "border-t border-white/10 md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}
            >
              <dt className="text-[0.82rem] text-white/50">{k}</dt>
              <dd className="mono tabular mt-1.5 text-[1.5rem] font-medium tracking-[-0.04em]">{v}</dd>
            </Link>
          ))}
        </dl>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_270px]">
        <Card>
          <CardHead title="Requests to follow up" action={<Link href="/admin/requests" className="text-[0.86rem] text-moss hover:text-ink">See all</Link>} />
          {active.length ? (
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {active.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/requests/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink/[.025] sm:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-[0.85rem] text-moss">
                        {PROGRAMS[r.program as Program]?.long} · {r.room?.name.replace("The ", "") ?? "Any room"} · {timeAgo(r.createdAt)}
                      </span>
                    </span>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No open requests. New ones land here and in your email.</Empty>
          )}
        </Card>

        <Card>
          <CardHead title="Waiting to be paid" action={<Link href="/admin/payments" className="text-[0.86rem] text-moss hover:text-ink">Payments</Link>} />
          {due.length ? (
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {due.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/residents/${c.residentId}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink/[.025] sm:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.resident.name}</span>
                      <span className="block truncate text-[0.85rem] text-moss">
                        {c.label} · due {shortDate(c.dueDate)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="mono tabular block text-[0.95rem] font-medium">{money(c.amountCents)}</span>
                      {isOverdue(c) && <ChargePill status={c.status} dueDate={c.dueDate} />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Everyone is paid up.</Empty>
          )}
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHead title="Beds" action={<Link href="/admin/rooms" className="text-[0.86rem] text-moss hover:text-ink">Manage</Link>} />
          <ul className="mt-3 grid sm:grid-cols-2 xl:grid-cols-1">
            {beds.map((b) => (
              <li key={b.id} className="flex items-center gap-3 border-t border-line px-5 py-3 text-[0.92rem] sm:px-6">
                <span
                  aria-hidden
                  className="h-[18px] w-3.5 shrink-0 rounded-[2px]"
                  style={{
                    background: b.state === "open" ? "linear-gradient(#ffe3a6, #f0a53a)" : b.state === "soon" ? "rgb(240 165 58 / .35)" : "var(--ink)",
                    boxShadow: b.state === "open" ? "0 0 10px 1px rgb(240 165 58 / .5)" : "none",
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{b.state === "open" ? "Open" : b.residentName}</span>
                  <span className="mono block truncate text-[0.74rem] uppercase text-moss">
                    {b.label} · {b.roomName.replace("The ", "")}
                  </span>
                </span>
                {b.state === "soon" && <span className="mono text-[0.76rem] text-moss">opens {shortDate(b.availableFrom!)}</span>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
