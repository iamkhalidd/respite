import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { api, orNull } from "@/lib/api";
import type { Charge } from "@/lib/types";
import { money } from "@/lib/format";
import { Logo } from "@/components/site-chrome";
import { demoPay } from "../actions";
import { PayButton } from "../pay-button";

export const metadata = { title: "Test payment", robots: { index: false } };

/** Stand-in for Stripe Checkout while the site runs without payment keys. */
export default async function DemoPay({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ c?: string }> }) {
  const { token } = await params;
  const ids = String((await searchParams).c ?? "").split(",").filter(Boolean);
  if (!ids.length) redirect(`/portal/${token}`);
  const r = await orNull(api.get<{ name: string; charges: Charge[]; stripeEnabled: boolean }>(`/portal/${encodeURIComponent(token)}/due?ids=${encodeURIComponent(ids.join(","))}`));
  if (!r) notFound();
  if (r.stripeEnabled || !r.charges.length) redirect(`/portal/${token}`);
  const total = r.charges.reduce((s, c) => s + c.amountCents, 0);

  return (
    <div className="grid min-h-dvh place-items-center bg-oat px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-3xl bg-paper p-7 ring-1 ring-line">
          <div className="flex items-start gap-2.5 rounded-xl bg-porch-glow/60 px-3.5 py-3 text-[0.86rem] leading-snug text-ink">
            <FlaskConical size={15} className="mt-0.5 shrink-0" /> Test mode. This screen stands in for Stripe checkout until payment keys are added.
          </div>
          <ul className="mt-6 space-y-2 text-[0.95rem]">
            {r.charges.map((c) => (
              <li key={c.id} className="flex justify-between"><span>{c.label}</span><span className="mono tabular">{money(c.amountCents)}</span></li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
            <span>Total</span><span className="mono tabular">{money(total)}</span>
          </div>
          <form action={demoPay.bind(null, token, ids)} className="mt-7">
            <PayButton light={false}>Complete test payment</PayButton>
          </form>
          <Link href={`/portal/${token}`} className="mt-2 grid h-11 place-items-center rounded-full text-[0.9rem] text-moss hover:text-ink">Go back</Link>
        </div>
      </div>
    </div>
  );
}
