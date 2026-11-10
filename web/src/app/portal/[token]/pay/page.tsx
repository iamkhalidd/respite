import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { stripeEnabled } from "@/lib/stripe";
import { Logo } from "@/components/site-chrome";
import { demoPay } from "../actions";
import { PayButton } from "../pay-button";

export const metadata = { title: "Test payment", robots: { index: false } };

/** Stand-in for Stripe Checkout while the site runs without payment keys. */
export default async function DemoPay({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ c?: string }> }) {
  const { token } = await params;
  if (stripeEnabled()) redirect(`/portal/${token}`);
  const ids = String((await searchParams).c ?? "").split(",").filter(Boolean);
  const r = await db.resident.findUnique({ where: { portalToken: token }, include: { charges: { where: { id: { in: ids }, status: "DUE" } } } });
  if (!r) notFound();
  if (!r.charges.length) redirect(`/portal/${token}`);
  const total = r.charges.reduce((s, c) => s + c.amountCents, 0);

  return (
    <div className="grid min-h-dvh place-items-center bg-oat px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-3xl bg-paper p-7 shadow-[0_24px_60px_-30px_rgb(23_33_28/.45)] ring-1 ring-line">
          <div className="flex items-center gap-2 rounded-xl bg-porch-glow/60 px-3 py-2.5 text-[0.85rem] text-[#5a3d08]">
            <FlaskConical size={15} /> Test mode. This screen stands in for Stripe checkout until payment keys are added.
          </div>
          <ul className="mt-6 space-y-2 text-[0.95rem]">
            {r.charges.map((c) => (
              <li key={c.id} className="flex justify-between"><span>{c.label}</span><span className="tabular">{money(c.amountCents)}</span></li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
            <span>Total</span><span className="tabular">{money(total)}</span>
          </div>
          <form action={demoPay.bind(null, token, ids)} className="mt-7">
            <PayButton>Complete test payment</PayButton>
          </form>
          <Link href={`/portal/${token}`} className="mt-4 block text-center text-[0.88rem] text-ink/55 hover:text-ink">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
