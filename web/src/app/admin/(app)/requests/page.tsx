import Link from "next/link";
import { Phone } from "lucide-react";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { PROGRAMS, STATUS_LABEL, type Program, type Status } from "@/lib/labels";
import { Page } from "../ui";

const COLUMNS: Status[] = ["NEW", "CONTACTED", "TOUR", "APPROVED"];
const DOT: Record<string, string> = { NEW: "bg-porch", CONTACTED: "bg-[#5b7da3]", TOUR: "bg-[#8a6aa8]", APPROVED: "bg-[#4f8a49]" };

export default async function Requests({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const all = await db.request.findMany({ orderBy: { createdAt: "desc" }, include: { room: true } });
  const closed = all.filter((r) => r.status === "MOVED_IN" || r.status === "DECLINED");

  return (
    <Page
      title="Requests"
      actions={
        <div className="flex rounded-lg bg-ink/[.05] p-0.5 text-[0.85rem]">
          {[
            ["board", "Board"],
            ["closed", `Closed (${closed.length})`],
          ].map(([v, l]) => (
            <Link key={v} href={v === "board" ? "/admin/requests" : `/admin/requests?view=${v}`} className={`rounded-md px-3 py-1.5 ${(view ?? "board") === v ? "bg-white font-medium shadow-sm" : "text-ink/60"}`}>
              {l}
            </Link>
          ))}
        </div>
      }
    >
      {view === "closed" ? (
        <ul className="divide-y divide-line border-y border-line">
          {closed.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/requests/${r.id}`} className="flex items-center gap-4 px-1 py-3 hover:bg-ink/[.025]">
                <span className="flex-1 font-medium">{r.name}</span>
                <span className="text-[0.85rem] text-ink/55">{STATUS_LABEL[r.status as Status]}</span>
                <span className="w-24 text-right text-[0.82rem] text-ink/45">{timeAgo(r.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-4 sm:-mx-10 sm:px-10">
          {COLUMNS.map((col) => {
            const items = all.filter((r) => r.status === col);
            return (
              <section key={col} className="w-[270px] shrink-0">
                <h2 className="mb-3 flex items-center gap-2 px-1 text-[0.85rem] font-medium text-ink/65">
                  <span className={`h-2 w-2 rounded-full ${DOT[col]}`} />
                  {STATUS_LABEL[col]}
                  <span className="tabular text-ink/40">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="block rounded-lg bg-white p-3.5 shadow-[0_1px_2px_rgb(23_33_28/.08)] ring-1 ring-line transition-[box-shadow,transform] duration-150 hover:shadow-[0_6px_16px_-6px_rgb(23_33_28/.2)] active:scale-[0.98]"
                      >
                        <p className="font-medium">{r.name}</p>
                        <p className="mt-0.5 text-[0.82rem] text-ink/55">
                          {PROGRAMS[r.program as Program]?.long} · {r.room?.name.replace("The ", "") ?? "Any room"}
                        </p>
                        {r.referrerOrg && <p className="mt-2 truncate text-[0.8rem] text-ink/50">via {r.referrerOrg}</p>}
                        <p className="mt-3 flex items-center justify-between text-[0.78rem] text-ink/45">
                          <span className="inline-flex items-center gap-1"><Phone size={11} /> {r.phone}</span>
                          {timeAgo(r.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                  {!items.length && <li className="rounded-lg border border-dashed border-line-strong p-4 text-center text-[0.82rem] text-ink/40">Nothing here</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
