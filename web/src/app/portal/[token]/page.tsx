import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { longDate, money, shortDate } from "@/lib/format";
import { PHONE, PHONE_HREF } from "@/lib/labels";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { settleSession } from "@/lib/payments";
import { Logo } from "@/components/site-chrome";
import { startCheckout } from "./actions";
import { PayButton } from "./pay-button";

export const metadata: Metadata = { title: "Your rent", robots: { index: false } };

export default async function Portal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string; paid?: string }> }) {
  const { token } = await params;
  const { session_id, paid } = await searchParams;

  let justPaid = Boolean(paid);
  if (session_id && stripeEnabled()) {
    try {
      justPaid = await settleSession(await stripe().checkout.sessions.retrieve(session_id));
    } catch {}
  }

  const r = await db.resident.findUnique({
    where: { portalToken: token },
    include: { bed: { include: { room: true } }, charges: { where: { status: { not: "VOID" } }, orderBy: { dueDate: "desc" } } },
  });
  if (!r) notFound();
  const due = r.charges.filter((c) => c.status === "DUE").sort((a, b) => +a.dueDate - +b.dueDate);
  const history = r.charges.filter((c) => c.status === "PAID");
  const total = due.reduce((s, c) => s + c.amountCents, 0);
  const pay = startCheckout.bind(null, token);
  const first = r.name.split(" ")[0];

  return (
    <div className="min-h-dvh bg-oat">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-6">
        <Logo />
        <a href={PHONE_HREF} className="press inline-flex items-center gap-1.5 text-[0.88rem] text-ink/60 hover:text-ink">
          <Phone size={14} /> {PHONE}
        </a>
      </header>

      <main className="mx-auto max-w-xl px-5 pb-24">
        <p className="eyebrow text-moss">{r.bed ? `${r.bed.room.name} · ${r.bed.label}` : "Resident"}</p>
        <h1 className="display mt-3 text-[2.6rem] leading-[1.02]">Hi, {first}.</h1>

        {justPaid && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-pine p-4 text-paper [animation:portal-in_500ms_var(--ease-out)]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-porch text-ink"><Check size={16} strokeWidth={3} /></span>
            <p className="text-[0.95rem]">Payment received. Thank you — the house has been notified.</p>
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-3xl bg-paper shadow-[0_24px_60px_-30px_rgb(23_33_28/.45)] ring-1 ring-line">
          <div className="p-6 sm:p-8">
            <p className="text-[0.9rem] text-ink/55">{total ? "Amount due" : "You're all paid up"}</p>
            <p className="display tabular mt-1 text-[3.4rem] leading-none tracking-tight">{money(total)}</p>
            {due[0] && <p className="mt-2 text-[0.9rem] text-ink/55">Due {longDate(due[0].dueDate)}</p>}
          </div>

          {due.length > 0 && (
            <>
              <ul className="divide-y divide-line border-y border-line">
                {due.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-6 py-3.5 text-[0.95rem] sm:px-8">
                    <span>
                      {c.label}
                      {c.dueDate.getTime() < Date.now() - 86400000 && <span className="ml-2 rounded-md bg-ember/12 px-1.5 py-0.5 text-[0.75rem] font-medium text-ember">Past due</span>}
                    </span>
                    <span className="tabular">{money(c.amountCents)}</span>
                  </li>
                ))}
              </ul>
              <form action={pay} className="p-6 sm:p-8">
                <input type="hidden" name="charges" value={due.map((c) => c.id).join(",")} />
                <PayButton>Pay {money(total)}</PayButton>
                <p className="mt-3 text-center text-[0.8rem] text-ink/45">
                  {stripeEnabled() ? "Card or bank account (ACH). Secured by Stripe." : "Test mode — no real money moves."}
                </p>
              </form>
            </>
          )}
        </section>

        <p className="mt-6 text-[0.88rem] leading-relaxed text-ink/55">
          Paying with cash, money order, or a program voucher? Hand it to the house manager and it’ll be marked paid here.
        </p>

        {history.length > 0 && (
          <section className="mt-12">
            <h2 className="eyebrow text-ink/45">Paid</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {history.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 text-[0.92rem]">
                  <span>{c.label}</span>
                  <span className="tabular text-ink/55">
                    {money(c.amountCents)} · {c.paidAt ? shortDate(c.paidAt) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <style>{`@keyframes portal-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
