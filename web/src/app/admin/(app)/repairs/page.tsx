import Link from "next/link";
import { Phone } from "lucide-react";
import { admin } from "@/lib/api";
import type { RepairWithResident } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { updateRepair } from "../../actions";
import { Page, Card, Empty, btnPrimary, btnQuiet, input } from "../ui";
import { SubmitButton } from "../submit";

export const dynamic = "force-dynamic";

const small = `${btnQuiet} !h-9 !px-3 !text-[0.85rem]`;
const STATUS = { OPEN: "New", DOING: "Working on it", DONE: "Fixed" } as const;
const day = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

function Repair({ x }: { x: RepairWithResident }) {
  const r = x.resident;
  return (
    <li className="px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {x.urgent && x.status !== "DONE" && (
          <span className="mono inline-flex h-6 items-center rounded-full bg-ember px-2.5 text-[0.7rem] font-medium uppercase text-white">Urgent</span>
        )}
        <span
          className={`mono inline-flex h-6 items-center rounded-full px-2.5 text-[0.7rem] font-medium uppercase ${x.status === "OPEN" ? "bg-porch-glow text-ink" : "bg-ink/[.06] text-ink"}`}
        >
          {STATUS[x.status]}
        </span>
        <span className="font-medium">{x.area}</span>
        <span className="text-[0.84rem] text-moss">· {timeAgo(x.createdAt)}</span>
      </div>
      <p className="mt-2.5 whitespace-pre-line text-[0.97rem] leading-relaxed">{x.body}</p>
      {r && (
        <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.86rem] text-moss">
          <Link href={`/admin/residents/${r.id}`} className="font-medium text-ink hover:underline">
            {r.name}
            {r.bed && <span className="font-normal text-moss"> · {r.bed}</span>}
          </Link>
          {r.phone && (
            <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink">
              <Phone size={13} /> {r.phone}
            </a>
          )}
        </p>
      )}

      {x.status === "DONE" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-[0.86rem] text-moss">
            Fixed {x.doneAt ? day(x.doneAt) : ""}
            {x.ownerNote && <span className="text-ink">: {x.ownerNote}</span>}
          </p>
          <form action={updateRepair.bind(null, x.id, "OPEN")}>
            <SubmitButton className={small}>Reopen</SubmitButton>
          </form>
        </div>
      ) : (
        <form action={updateRepair.bind(null, x.id, "DONE")} className="mt-4 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="min-w-0">
            <span className="sr-only">Note for {r ? r.name.split(" ")[0] : "them"}</span>
            <input name="ownerNote" maxLength={2000} defaultValue={x.ownerNote} placeholder="Note for them (optional): replaced the faucet washer" className={input} />
          </label>
          <SubmitButton className={`${btnPrimary} !h-11 !px-4 sm:!h-11`}>Mark fixed</SubmitButton>
        </form>
      )}
      {x.status === "OPEN" && (
        <form action={updateRepair.bind(null, x.id, "DOING")} className="mt-2">
          <SubmitButton className={small}>Working on it</SubmitButton>
        </form>
      )}
    </li>
  );
}

export default async function RepairsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const done = show === "done";
  const repairs = await admin.get<RepairWithResident[]>(`/admin/repairs?status=${done ? "done" : "open"}`);
  const urgent = repairs.filter((x) => x.urgent).length;

  return (
    <Page
      title="Repairs"
      eyebrow={done ? "Fixed" : repairs.length ? `${repairs.length} waiting${urgent ? ` · ${urgent} urgent` : ""}` : "All caught up"}
    >
      <nav aria-label="Repairs" className="no-scrollbar -mx-4 mb-6 flex gap-6 overflow-x-auto border-b border-line px-4 sm:-mx-0 sm:px-0">
        {[
          [false, "Waiting", "/admin/repairs"],
          [true, "Fixed", "/admin/repairs?show=done"],
        ].map(([on, label, href]) => (
          <Link
            key={label as string}
            href={href as string}
            aria-current={on === done ? "page" : undefined}
            className={`-mb-px flex h-11 shrink-0 items-center border-b-2 text-[0.95rem] transition-colors ${on === done ? "border-ink font-medium text-ink" : "border-transparent text-moss hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Card>
        {repairs.length ? (
          <ul className="divide-y divide-line">
            {repairs.map((x) => (
              <Repair key={x.id} x={x} />
            ))}
          </ul>
        ) : (
          <Empty>
            {done
              ? "Nothing fixed yet. Repairs you mark fixed show up here."
              : "No repairs waiting. Residents report them from their pay page, and you'll get an alert when one comes in."}
          </Empty>
        )}
      </Card>
      {!done && <p className="mt-4 text-[0.84rem] text-moss">Marking a repair fixed emails the resident, with your note if you add one.</p>}
    </Page>
  );
}
