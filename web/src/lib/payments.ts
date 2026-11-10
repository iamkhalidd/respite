import type Stripe from "stripe";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { money } from "@/lib/format";

/** Marks the charges in a Checkout Session as paid. Safe to call more than once. */
export async function settleSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return false;
  const ids = String(session.metadata?.chargeIds ?? "").split(",").filter(Boolean);
  if (!ids.length) return false;
  const method = session.payment_method_types?.includes("us_bank_account") && session.payment_method_types.length === 1 ? "ACH" : "STRIPE";
  const { count } = await db.charge.updateMany({
    where: { id: { in: ids }, status: "DUE" },
    data: { status: "PAID", paidAt: new Date(), method, stripeSessionId: session.id },
  });
  if (count > 0) await notifyOwner(ids);
  return true;
}

export async function notifyOwner(chargeIds: string[]) {
  const charges = await db.charge.findMany({ where: { id: { in: chargeIds } }, include: { resident: true } });
  if (!charges.length || !process.env.OWNER_EMAIL) return;
  const total = charges.reduce((s, c) => s + c.amountCents, 0);
  await sendEmail({
    to: process.env.OWNER_EMAIL,
    subject: `${charges[0].resident.name} paid ${money(total)}`,
    text: charges.map((c) => `• ${c.label}: ${money(c.amountCents)}`).join("\n"),
  });
}
