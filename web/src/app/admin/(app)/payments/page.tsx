import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { stripeEnabled } from "@/lib/stripe";
import { billMonth } from "../../actions";
import { Page, btnPrimary, input } from "../ui";
import { SubmitButton } from "../submit";
import { ChargeTable } from "./charge-table";

const TABS = [
  ["due", "Unpaid"],
  ["paid", "Paid"],
  ["all", "All"],
] as const;

export default async function Payments({ searchParams }: { searchParams: Promise<{ tab?: string; billed?: string }> }) {
  const { tab = "due", billed } = await searchParams;
  const where = tab === "paid" ? { status: "PAID" } : tab === "all" ? {} : { status: "DUE" };
  const charges = await db.charge.findMany({
    where,
    orderBy: tab === "paid" ? { paidAt: "desc" } : { dueDate: "asc" },
    include: { resident: { select: { id: true, name: true } } },
    take: 200,
  });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [due, collected] = await Promise.all([
    db.charge.aggregate({ where: { status: "DUE" }, _sum: { amountCents: true } }),
    db.charge.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountCents: true } }),
  ]);
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const nextValue = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <Page title="Payments">
      {billed !== undefined && (
        <div className="mb-8 flex max-w-2xl items-center gap-2.5 rounded-xl bg-[#dfeadb] px-4 py-3 text-[0.92rem] text-[#2f5b2b]">
          <CheckCircle2 size={17} />
          {Number(billed) ? `Billed ${billed} resident${billed === "1" ? "" : "s"} and sent them a link to pay.` : "Everyone was already billed for that month."}
        </div>
      )}

      <div className="grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line">
        <div className="bg-white p-5">
          <p className="text-[0.82rem] text-ink/50">Waiting to be paid</p>
          <p className="tabular mt-1 text-[1.7rem] font-semibold tracking-tight text-ember">{money(due._sum.amountCents ?? 0)}</p>
        </div>
        <div className="bg-white p-5">
          <p className="text-[0.82rem] text-ink/50">Collected in {now.toLocaleDateString("en-US", { month: "long" })}</p>
          <p className="tabular mt-1 text-[1.7rem] font-semibold tracking-tight">{money(collected._sum.amountCents ?? 0)}</p>
        </div>
      </div>

      <form action={billMonth} className="mt-6 flex max-w-3xl flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-line">
        <label className="flex-1">
          <span className="mb-1.5 block text-[0.85rem] font-medium">Bill monthly rent</span>
          <span className="mb-2 block text-[0.82rem] text-ink/50">Creates rent for every current resident and emails them a pay link. Anyone already billed for that month is skipped.</span>
          <input type="month" name="month" defaultValue={nextValue} required className={`${input} !w-48`} />
        </label>
        <SubmitButton className={btnPrimary}>Bill rent</SubmitButton>
      </form>

      {!stripeEnabled() && (
        <p className="mt-4 max-w-3xl text-[0.82rem] text-ink/45">
          Online payments are in test mode. Residents can try the pay page, but no real money moves until Stripe keys are added.
        </p>
      )}

      <nav className="mt-10 flex gap-1 border-b border-line" aria-label="Filter charges">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/payments?tab=${k}`}
            className={`-mb-px border-b-2 px-3 pb-2.5 text-[0.9rem] transition-colors ${tab === k ? "border-ink font-medium text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-5">
        <ChargeTable charges={charges} showResident />
      </div>
    </Page>
  );
}
