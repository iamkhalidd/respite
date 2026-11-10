import Link from "next/link";
import { db } from "@/lib/db";
import { money, shortDate } from "@/lib/format";
import { Page } from "../ui";

export default async function Residents() {
  const residents = await db.resident.findMany({
    orderBy: [{ active: "desc" }, { moveInDate: "desc" }],
    include: { bed: { include: { room: true } }, charges: { where: { status: "DUE" } } },
  });
  const current = residents.filter((r) => r.active);
  const past = residents.filter((r) => !r.active);

  const Table = ({ rows }: { rows: typeof residents }) => (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
      <table className="w-full min-w-[640px] text-left text-[0.92rem]">
        <thead className="text-[0.8rem] text-ink/45">
          <tr className="border-b border-line">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Bed</th>
            <th className="px-4 py-2.5 font-medium">Moved in</th>
            <th className="px-4 py-2.5 font-medium">Rent</th>
            <th className="px-4 py-2.5 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const owed = r.charges.reduce((s, c) => s + c.amountCents, 0);
            return (
              <tr key={r.id} className="transition-colors hover:bg-ink/[.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/residents/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                </td>
                <td className="px-4 py-3 text-ink/60">{r.bed ? `${r.bed.label} · ${r.bed.room.name}` : r.moveOutDate ? `Left ${shortDate(r.moveOutDate)}` : "—"}</td>
                <td className="tabular px-4 py-3 text-ink/60">{shortDate(r.moveInDate)}</td>
                <td className="tabular px-4 py-3 text-ink/60">{money(r.rentCents)}</td>
                <td className={`tabular px-4 py-3 text-right font-medium ${owed ? "text-ember" : "text-ink/40"}`}>{owed ? money(owed) : "Paid up"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <Page title="Residents">
      {current.length ? <Table rows={current} /> : <p className="text-ink/55">No one lives here yet. Move someone in from a request.</p>}
      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-[0.95rem] font-semibold text-ink/60">Past residents</h2>
          <Table rows={past} />
        </section>
      )}
    </Page>
  );
}
