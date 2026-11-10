"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/email";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { notifyOwner } from "@/lib/payments";

async function dueCharges(token: string, ids: string[]) {
  const resident = await db.resident.findUnique({ where: { portalToken: token } });
  if (!resident) throw new Error("This pay link isn't valid.");
  const charges = await db.charge.findMany({ where: { residentId: resident.id, status: "DUE", ...(ids.length ? { id: { in: ids } } : {}) } });
  return { resident, charges };
}

/** Sends the resident to Stripe Checkout, or to the test-mode pay screen when Stripe isn't set up. */
export async function startCheckout(token: string, form: FormData) {
  const ids = String(form.get("charges") ?? "").split(",").filter(Boolean);
  const { resident, charges } = await dueCharges(token, ids);
  if (!charges.length) redirect(`/portal/${token}`);

  if (!stripeEnabled()) redirect(`/portal/${token}/pay?c=${charges.map((c) => c.id).join(",")}`);

  const base = siteUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "us_bank_account"],
    customer_email: resident.email ?? undefined,
    line_items: charges.map((c) => ({ quantity: 1, price_data: { currency: "usd", unit_amount: c.amountCents, product_data: { name: c.label } } })),
    metadata: { chargeIds: charges.map((c) => c.id).join(","), residentId: resident.id },
    payment_intent_data: { description: `Respite for the Weary — ${resident.name}` },
    success_url: `${base}/portal/${token}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/portal/${token}`,
  });
  redirect(session.url!);
}

/** Test mode only: records the payment without moving money. */
export async function demoPay(token: string, ids: string[]) {
  if (stripeEnabled()) throw new Error("Test payments are off.");
  const { charges } = await dueCharges(token, ids);
  await db.charge.updateMany({ where: { id: { in: charges.map((c) => c.id) } }, data: { status: "PAID", paidAt: new Date(), method: "DEMO" } });
  await notifyOwner(charges.map((c) => c.id));
  revalidatePath("/", "layout");
  redirect(`/portal/${token}?paid=1`);
}
