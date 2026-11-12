import Link from "next/link";
import type { Charge } from "@prisma/client";
import { money, shortDate } from "@/lib/format";
import { recordPayment, sendPayLink, voidCharge } from "../../actions";
import { ChargePill, Empty } from "../ui";
import { ChargeActions } from "./charge-actions";

export const METHOD: Record<string, string> = { CARD: "Card", ACH: "Bank", STRIPE: "Online", DEMO: "Online (test)", CASH: "Cash", CHECK: "Check", MONEY_ORDER: "Money order", VOUCHER: "Voucher / program" };

type Row = Charge & { resident?: { id: string; name: string; email?: string | null } };

/** Charges as rows that fit a phone: who and what on the left, amount and state on the right. */
export function ChargeList({ charges, showResident = false, canRemind = false, empty = "Nothing here." }: { charges: Row[]; showResident?: boolean; canRemind?: boolean; empty?: string }) {
  if (!charges.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-line">
      {charges.map((c) => {
        const paid = c.status === "PAID";
        const meta = paid ? `Paid ${c.paidAt ? shortDate(c.paidAt) : ""}${c.method ? ` · ${METHOD[c.method] ?? c.method}` : ""}` : `Due ${shortDate(c.dueDate)}`;
        const remind = canRemind || c.resident?.email;
        return (
          <li key={c.id} className="flex items-center gap-2 py-3 pl-5 pr-2 sm:gap-4 sm:pl-6 sm:pr-3">
            <div className="min-w-0 flex-1">
              {showResident && c.resident ? (
                <>
                  <Link href={`/admin/residents/${c.resident.id}`} className="block truncate font-medium hover:underline">
                    {c.resident.name}
                  </Link>
                  <p className="truncate text-[0.85rem] text-moss">
                    {c.label} · {meta}
                  </p>
                </>
              ) : (
                <>
                  <p className={`truncate font-medium ${c.status === "VOID" ? "text-moss line-through" : ""}`}>{c.label}</p>
                  <p className="truncate text-[0.85rem] text-moss">{meta}</p>
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row-reverse sm:items-center sm:gap-4">
              <span className={`mono tabular text-[0.98rem] font-medium tracking-[-0.02em] ${c.status === "VOID" ? "text-moss line-through" : ""}`}>{money(c.amountCents)}</span>
              <ChargePill status={c.status} dueDate={c.dueDate} />
            </div>
            {c.status === "DUE" ? (
              <ChargeActions record={recordPayment.bind(null, c.id)} voidIt={voidCharge.bind(null, c.id)} remind={remind ? sendPayLink.bind(null, c.residentId) : undefined} />
            ) : (
              <span className="w-10 shrink-0" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}
