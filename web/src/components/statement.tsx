import type { Statement } from "@/lib/types";
import { longDate, money } from "@/lib/format";
import { PrintButton } from "./print-button";

const METHOD: Record<string, string> = {
  CARD: "Card", ACH: "Bank transfer", STRIPE: "Online", DEMO: "Test payment", CASH: "Cash", CHECK: "Check", MONEY_ORDER: "Money order", VOUCHER: "Voucher",
};
const STATUS: Record<string, string> = { PAID: "Paid", DUE: "Due" };

/** A rent statement on one sheet of paper: for the resident's records, a benefits office, or the house's books. */
export function StatementSheet({ s, back }: { s: Statement; back: React.ReactNode }) {
  const r = s.resident;
  const d = s.deposit;
  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-16 pt-6 sm:px-8 md:pt-10 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton />
      </div>
      <article className="rounded-2xl bg-paper p-6 ring-1 ring-line sm:p-10 print:rounded-none print:p-0 print:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="text-[1.15rem] font-semibold tracking-[-0.03em]">{s.house.name}</p>
            {s.house.address && <p className="mt-1 text-[0.88rem] text-moss">{s.house.address}</p>}
            {s.house.phone && <p className="mono tabular text-[0.84rem] text-moss">{s.house.phone}</p>}
          </div>
          <div className="text-right">
            <p className="mono text-[0.7rem] uppercase tracking-[0.02em] text-moss">Rent statement</p>
            <p className="mt-1 text-[0.88rem]">{longDate(s.generatedAt)}</p>
          </div>
        </header>

        <dl className="grid gap-x-8 gap-y-3 border-b border-line py-6 text-[0.92rem] sm:grid-cols-2">
          {[
            ["Resident", r.name],
            ["Bed", r.bed ? `${r.bed}${r.room ? `, ${r.room}` : ""}` : "None"],
            ["Moved in", longDate(r.moveInDate)],
            [r.moveOutDate ? "Moved out" : "Monthly rent", r.moveOutDate ? longDate(r.moveOutDate) : money(r.rentCents)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 sm:block">
              <dt className="text-moss">{k}</dt>
              <dd className="font-medium sm:mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>

        {s.charges.length ? (
          <table className="mt-4 w-full text-left text-[0.88rem]">
            <thead>
              <tr className="mono text-[0.68rem] uppercase text-moss">
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 font-medium">For</th>
                <th className="hidden py-2 pr-3 font-medium sm:table-cell print:table-cell">Paid</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-y border-line">
              {s.charges.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="tabular whitespace-nowrap py-2.5 pr-3">{longDate(c.dueDate)}</td>
                  <td className="py-2.5 pr-3">{c.label}</td>
                  <td className="hidden py-2.5 pr-3 text-moss sm:table-cell print:table-cell">
                    {c.paidAt ? `${longDate(c.paidAt)}${c.method ? `, ${METHOD[c.method] ?? c.method}` : ""}` : ""}
                  </td>
                  <td className="py-2.5 pr-3">{STATUS[c.status] ?? c.status}</td>
                  <td className="mono tabular whitespace-nowrap py-2.5 text-right">{money(c.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-[0.92rem] text-moss">No charges yet.</p>
        )}

        <dl className="mono tabular ml-auto mt-5 w-full max-w-xs space-y-1.5 text-[0.9rem]">
          <div className="flex justify-between">
            <dt className="text-moss">Billed</dt>
            <dd>{money(s.totals.billedCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-moss">Paid</dt>
            <dd>{money(s.totals.paidCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 text-[1rem] font-medium">
            <dt>Still owed</dt>
            <dd>{money(s.totals.owedCents)}</dd>
          </div>
        </dl>

        {d.paidCents > 0 && (
          <section className="mt-8 border-t border-line pt-5 text-[0.9rem]">
            <h2 className="font-semibold">Security deposit</h2>
            <p className="mt-1.5 text-moss">
              {money(d.paidCents)} paid.
              {d.returnedCents != null
                ? ` ${money(d.returnedCents)} returned${d.paidCents - d.returnedCents ? `, ${money(d.paidCents - d.returnedCents)} kept` : ""}${d.settledAt ? ` on ${longDate(d.settledAt)}` : ""}.`
                : r.active
                  ? " Held while they live at the house."
                  : " Not settled yet."}
            </p>
            {d.note && <p className="mt-1.5 whitespace-pre-line">{d.note}</p>}
          </section>
        )}

        <p className="mt-10 text-[0.78rem] text-moss">
          Questions about this statement? Call {s.house.phone || "the house"}.
        </p>
      </article>
    </div>
  );
}
