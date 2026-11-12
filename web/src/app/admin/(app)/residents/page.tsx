import Link from "next/link";
import { admin } from "@/lib/api";
import type { Bed, Charge, Resident, Room } from "@/lib/types";
import { money, shortDate } from "@/lib/format";
import { Page, Card, Empty, Notice, isOverdue, btnPrimary } from "../ui";

export default async function Residents({ searchParams }: { searchParams: Promise<{ left?: string }> }) {
  const { left } = await searchParams;
  // active first, newest move-in first; charges are only the unpaid ones
  const residents = await admin.get<(Resident & { bed: (Bed & { room: Room }) | null; charges: Charge[] })[]>("/admin/residents");
  const current = residents.filter((r) => r.active);
  const past = residents.filter((r) => !r.active);

  const List = ({ rows }: { rows: typeof residents }) => (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const owed = r.charges.reduce((s, c) => s + c.amountCents, 0);
        const late = r.charges.some(isOverdue);
        const initials = r.name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("");
        return (
          <li key={r.id}>
            <Link href={`/admin/residents/${r.id}`} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-ink/[.025] sm:px-6">
              <span className={`mono grid h-10 w-10 shrink-0 place-items-center rounded-full text-[0.8rem] font-medium uppercase ${r.active ? "bg-ink text-white" : "bg-ink/[.06] text-moss"}`}>{initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="block truncate text-[0.85rem] text-moss">
                  {r.bed ? `${r.bed.label} · ${r.bed.room.name.replace("The ", "")}` : r.moveOutDate ? `Left ${shortDate(r.moveOutDate)}` : "No bed"}
                  <span className="hidden sm:inline"> · since {shortDate(r.moveInDate)}</span>
                </span>
              </span>
              <span className="hidden w-28 text-right md:block">
                <span className="mono tabular block text-[0.92rem]">{money(r.rentCents)}</span>
                <span className="block text-[0.78rem] text-moss">a month</span>
              </span>
              <span className="w-24 shrink-0 text-right sm:w-28">
                {owed ? (
                  <>
                    <span className={`mono tabular block text-[0.98rem] font-medium ${late ? "text-ember" : ""}`}>{money(owed)}</span>
                    <span className={`block text-[0.78rem] ${late ? "text-ember" : "text-moss"}`}>{late ? "past due" : "to pay"}</span>
                  </>
                ) : (
                  <span className="text-[0.86rem] text-moss">Paid up</span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Page title="Residents" eyebrow={`${current.length} living here${past.length ? ` · ${past.length} past` : ""}`}>
      {left && <Notice>Moved out. Their bed is open and showing on the site.</Notice>}
      <Card>
        {current.length ? (
          <List rows={current} />
        ) : (
          <div className="px-5 py-10 text-center sm:px-6">
            <p className="text-[0.95rem] text-moss">No one lives here yet. Residents are added when you move someone in from a request.</p>
            <Link href="/admin/requests" className={`${btnPrimary} mt-4`}>
              Open requests
            </Link>
          </div>
        )}
      </Card>
      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Past residents</h2>
          <Card>{past.length ? <List rows={past} /> : <Empty>None</Empty>}</Card>
        </section>
      )}
    </Page>
  );
}
