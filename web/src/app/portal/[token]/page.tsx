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

const METHOD: Record<string, string> = { CARD: "Card", ACH: "Bank", STRIPE: "Online", DEMO: "Online (test)", CASH: "Cash", CHECK: "Check", MONEY_ORDER: "Money order", VOUCHER: "Voucher" };

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

  const late = due.some((c) => c.dueDate.getTime() < Date.now() - 86400000);

  return (
    <div className="min-h-dvh bg-oat text-ink">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-5">
        <Logo />
        <a href={PHONE_HREF} className="press mono inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[0.82rem] text-moss transition-colors hover:bg-ink/[.05] hover:text-ink">
          <Phone size={14} /> {PHONE}
        </a>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-20 sm:px-5">
        <p className="eyebrow mt-4">{r.active ? (r.bed ? `${r.bed.room.name} · ${r.bed.label}` : "Resident") : "Past resident"}</p>
        <h1 className="display-2 mt-3 text-[clamp(2.4rem,9vw,3.2rem)]">Hi, {first}.</h1>

        {justPaid && (
          <div role="status" className="mt-6 flex items-center gap-3 rounded-2xl bg-ink p-4 text-white [animation:portal-in_500ms_var(--ease-out)]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-porch text-ink">
              <Check size={16} strokeWidth={3} />
            </span>
            <p className="text-[0.95rem] leading-snug">Payment received. Thank you. The house has been told.</p>
          </div>
        )}

        <section className="relative mt-7 overflow-hidden rounded-3xl bg-night text-white">
          {total > 0 && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_85%_0%,rgb(240_165_58/0.18),transparent_70%)]" />}
          <div className="relative p-6 sm:p-8">
            <p className="mono text-[0.72rem] uppercase tracking-[0.02em] text-white/50">{total ? (late ? "Past due" : "To pay") : "Balance"}</p>
            <p className={`mono tabular mt-3 text-[clamp(2.8rem,13vw,3.8rem)] font-medium leading-none tracking-[-0.06em] ${total ? "text-porch-glow" : ""}`}>{total ? money(total) : "Paid up"}</p>
            <p className="mt-3 text-[0.92rem] text-white/60">{due[0] ? `Due ${longDate(due[0].dueDate)}` : "Nothing to pay right now. New rent shows up here when it is billed."}</p>
          </div>

          {due.length > 0 && (
            <div className="relative">
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {due.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 px-6 py-3.5 text-[0.95rem] sm:px-8">
                    <span className="min-w-0">
                      {c.label}
                      {c.dueDate.getTime() < Date.now() - 86400000 && <span className="mono ml-2 rounded-full bg-ember px-2 py-0.5 text-[0.66rem] font-medium uppercase text-white">Past due</span>}
                    </span>
                    <span className="mono tabular shrink-0">{money(c.amountCents)}</span>
                  </li>
                ))}
              </ul>
              <form action={pay} className="p-6 sm:p-8">
                <input type="hidden" name="charges" value={due.map((c) => c.id).join(",")} />
                <PayButton>Pay {money(total)}</PayButton>
                <p className="mt-3 text-center text-[0.8rem] text-white/50">{stripeEnabled() ? "Card or bank account. Secured by Stripe." : "Test mode. No real money moves."}</p>
              </form>
            </div>
          )}
        </section>

        <p className="mt-5 px-1 text-[0.9rem] leading-relaxed text-moss">
          Paying with cash, a money order or a program voucher? Hand it to the house manager and it will be marked paid here. Questions? Call{" "}
          <a href={PHONE_HREF} className="whitespace-nowrap font-medium text-ink underline decoration-line-strong underline-offset-4">
            {PHONE}
          </a>
          .
        </p>

        {history.length > 0 && (
          <section className="mt-10">
            <h2 className="eyebrow">Paid</h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
              {history.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[0.95rem] font-medium">{c.label}</span>
                    <span className="block text-[0.82rem] text-moss">
                      {c.paidAt ? shortDate(c.paidAt) : ""}
                      {c.method ? ` · ${METHOD[c.method] ?? c.method}` : ""}
                    </span>
                  </span>
                  <span className="mono tabular flex shrink-0 items-center gap-1.5 text-[0.95rem]">
                    <Check size={13} strokeWidth={3} className="text-moss" /> {money(c.amountCents)}
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
