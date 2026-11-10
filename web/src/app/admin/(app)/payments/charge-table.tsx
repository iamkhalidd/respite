import Link from "next/link";
import type { Charge } from "@prisma/client";
import { money, shortDate } from "@/lib/format";
import { recordPayment, voidCharge } from "../../actions";
import { ChargePill } from "../ui";
import { ChargeActions } from "./charge-actions";

const METHOD: Record<string, string> = { CARD: "Card", ACH: "Bank", STRIPE: "Online", DEMO: "Online (test)", CASH: "Cash", CHECK: "Check", MONEY_ORDER: "Money order", VOUCHER: "Voucher / program" };

type Row = Charge & { resident?: { id: string; name: string } };

export function ChargeTable({ charges, showResident = false }: { charges: Row[]; showResident?: boolean }) {
  if (!charges.length) return <p className="rounded-xl bg-white p-6 text-center text-[0.92rem] text-ink/50 ring-1 ring-line">Nothing here.</p>;
  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
      <table className="w-full min-w-[680px] text-left text-[0.92rem]">
        <thead className="text-[0.8rem] text-ink/45">
          <tr className="border-b border-line">
            {showResident && <th className="px-4 py-2.5 font-medium">Resident</th>}
            <th className="px-4 py-2.5 font-medium">For</th>
            <th className="px-4 py-2.5 font-medium">Due</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            <th className="w-px px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {charges.map((c) => (
            <tr key={c.id} className="transition-colors hover:bg-ink/[.02]">
              {showResident && (
                <td className="px-4 py-3">
                  {c.resident ? <Link className="font-medium hover:underline" href={`/admin/residents/${c.resident.id}`}>{c.resident.name}</Link> : "—"}
                </td>
              )}
              <td className="px-4 py-3">{c.label}</td>
              <td className="tabular px-4 py-3 text-ink/60">{shortDate(c.dueDate)}</td>
              <td className="px-4 py-3">
                <ChargePill status={c.status} dueDate={c.dueDate} />
                {c.status === "PAID" && <span className="ml-2 text-[0.8rem] text-ink/45">{METHOD[c.method ?? ""] ?? c.method}{c.paidAt ? ` · ${shortDate(c.paidAt)}` : ""}</span>}
              </td>
              <td className="tabular px-4 py-3 text-right font-medium">{money(c.amountCents)}</td>
              <td className="px-4 py-2 text-right">
                {c.status === "DUE" && <ChargeActions record={recordPayment.bind(null, c.id)} voidIt={voidCharge.bind(null, c.id)} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
