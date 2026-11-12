import Link from "next/link";
import { admin } from "@/lib/api";
import { money } from "@/lib/format";
import type { Charge } from "@/lib/types";
import { billMonth } from "../../actions";
import { Download } from "lucide-react";
import { Page, Card, CardHead, Notice, Label, btnPrimary, btnQuiet, input, select } from "../ui";
import { SubmitButton } from "../submit";
import { ChargeList } from "./charge-table";

const TABS = [
  ["due", "Unpaid"],
  ["paid", "Paid"],
  ["all", "All"],
] as const;
const EMPTY: Record<string, string> = {
  due: "Everyone is paid up.",
  paid: "No payments yet. They show up here as residents pay.",
  all: "No charges yet. Charges are created when someone moves in or when you bill rent.",
};

export default async function Payments({ searchParams }: { searchParams: Promise<{ tab?: string; billed?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as string) : "due";
  const billed = sp.billed;
  const now = new Date();
  type Totals = { totalCents: number; count: number };
  const [{ charges, due, late, collectedThisMonthCents, activeResidents: residents }, { stripeEnabled }] = await Promise.all([
    admin.get<{
      charges: (Charge & { resident: { id: string; name: string; email: string | null } })[];
      due: Totals;
      late: Totals;
      collectedThisMonthCents: number;
      activeResidents: number;
    }>(`/admin/charges?tab=${tab}`),
    admin.get<{ stripeEnabled: boolean }>("/admin/config"),
  ]);
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const nextValue = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
  const lateSum = late.totalCents;

  const facts: [string, string, string, boolean][] = [
    ["Waiting to be paid", money(due.totalCents), `${due.count} ${due.count === 1 ? "charge" : "charges"}`, false],
    ["Past due", money(lateSum), late.count ? `${late.count} ${late.count === 1 ? "charge" : "charges"}` : "Nothing late", lateSum > 0],
    [`Collected in ${now.toLocaleDateString("en-US", { month: "long", timeZone: "America/New_York" })}`, money(collectedThisMonthCents), "So far this month", false],
  ];

  return (
    <Page wide title="Payments" eyebrow="Rent and deposits">
      {billed !== undefined && (
        <Notice>{Number(billed) ? `Billed ${billed} ${billed === "1" ? "resident" : "residents"}. Anyone with an email on file was sent a link to pay.` : "Everyone was already billed for that month. Nothing was added."}</Notice>
      )}
      {!stripeEnabled && <Notice tone="warn">Online payments are in test mode. Residents can try the pay page, but no real money moves until your Stripe keys are added.</Notice>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <dl className="grid overflow-hidden rounded-2xl bg-paper ring-1 ring-line sm:grid-cols-3">
            {facts.map(([k, v, sub, alert], i) => (
              <div key={k} className={`p-5 sm:p-6 ${i ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
                <dt className="text-[0.84rem] text-moss">{k}</dt>
                <dd className={`mono tabular mt-1.5 text-[1.7rem] font-medium leading-none tracking-[-0.045em] ${alert ? "text-ember" : ""}`}>{v}</dd>
                <dd className="mt-2 text-[0.8rem] text-moss">{sub}</dd>
              </div>
            ))}
          </dl>

          <Card>
            <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
              <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">Charges</h2>
              <nav aria-label="Filter charges" className="flex rounded-full bg-ink/[.06] p-1 text-[0.86rem]">
                {TABS.map(([k, label]) => (
                  <Link
                    key={k}
                    href={`/admin/payments?tab=${k}`}
                    aria-current={tab === k ? "true" : undefined}
                    className={`grid h-9 place-items-center rounded-full px-3.5 transition-colors sm:h-8 ${tab === k ? "bg-paper font-medium shadow-[0_1px_2px_rgb(15_17_16/.15)]" : "text-moss hover:text-ink"}`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="mt-3 border-t border-line">
              <ChargeList charges={charges} showResident empty={EMPTY[tab]} />
            </div>
          </Card>
        </div>

        <Card>
          <CardHead title="Bill monthly rent" hint={`Adds rent for ${residents === 1 ? "your 1 resident" : `all ${residents} residents`} and emails each a link to pay. Anyone already billed for that month is skipped.`} />
          <form action={billMonth} className="grid gap-3 p-5 pt-4 sm:p-6 sm:pt-4">
            <label>
              <Label>Month</Label>
              <input type="month" name="month" defaultValue={nextValue} required className={`${input} mono`} />
            </label>
            <SubmitButton className={`${btnPrimary} w-full disabled:opacity-60`}>Bill rent</SubmitButton>
          </form>
        </Card>

        <Card className="xl:col-start-2">
          <CardHead title="Download a spreadsheet" hint="For your accountant or your own books. Opens in Excel, Numbers or Google Sheets." />
          {/* a plain GET form: the browser downloads the file straight from /admin/export */}
          <form action="/admin/export" method="get" className="grid gap-3 p-5 pt-4 sm:p-6 sm:pt-4">
            <label>
              <Label>What</Label>
              <select name="kind" defaultValue="payments" className={select}>
                <option value="payments">Payments received</option>
                <option value="charges">Everything billed</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>From</Label>
                <input type="date" name="from" defaultValue={`${new Date().getFullYear()}-01-01`} className={input} />
              </label>
              <label>
                <Label>To</Label>
                <input type="date" name="to" className={input} />
              </label>
            </div>
            <button className={`${btnQuiet} w-full`}>
              <Download size={15} /> Download .csv
            </button>
          </form>
        </Card>
      </div>
    </Page>
  );
}
